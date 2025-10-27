# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SSH Key Manager is a production-ready Windows desktop application (.exe) built with Electron + React + TypeScript for managing SSH keys, configurations, and connections. This is a personal-use tool providing a modern GUI for viewing, creating, editing, testing, and backing up SSH keys and their associated host configurations.

## Technology Stack

- **Framework**: Electron 28+ with React 18+
- **Language**: TypeScript (strict mode)
- **UI Library**: shadcn/ui or Material-UI (MUI)
- **SSH Operations**: node-ssh or ssh2 libraries
- **State Management**: React Context API or Zustand
- **Persistent Storage**: electron-store for user preferences
- **Build Tool**: electron-builder (Windows x64 target)
- **Dev Tools**: Webpack or Vite for bundling

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production (Windows .exe)
npm run build

# Build portable version
npm run build:portable

# Run TypeScript type checking
npm run type-check

# Run linter
npm run lint

# Run tests
npm test
```

## Project Architecture

### Directory Structure

```
ssh-key-mgr/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── index.ts       # App entry point, window management
│   │   ├── sshManager.ts  # SSH key generation, fingerprints
│   │   ├── configParser.ts # Parse/write SSH config files
│   │   ├── fileSystem.ts  # File operations for .ssh directory
│   │   ├── permissions.ts # Windows permission handling (icacls)
│   │   ├── backup.ts      # Backup/restore operations
│   │   └── ipc-handlers.ts # IPC communication handlers
│   ├── renderer/          # React UI (Browser)
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main views (Dashboard, Keys, Config, etc.)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── context/       # React context for state
│   │   ├── utils/         # Helper functions
│   │   ├── types/         # TypeScript type definitions
│   │   ├── App.tsx        # Root React component
│   │   └── index.tsx      # React entry point
│   ├── shared/            # Code shared between main and renderer
│   │   ├── types.ts       # Shared TypeScript interfaces
│   │   └── constants.ts   # App-wide constants
│   └── preload/           # Preload scripts for secure IPC
│       └── index.ts       # Expose safe APIs to renderer
├── public/                # Static assets (icons, etc.)
├── dist/                  # Build output (gitignored)
├── package.json
├── tsconfig.json          # TypeScript configuration
├── electron-builder.yml   # Build configuration
└── webpack.config.js      # Webpack bundling config
```

### Key Architectural Patterns

#### Main Process (Node.js)
- **Responsibility**: File system access, SSH operations, system commands
- **SSH Key Operations**: Uses child_process to execute `ssh-keygen` commands
- **Permission Management**: Uses Windows `icacls` commands via child_process
- **Config Parsing**: Reads/writes `%USERPROFILE%\.ssh\config` file
- **IPC**: Exposes methods via `ipcMain.handle()` for renderer to call

#### Renderer Process (React)
- **Responsibility**: UI rendering, user interactions, state management
- **Communication**: Calls main process via preload-exposed IPC methods
- **State**: Manages UI state, form validation, theme preferences
- **Security**: Cannot directly access Node.js APIs (uses IPC bridge)

#### Preload Scripts
- **Responsibility**: Secure bridge between renderer and main process
- **Pattern**: Exposes whitelisted APIs via `contextBridge.exposeInMainWorld()`
- **Example**:
  ```typescript
  // preload/index.ts
  contextBridge.exposeInMainWorld('sshAPI', {
    generateKey: (options) => ipcRenderer.invoke('ssh:generateKey', options),
    listKeys: () => ipcRenderer.invoke('ssh:listKeys'),
    parseConfig: () => ipcRenderer.invoke('ssh:parseConfig')
  })
  ```

### Core Feature Modules

#### 1. Prerequisites Check System (`main/prerequisitesCheck.ts`)
- Checks OpenSSH client availability (`where ssh`)
- Verifies .ssh directory existence and permissions
- Validates SSH config file syntax
- Returns structured status object for UI display

#### 2. SSH Key Management (`main/sshManager.ts`)
- **Key Generation**: Executes `ssh-keygen` with various options (ED25519, RSA, ECDSA)
- **Key Scanning**: Reads .ssh directory, identifies key files by pattern
- **Fingerprint Extraction**: Runs `ssh-keygen -lf <keyfile>` to get fingerprint
- **Key Type Detection**: Reads key file headers to determine type
- **Passphrase Detection**: Checks if private key is encrypted

#### 3. SSH Config Management (`main/configParser.ts`)
- **Parser**: Reads and parses SSH config file into structured objects
- **Writer**: Serializes config objects back to proper SSH config format
- **Validator**: Checks config syntax before writing
- **Host Entry CRUD**: Add, update, delete individual host configurations

#### 4. Connection Testing (`main/connectionTester.ts`)
- Executes: `ssh -T -o ConnectTimeout=10 -o StrictHostKeyChecking=no [host]`
- Captures stdout/stderr for detailed error messages
- Returns connection status, auth method, timing, error details
- Parses common SSH errors with user-friendly explanations

#### 5. Permission Management (`main/permissions.ts`)
- **Windows Commands**:
  ```powershell
  # .ssh directory (700 equivalent)
  icacls "%USERPROFILE%\.ssh" /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F"

  # Private keys (600 equivalent)
  icacls "keyfile" /inheritance:r /grant:r "%USERNAME%:R"

  # Public keys (644 equivalent)
  icacls "keyfile.pub" /inheritance:r /grant:r "%USERNAME%:R" /grant:r "Everyone:R"
  ```
- Scans all files and reports permission status
- Provides bulk "Fix All" functionality

#### 6. Backup/Restore System (`main/backup.ts`)
- **Backup Format**: `.tar.gz` or `.zip` with metadata JSON
- **Metadata**: Timestamp, username, computer name, file list, app version
- **Includes**: All .ssh directory contents (keys, config, known_hosts)
- **Restore**: Validates backup, shows diff, offers overwrite/merge options
- **Auto-backup**: Creates snapshot before restore operations

### UI Component Organization

#### Pages (Main Views)
- **Dashboard**: System status checks, quick stats, recent activity
- **SSH Keys**: List, create, import, export, view key details
- **Configurations**: Host config list, add/edit/delete, connection testing
- **Backups**: Create backup, restore from backup, backup history
- **Settings**: Theme, behavior preferences, advanced options
- **Logs**: Filterable application log viewer

#### Reusable Components
- **KeyCard**: Display individual SSH key with metadata
- **HostConfigCard**: Display SSH host configuration entry
- **ConnectionTestDialog**: Modal for testing SSH connections
- **PermissionStatusPanel**: Shows permission status with fix buttons
- **BackupDialog**: Backup creation/restore interface
- **ErrorBoundary**: Catches React errors and displays fallback UI

### IPC Communication Pattern

```typescript
// Main process handler
ipcMain.handle('ssh:generateKey', async (event, options: KeyGenOptions) => {
  try {
    const result = await generateSSHKey(options);
    return { success: true, data: result };
  } catch (error) {
    logger.error('Key generation failed', error);
    return { success: false, error: error.message };
  }
});

