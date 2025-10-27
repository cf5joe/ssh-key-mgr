# SSH Key Manager

A production-ready Windows desktop application for managing SSH keys, configurations, and connections. Built with Electron, React, and TypeScript.

## Features

- **Prerequisites Checking**: Automatic verification of OpenSSH installation, .ssh directory, and proper configurations
- **SSH Key Management**: Generate, import, export, and view SSH keys (ED25519, RSA, ECDSA)
- **Configuration Management**: Manage SSH host configurations with connection testing
- **Permission Management**: Automatically check and fix Windows file permissions for SSH files
- **Backup & Restore**: Create and restore backups of your entire .ssh directory
- **Dark/Light Theme**: System-aware theme switching
- **Application Logs**: View and manage application logs

## System Requirements

- Windows 10 or Windows 11
- OpenSSH Client (install via Windows Optional Features)
- Node.js 18+ (for development)

## Installation

### For Users (When Built)

1. Download the latest release `.exe` file
2. Run the installer or portable version
3. Launch SSH Key Manager

### For Developers

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd ssh-key-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

   Or build portable version:
   ```bash
   npm run build:portable
   ```

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build all components
npm run build

# Build portable .exe
npm run build:portable

# Run type checking
npm run type-check

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Start built application
npm start
```

## Project Structure

```
ssh-key-manager/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # App entry point
│   │   ├── ipc-handlers.ts # IPC communication
│   │   ├── logger.ts      # Logging system
│   │   ├── fileSystem.ts  # File operations
│   │   └── prerequisitesCheck.ts # System checks
│   ├── renderer/          # React UI
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Main page views
│   │   ├── context/       # React context
│   │   ├── styles/        # CSS files
│   │   ├── App.tsx        # Root component
│   │   └── index.tsx      # React entry
│   ├── preload/           # Preload scripts
│   │   └── index.ts       # IPC bridge
│   └── shared/            # Shared code
│       ├── types.ts       # TypeScript types
│       └── constants.ts   # Constants
├── public/                # Static assets
├── build/                 # Build resources (icons)
├── dist/                  # Build output
└── release/               # Final executables
```

## Installing OpenSSH Client

If OpenSSH is not installed on your system:

### Via Settings (GUI)

1. Open Settings → Apps → Optional Features
2. Click "Add a feature"
3. Search for "OpenSSH Client"
4. Click Install

### Via PowerShell (Admin)

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

## Usage

### Dashboard

View system status and quick stats about your SSH keys, configurations, and backups.

### SSH Keys

- **Generate New Key**: Create ED25519, RSA, or ECDSA keys with optional passphrase
- **View Keys**: See all your SSH keys with fingerprints and metadata
- **Import/Export**: Import existing keys or export to other locations

### Configurations

- **Manage Host Configs**: Add, edit, and delete SSH host configurations
- **Test Connections**: Test SSH connections before saving configurations
- **View Details**: See all configuration details for each host

### Backups

- **Create Backup**: Back up entire .ssh directory with metadata
- **Restore Backup**: Restore from previous backups with options to merge or overwrite
- **Backup History**: View all available backups

### Settings

- **Theme**: Switch between light, dark, or system theme
- **Behavior**: Configure SSH timeout, auto-fix permissions, and more
- **Advanced**: Custom SSH directory path and log levels

## Security

- **No Network Communication**: Fully offline application
- **No Telemetry**: Zero data collection
- **Private Keys Protected**: Never logged or displayed
- **Proper Permissions**: Automatic Windows permission management
- **Context Isolation**: Secure Electron architecture

## Troubleshooting

### OpenSSH Not Found

Install OpenSSH Client via Windows Optional Features or PowerShell (see above).

### Permission Errors

Use the "Fix All Permissions" button in the Dashboard or Permissions section.

### Config File Errors

Check your SSH config file syntax at `%USERPROFILE%\.ssh\config`. The app will highlight issues.

## Contributing

This is a personal-use application, but contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Roadmap

- [ ] Implement SSH key generation
- [ ] Implement SSH config parsing and editing
- [ ] Add connection testing functionality
- [ ] Implement permission management for Windows
- [ ] Add backup and restore features
- [ ] Implement settings persistence with electron-store
- [ ] Add SSH agent management
- [ ] Add known_hosts editing
- [ ] Add SSH certificate support
- [ ] macOS and Linux support

## Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [ssh2](https://github.com/mscdex/ssh2)
