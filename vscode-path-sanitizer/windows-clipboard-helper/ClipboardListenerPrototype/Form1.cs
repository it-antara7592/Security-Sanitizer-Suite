
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace ClipboardListenerPrototype;

public partial class Form1 : Form
{
    private const int WM_CLIPBOARDUPDATE = 0x031D;
    private const int ListeningDurationMs = 10_000;
    private const string DefaultAliasUsername = "admin";

    private readonly System.Windows.Forms.Timer _timeoutTimer = new();

    private readonly string _realUsername;
    private readonly string _aliasUsername;

    private uint _baselineClipboardSequence;

    private bool _listenerRegistered;
    private bool _hasProcessedUpdate;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool AddClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RemoveClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll")]
    private static extern uint GetClipboardSequenceNumber();

    public Form1()
    {
        InitializeComponent();

        // Keep the Windows Forms message loop but hide the window.
        ShowInTaskbar = false;
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Minimized;
        Opacity = 0;
        Size = new Size(1, 1);
        StartPosition = FormStartPosition.Manual;
        Location = new Point(-32000, -32000);

        // Read configuration supplied by the VS Code extension.
        string? configuredUsername =
            GetCommandLineArgument("--real-username");

        string? configuredAlias =
            GetCommandLineArgument("--alias-username");

        _realUsername = !string.IsNullOrWhiteSpace(configuredUsername)
            ? configuredUsername
            : DetectUsername();

        _aliasUsername = !string.IsNullOrWhiteSpace(configuredAlias)
            ? configuredAlias
            : DefaultAliasUsername;

        _timeoutTimer.Interval = ListeningDurationMs;
        _timeoutTimer.Tick += (_, _) =>
        {
            Complete("TIMEOUT");
        };
    }

    private static string? GetCommandLineArgument(string argumentName)
    {
        string[] arguments = Environment.GetCommandLineArgs();

        for (int i = 1; i < arguments.Length - 1; i++)
        {
            if (string.Equals(
                arguments[i],
                argumentName,
                StringComparison.OrdinalIgnoreCase))
            {
                return arguments[i + 1];
            }
        }

        return null;
    }

    private static string DetectUsername()
    {
        string? profilePath =
            Environment.GetEnvironmentVariable("USERPROFILE");

        if (!string.IsNullOrWhiteSpace(profilePath))
        {
            string username = Path.GetFileName(
                profilePath.TrimEnd(
                    Path.DirectorySeparatorChar,
                    Path.AltDirectorySeparatorChar));

            if (!string.IsNullOrWhiteSpace(username))
                return username;
        }

        return Environment.UserName;
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);

        // Hide the form immediately. It remains available as a
        // message receiver for Windows clipboard notifications.
        Hide();

        _listenerRegistered = AddClipboardFormatListener(Handle);

        if (!_listenerRegistered)
        {
            Complete(
                $"ERROR_LISTENER_{Marshal.GetLastWin32Error()}");

            return;
        }

        // Establish the clipboard baseline before reporting readiness.
        _baselineClipboardSequence = GetClipboardSequenceNumber();

        _timeoutTimer.Start();

        Report("READY");
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WM_CLIPBOARDUPDATE && !_hasProcessedUpdate)
        {
            uint currentSequence = GetClipboardSequenceNumber();

            if (currentSequence != _baselineClipboardSequence)
            {
                _hasProcessedUpdate = true;
                ProcessClipboardUpdate();
            }
        }

        base.WndProc(ref m);
    }

    private void ProcessClipboardUpdate()
    {
        string originalText;

        try
        {
            originalText = ReadClipboardWithRetry();

            if (string.IsNullOrEmpty(originalText))
            {
                Complete("NO_MATCH");
                return;
            }
        }
        catch (ExternalException)
        {
            Complete("ERROR_CLIPBOARD_READ");
            return;
        }
        catch
        {
            Complete("ERROR_UNEXPECTED");
            return;
        }

        string sanitizedText = SanitizePath(originalText);

        if (sanitizedText == originalText)
        {
            Complete("NO_MATCH");
            return;
        }

        // Stop listening before writing our own clipboard update.
        StopListening();

        try
        {
            Clipboard.SetText(
                sanitizedText,
                TextDataFormat.UnicodeText);

            Complete("SANITIZED");
        }
        catch (ExternalException)
        {
            Complete("ERROR_CLIPBOARD_WRITE");
        }
        catch
        {
            Complete("ERROR_UNEXPECTED");
        }
    }

    private static string ReadClipboardWithRetry()
    {
        const int maxAttempts = 5;
        const int delayMs = 50;

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                return Clipboard.GetText(
                    TextDataFormat.UnicodeText);
            }
            catch (ExternalException) when (attempt < maxAttempts)
            {
                Thread.Sleep(delayMs);
            }
        }

        return Clipboard.GetText(TextDataFormat.UnicodeText);
    }

    private string SanitizePath(string text)
    {
        if (string.IsNullOrWhiteSpace(_realUsername))
            return text;

        string escapedUsername = Regex.Escape(_realUsername);

        string pattern =
            $@"(?<![A-Za-z0-9_])([a-z]:[\\/]+Users[\\/]+){escapedUsername}(?![A-Za-z0-9_.-])";

        return Regex.Replace(
            text,
            pattern,
            match => match.Groups[1].Value + _aliasUsername,
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    private void StopListening()
    {
        _timeoutTimer.Stop();

        if (_listenerRegistered && !IsDisposed)
        {
            RemoveClipboardFormatListener(Handle);
            _listenerRegistered = false;
        }
    }

    private static void Report(string result)
    {
        Console.WriteLine(result);
        Console.Out.Flush();
    }

    private void Complete(string result)
    {
        StopListening();

        Report(result);

        Close();
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        StopListening();
        _timeoutTimer.Dispose();

        base.OnFormClosed(e);
    }
}
