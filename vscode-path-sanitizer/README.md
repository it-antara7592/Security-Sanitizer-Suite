# Security Path Sanitizer

**Protect your Windows username when sharing paths copied from Visual Studio Code.**

Security Path Sanitizer is a Windows-only Visual Studio Code extension that replaces your actual Windows profile username with a configurable alias when copying paths from the editor or integrated terminal.

For example:

```text
C:\Users\example\Desktop\project
```

Becomes:

```text
C:\Users\admin\Desktop\project
```

This helps reduce accidental exposure of your Windows profile username when sharing terminal output, code snippets, or file paths.

## Features

- **Terminal path sanitization:** Sanitizes matching Windows user-profile paths when copying selected terminal text.
- **Editor path sanitization:** Sanitizes matching paths when copying selected editor text.
- **Controlled paste restoration:** Restores the original clipboard text when pasting through the extension's dedicated VS Code paste commands, where applicable.
- **Configurable alias:** Choose the replacement username instead of using the default `admin`.
- **Automatic username detection:** Detects the current Windows profile folder name when no real username is configured.
- **No background monitoring:** The helper runs only when the extension's terminal-copy command is invoked.

## Supported Environment

| Requirement | Support |
|---|---|
| Operating system | Windows 10 / Windows 11 |
| Architecture | x64 (AMD64) |
| Editor | Visual Studio Code desktop |
| Terminal | VS Code integrated terminal |
| Helper runtime | Bundled self-contained executable |

This release is intended for Windows x64 desktop environments. macOS, Linux, ARM-based Windows devices, and VS Code for the web are not supported.

## Installation

1. Obtain the `security-path-sanitizer-1.0.0.vsix` package.
2. Open Visual Studio Code.
3. Open the Extensions view.
4. Select the three-dot menu in the Extensions view.
5. Choose **Install from VSIX...**.
6. Select the downloaded `.vsix` file.
7. Reload VS Code if prompted.

## Usage

The extension provides dedicated keyboard shortcuts so that your normal `Ctrl+C` and `Ctrl+V` shortcuts remain unchanged.

| Action | Keyboard shortcut |
|---|---|
| Copy from editor | `Ctrl + Shift + Alt + C` |
| Paste into editor | `Ctrl + Shift + Alt + V` |
| Copy from terminal | `Ctrl + Shift + Alt + C` |
| Paste into terminal | `Ctrl + Shift + Alt + V` |

### Copying from the terminal

1. Select the terminal text you want to copy.
2. Press `Ctrl + Shift + Alt + C`.
3. The extension processes the clipboard text and replaces matching Windows profile paths.
4. Paste the sanitized text wherever you need it.

### Copying from the editor

1. Select the text in the editor.
2. Press `Ctrl + Shift + Alt + C`.
3. The extension sanitizes a matching path at the beginning of the selected text.
4. Paste the sanitized text wherever you need it.

### Pasting into VS Code

Use the extension's dedicated paste shortcut to paste into the editor or terminal. Where the extension has retained the corresponding original clipboard text, it restores that text for the VS Code paste operation and then returns the sanitized version to the clipboard.

## Configuration

You can customize the username replacement through VS Code settings.

Open **Settings** and search for `Security Path Sanitizer`.

| Setting | Description | Default |
|---|---|---|
| `pathSanitizer.realUsername` | Your actual Windows profile folder name. Leave empty to detect it automatically. | Empty |
| `pathSanitizer.aliasUsername` | The username that replaces your actual profile folder name. | `admin` |

### Example

If your Windows profile folder is:

```text
C:\Users\Example
```

And your alias is configured as:

```text
private
```

The sanitized path becomes:

```text
C:\Users\private\Desktop
```

You can change the alias whenever you want through VS Code settings.

## Important Notes and Limitations

- Sanitization is performed only when using the extension's dedicated copy commands. Normal `Ctrl+C` and `Ctrl+V` behaviour is not modified.
- The extension does not continuously monitor your system clipboard or run a permanent background service.
- Only matching paths under a Windows `Users` directory are targeted. Unrelated paths and ordinary mentions of your username are not intentionally replaced.
- The extension does not guarantee that every personal detail is removed from copied content. Review text before sharing it.
- Clipboard content may be changed during sanitization. Applications that depend on non-text clipboard formats may not retain those formats through this process.
- The extension is designed for the local Windows VS Code desktop environment.

## License

This project is licensed under the MIT License.

Copyright (c) 2026 Antara

See the [LICENSE](LICENSE) file for the full license text.

Developed by **Antara**.
