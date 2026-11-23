const vscode = require('vscode');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function activate(context) {
    let lastSanitizedClipboard = null;

    function detectUsername() {
        try {
            if (process.env.USERPROFILE) {
                return path.win32.basename(process.env.USERPROFILE);
            }

            return os.userInfo().username;
        } catch (error) {
            console.error('Path Sanitizer: Username detection failed.', error);
            return '';
        }
    }

    function getConfig() {
        const config = vscode.workspace.getConfiguration('pathSanitizer');
        const manualUsername = config.get('realUsername', '').trim();

        return {
            realUser: manualUsername || detectUsername(),
            aliasUser: config.get('aliasUsername', 'admin').trim()
        };
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function buildLeadingPathRegex(username) {
        const escaped = escapeRegExp(username);

        return new RegExp(
            `^(\\s*)([a-z]:[\\\\/]+Users[\\\\/]+)${escaped}(?=$|[\\\\/])`,
            'i'
        );
    }

    async function sanitizeClipboardCopy() {
        try {
            const text = await vscode.env.clipboard.readText();

            lastSanitizedClipboard = null;

            if (!text) return;

            const { realUser, aliasUser } = getConfig();

            if (!realUser || !aliasUser) return;

            const regex = buildLeadingPathRegex(realUser);

            if (!regex.test(text)) return;

            const sanitizedText = text.replace(
                regex,
                (_, whitespace, prefix) =>
                    `${whitespace}${prefix}${aliasUser}`
            );

            if (sanitizedText !== text) {
                await vscode.env.clipboard.writeText(sanitizedText);

                lastSanitizedClipboard = sanitizedText;

                console.log('Path Sanitizer: Path sanitized.');
            }
        } catch (error) {
            console.error('Path Sanitizer: Copy failed.', error);
        }
    }

    async function runRestoredPaste(pasteCommand) {
        try {
            const text = await vscode.env.clipboard.readText();

            if (!text || text !== lastSanitizedClipboard) {
                await vscode.commands.executeCommand(pasteCommand);
                return;
            }

            const { realUser, aliasUser } = getConfig();

            if (!realUser || !aliasUser) {
                await vscode.commands.executeCommand(pasteCommand);
                return;
            }

            const regex = buildLeadingPathRegex(aliasUser);

            if (!regex.test(text)) {
                await vscode.commands.executeCommand(pasteCommand);
                return;
            }

            const restoredText = text.replace(
                regex,
                (_, whitespace, prefix) =>
                    `${whitespace}${prefix}${realUser}`
            );

            try {
                await vscode.env.clipboard.writeText(restoredText);
                await vscode.commands.executeCommand(pasteCommand);
            } finally {
                await vscode.env.clipboard.writeText(text);
            }
        } catch (error) {
            console.error('Path Sanitizer: Paste failed.', error);
        }
    }

    function createClipboardHelper() {
        const helperPath = path.join(
            context.extensionPath,
            'windows-clipboard-helper',
            'ClipboardListenerPrototype',
            'publish',
            'win-x64',
            'ClipboardListenerPrototype.exe'
        );

        if (!fs.existsSync(helperPath)) {
            throw new Error(
                `Clipboard helper not found: ${helperPath}`
            );
        }

        const { realUser, aliasUser } = getConfig();

        if (!realUser || !aliasUser) {
            throw new Error('Username configuration is incomplete.');
        }

        const child = spawn(
            helperPath,
            [
                '--real-username',
                realUser,
                '--alias-username',
                aliasUser
            ],
            {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'ignore']
            }
        );

        let buffer = '';
        let messages = [];
        let waiters = [];
        let closedError = null;

        function deliverMessage(message) {
            if (waiters.length > 0) {
                waiters.shift()(message);
            } else {
                messages.push(message);
            }
        }

        child.stdout.on('data', data => {
            buffer += data.toString();

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop();

            for (const line of lines) {
                if (line.trim()) {
                    deliverMessage(line.trim());
                }
            }
        });

        child.on('error', error => {
            closedError = error;

            while (waiters.length > 0) {
                waiters.shift()(null);
            }
        });

        child.on('close', code => {
            if (buffer.trim()) {
                deliverMessage(buffer.trim());
                buffer = '';
            }

            if (code !== 0) {
                closedError = new Error(
                    `Clipboard helper exited with code ${code}.`
                );
            }

            while (waiters.length > 0) {
                waiters.shift()(null);
            }
        });

        function nextMessage(timeoutMs) {
            if (messages.length > 0) {
                return Promise.resolve(messages.shift());
            }

            if (closedError) {
                return Promise.reject(closedError);
            }

            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    const index = waiters.indexOf(onMessage);

                    if (index !== -1) {
                        waiters.splice(index, 1);
                    }

                    reject(new Error('Clipboard helper timed out.'));
                }, timeoutMs);

                function onMessage(message) {
                    clearTimeout(timer);

                    if (message === null) {
                        reject(
                            closedError ||
                            new Error('Clipboard helper closed unexpectedly.')
                        );
                    } else {
                        resolve(message);
                    }
                }

                waiters.push(onMessage);
            });
        }

        return {
            child,
            nextMessage
        };
    }

    // EDITOR COPY
    const editorCopy = vscode.commands.registerCommand(
        'path-sanitizer.editorCopy',
        async () => {
            await vscode.commands.executeCommand(
                'editor.action.clipboardCopyAction'
            );

            await sanitizeClipboardCopy();
        }
    );

    // EDITOR PASTE
    const editorPaste = vscode.commands.registerCommand(
        'path-sanitizer.editorPaste',
        async () => {
            await runRestoredPaste(
                'editor.action.clipboardPasteAction'
            );
        }
    );

    // TERMINAL COPY
    const terminalCopy = vscode.commands.registerCommand(
        'path-sanitizer.terminalCopy',
        async () => {
            let helper;

            try {
                helper = createClipboardHelper();

                const readyMessage = await helper.nextMessage(5000);

                if (readyMessage !== 'READY') {
                    throw new Error(
                        `Clipboard helper did not become ready: ${readyMessage}`
                    );
                }

                await vscode.commands.executeCommand(
                    'workbench.action.terminal.copySelection'
                );

                const result = await helper.nextMessage(15000);

                if (result === 'SANITIZED') {
                    lastSanitizedClipboard =
                        await vscode.env.clipboard.readText();

                    console.log('Path Sanitizer: Terminal path sanitized.');
                } else if (result === 'NO_MATCH') {
                    lastSanitizedClipboard = null;
                    console.log('Path Sanitizer: No matching path found.');
                } else {
                    throw new Error(
                        `Clipboard helper returned: ${result}`
                    );
                }
            } catch (error) {
                if (helper) {
                    helper.child.kill();
                }

                lastSanitizedClipboard = null;

                console.error(
                    'Path Sanitizer: Terminal copy failed.',
                    error
                );

                vscode.window.showErrorMessage(
                    'Path Sanitizer: Terminal copy could not be completed.'
                );
            }
        }
    );

    // TERMINAL PASTE
    const terminalPaste = vscode.commands.registerCommand(
        'path-sanitizer.terminalPaste',
        async () => {
            await runRestoredPaste(
                'workbench.action.terminal.paste'
            );
        }
    );

    context.subscriptions.push(
        editorCopy,
        editorPaste,
        terminalCopy,
        terminalPaste
    );

    console.log('Path Sanitizer activated.');
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
