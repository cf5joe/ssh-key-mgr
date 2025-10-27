// Shared constants between main and renderer processes

import path from 'path';
import os from 'os';

// SSH Paths
export const SSH_DIR = path.join(os.homedir(), '.ssh');
export const SSH_CONFIG_PATH = path.join(SSH_DIR, 'config');
export const KNOWN_HOSTS_PATH = path.join(SSH_DIR, 'known_hosts');

// App Paths
export const APP_NAME = 'SSHKeyManager';
export const APP_DATA_DIR = path.join(process.env.APPDATA || '', APP_NAME);
export const LOGS_DIR = path.join(APP_DATA_DIR, 'logs');
export const CONFIG_FILE = path.join(APP_DATA_DIR, 'config.json');
export const LOG_FILE = path.join(LOGS_DIR, 'app.log');

// Default Settings
export const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  sshTimeout: 10,
  autoFixPermissions: true,
  confirmDialogs: true,
  logLevel: 'info' as const,
  windowBounds: {
    width: 1200,
    height: 800
  }
};

// SSH Key Types
export const KEY_TYPES = {
  rsa: {
    name: 'RSA',
    defaultBits: 4096,
    availableBits: [2048, 3072, 4096],
    recommended: false,
    description: 'RSA - Widely compatible, larger key size'
  },
  ed25519: {
    name: 'ED25519',
    defaultBits: 256,
    availableBits: [256],
    recommended: true,
    description: 'ED25519 - Modern, fast, secure (recommended)'
  },
  ecdsa: {
    name: 'ECDSA',
    defaultBits: 521,
    availableBits: [256, 384, 521],
    recommended: false,
    description: 'ECDSA - Elliptic curve, good performance'
  },
  dsa: {
    name: 'DSA',
    defaultBits: 1024,
    availableBits: [1024],
    recommended: false,
    description: 'DSA - Legacy, not recommended'
  }
};

// SSH Key Patterns
export const PRIVATE_KEY_PATTERNS = [
  /^id_rsa$/,
  /^id_ed25519$/,
  /^id_ecdsa$/,
  /^id_dsa$/,
  /^.*_rsa$/,
  /^.*_ed25519$/,
  /^.*_ecdsa$/
];

export const PUBLIC_KEY_EXTENSION = '.pub';

// Permission Codes
export const PERMISSIONS = {
  SSH_DIR: '700',         // drwx------
  PRIVATE_KEY: '600',     // -rw-------
  PUBLIC_KEY: '644',      // -rw-r--r--
  CONFIG_FILE: '600'      // -rw-------
};

// Connection Test Timeout
export const DEFAULT_SSH_TIMEOUT = 10; // seconds

// Backup File Format
export const BACKUP_FILE_PREFIX = 'ssh_backup_';
export const BACKUP_FILE_EXTENSION = '.tar.gz';

// Log Settings
export const MAX_LOG_FILES = 10;
export const MAX_LOG_SIZE_MB = 10;

// Common SSH Errors
export const SSH_ERROR_MESSAGES: Record<string, string> = {
  'Connection refused': 'The server refused the connection. Check if SSH is running on the target server and the port is correct.',
  'Connection timed out': 'The connection attempt timed out. Check your network connection and ensure the server is reachable.',
  'Permission denied (publickey)': 'Authentication failed. The server rejected your SSH key. Verify the public key is added to the server\'s authorized_keys file.',
  'Host key verification failed': 'The server\'s host key doesn\'t match the stored key. This could indicate a security issue or server change.',
  'No route to host': 'Cannot reach the server. Check the hostname/IP address and your network connection.',
  'Name or service not known': 'Cannot resolve the hostname. Check the hostname spelling and DNS configuration.',
  'Bad owner or permissions': 'SSH key file has incorrect permissions. Use the "Fix Permissions" feature.'
};

// IPC Channel Names
export const IPC_CHANNELS = {
  // Prerequisites
  CHECK_PREREQUISITES: 'prerequisites:check',

  // SSH Keys
  LIST_KEYS: 'ssh:listKeys',
  GENERATE_KEY: 'ssh:generateKey',
  DELETE_KEY: 'ssh:deleteKey',
  IMPORT_KEY: 'ssh:importKey',
  EXPORT_KEY: 'ssh:exportKey',
  GET_KEY_INFO: 'ssh:getKeyInfo',

  // SSH Config
  PARSE_CONFIG: 'ssh:parseConfig',
  ADD_HOST_CONFIG: 'ssh:addHostConfig',
  UPDATE_HOST_CONFIG: 'ssh:updateHostConfig',
  DELETE_HOST_CONFIG: 'ssh:deleteHostConfig',
  TEST_CONNECTION: 'ssh:testConnection',

  // Permissions
  CHECK_PERMISSIONS: 'permissions:check',
  FIX_PERMISSIONS: 'permissions:fix',
  FIX_ALL_PERMISSIONS: 'permissions:fixAll',

  // Backup/Restore
  CREATE_BACKUP: 'backup:create',
  RESTORE_BACKUP: 'backup:restore',
  LIST_BACKUPS: 'backup:list',

  // Settings
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  RESET_SETTINGS: 'settings:reset',

  // Logs
  GET_LOGS: 'logs:get',
  CLEAR_LOGS: 'logs:clear',

  // File System
  OPEN_FILE_DIALOG: 'fs:openFileDialog',
  OPEN_DIRECTORY_DIALOG: 'fs:openDirectoryDialog',
  SAVE_FILE_DIALOG: 'fs:saveFileDialog'
};
