# Security & Privacy Tools Suite

A collection of practical tools focused on improving security, privacy, and protecting sensitive information during everyday digital activities.

This repository brings together independent tools under one project, with each tool maintained in its own directory.

## Tools

### 1. Security Path Sanitizer

**Status:** Version 1.0.0 – Released

A Windows-focused Visual Studio Code extension that sanitizes personal Windows user-profile paths when copying text from the editor or integrated terminal.

**Example:**

```text
C:\Users\example\Desktop\project
```

Becomes:

```text
C:\Users\admin\Desktop\project
```

**Key features:**
- Sanitizes matching Windows user-profile paths.
- Supports copying from the VS Code editor and integrated terminal.
- Supports a configurable replacement username.
- Provides dedicated copy and paste shortcuts.
- Uses a locally bundled Windows helper executable.

**Supported environment:** Windows 10/11, x64, VS Code desktop.

**Documentation:** [Security Path Sanitizer README](vscode-path-sanitizer/README.md)

**License:** MIT

## Repository Structure

```text
security-sanitizer-suite/
│
├── README.md
├── LICENSE
├── .gitignore
│
└── vscode-path-sanitizer/
    ├── README.md
    ├── LICENSE
    ├── package.json
    ├── extension.js
    └── windows-clipboard-helper/
```

Additional tools may be added as separate directories as the project grows.

## Project Goals

- Build practical security and privacy utilities.
- Address everyday information-exposure risks.
- Prefer simple, understandable and focused solutions.
- Keep tools independently maintainable.
- Document functionality, supported environments and limitations clearly.

## License

This repository is licensed under the MIT License.

Copyright (c) 2026 Antara

See the [LICENSE](LICENSE) file for the full license text.

Developed by **Antara**.