// Renderer usage (via preload)
const result = await window.sshAPI.generateKey({
  type: 'ed25519',
  name: 'id_ed25519',
  passphrase: 'secret',
  comment: 'user@example.com'
});
```

### Error Handling Strategy

1. **Main Process Errors**: Caught and logged, returned to renderer via IPC response
2. **Renderer Errors**: React error boundaries + toast notifications
3. **File System Errors**: Specific error codes mapped to user-friendly messages
4. **SSH Command Errors**: Parse stderr and provide context-aware solutions
5. **Logging**: All errors logged to `%APPDATA%\SSHKeyManager\logs\app.log`

### Security Principles

- **Never log private key contents** - only fingerprints and metadata
- **No network communication** - fully offline application
- **Secure IPC** - contextBridge whitelist pattern, no remote module
- **Input validation** - sanitize all user inputs before executing commands
- **Secure deletion** - option to overwrite files before deletion
- **No telemetry** - zero data collection or analytics

### Settings Persistence

Stored in `%APPDATA%\SSHKeyManager\config.json` via electron-store:

```typescript
{
  theme: 'dark' | 'light' | 'system',
  sshTimeout: number,      // Connection timeout in seconds
  autoFixPermissions: boolean,
  confirmDialogs: boolean,
  customSSHPath: string,   // Optional custom .ssh directory
  logLevel: 'info' | 'warn' | 'error' | 'debug',
  windowBounds: { width, height, x, y },
  lastBackupPath: string
}
```

### Build Configuration

#### electron-builder.yml
```yaml
appId: com.sshkeymanager.app
productName: SSH Key Manager
directories:
  output: dist
  buildResources: build
