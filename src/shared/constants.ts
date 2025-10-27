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

// Re-export renderer-safe constants
export {
  DEFAULT_SETTINGS,
  KEY_TYPES,
  PRIVATE_KEY_PATTERNS,
  PUBLIC_KEY_EXTENSION,
  PERMISSIONS,
  DEFAULT_SSH_TIMEOUT,
  BACKUP_FILE_PREFIX,
  BACKUP_FILE_EXTENSION,
  MAX_LOG_FILES,
  MAX_LOG_SIZE_MB,
  SSH_ERROR_MESSAGES
} from './renderer-constants';

// IPC Channel Names - re-exported from ipc-channels for convenience
export { IPC_CHANNELS } from './ipc-channels';
