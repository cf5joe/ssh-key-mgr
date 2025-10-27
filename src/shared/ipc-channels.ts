// IPC Channel Names - Safe for use in preload script
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