files:
  - src/**/*
  - package.json
win:
  target:
    - nsis
    - portable
  icon: build/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

## Common Development Tasks

### Adding a New SSH Operation

1. Add handler in `src/main/sshManager.ts`
2. Register IPC handler in `src/main/ipc-handlers.ts`
3. Expose via preload in `src/preload/index.ts`
4. Add TypeScript types in `src/shared/types.ts`
5. Call from renderer component using `window.sshAPI.<method>`

### Adding a New UI Page

1. Create component in `src/renderer/pages/<PageName>.tsx`
2. Add route in `src/renderer/App.tsx`
3. Add navigation item in sidebar component
4. Create any needed child components in `src/renderer/components/`

### Modifying SSH Config Parser

1. Update parsing logic in `src/main/configParser.ts`
2. Update shared types in `src/shared/types.ts`
3. Update UI components displaying config data
4. Add tests for new config patterns

### Testing Connection Logic

1. Implement connection test in `src/main/connectionTester.ts`
2. Add error message mapping for common SSH errors
3. Update UI to display detailed results
4. Test with various failure scenarios (timeout, auth fail, etc.)

## Important Implementation Notes

### SSH Key Generation Commands

```bash
# ED25519 (recommended, modern, fast)
ssh-keygen -t ed25519 -C "comment" -f "path" -N "passphrase"

# RSA 4096 (widely compatible)
ssh-keygen -t rsa -b 4096 -C "comment" -f "path" -N "passphrase"

# ECDSA 521
ssh-keygen -t ecdsa -b 521 -C "comment" -f "path" -N "passphrase"

# Empty passphrase: use -N ""
# Interactive passphrase: omit -N flag
```

### SSH Config File Format

```
Host alias
    HostName server.example.com
    Port 22
    User username
    IdentityFile ~/.ssh/id_ed25519
    PreferredAuthentications publickey

# Comments are preserved
Host github
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_key
```

### Windows Permission Commands

```powershell
# Remove inheritance, grant full control to current user on .ssh directory
icacls "%USERPROFILE%\.ssh" /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F"

# Private key: read-only for current user
icacls "C:\Users\User\.ssh\id_ed25519" /inheritance:r /grant:r "%USERNAME%:R"

# Public key: read for everyone
icacls "C:\Users\User\.ssh\id_ed25519.pub" /inheritance:r /grant:r "%USERNAME%:R" /grant:r "Everyone:R"

# Config file: read-only for current user
icacls "%USERPROFILE%\.ssh\config" /inheritance:r /grant:r "%USERNAME%:R"
```

### Default Paths

- **SSH Directory**: `%USERPROFILE%\.ssh` (e.g., `C:\Users\Username\.ssh`)
- **Config File**: `%USERPROFILE%\.ssh\config`
- **App Data**: `%APPDATA%\SSHKeyManager` (logs, settings)
- **Logs**: `%APPDATA%\SSHKeyManager\logs\app.log`
- **Settings**: `%APPDATA%\SSHKeyManager\config.json`

## Testing Checklist

- [ ] Key generation for ED25519, RSA 4096, RSA 2048, ECDSA 521
- [ ] Key generation with and without passphrase
- [ ] Config parsing with various host entry formats
- [ ] Connection testing (success, timeout, auth failure, host unreachable)
- [ ] Permission fixing on Windows 10 and Windows 11
- [ ] Backup creation and successful restore
- [ ] Theme switching (light/dark/system)
- [ ] App behavior with missing OpenSSH
- [ ] App behavior with missing .ssh directory
- [ ] Error scenarios: file permission denied, invalid config syntax

## Known Limitations

- Windows-only (macOS/Linux support not implemented)
- Requires OpenSSH client installed
- No support for SSH agent management (future feature)
- No support for known_hosts editing (future feature)
- No support for SSH certificate authentication (future feature)

## Troubleshooting

### "OpenSSH not found"
- Install via Settings → Apps → Optional Features → OpenSSH Client
- Or use PowerShell: `Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0`

### Permission errors on .ssh directory
- Use the "Fix All Permissions" button in the app
- Or manually run `icacls` commands listed above

### Config file parsing errors
- Check for invalid syntax in config file
- Ensure Host entries have HostName defined
- Check for unclosed quotes or invalid option names
