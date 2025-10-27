import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/constants';
import type {
  PrerequisitesResult,
  SSHKey,
  KeyGenOptions,
  SSHConfig,
  ConnectionTestResult,
  PermissionStatus,
  BackupInfo,
  RestoreOptions,
  AppSettings,
  LogEntry,
  APIResponse
} from '@shared/types';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Prerequisites
  checkPrerequisites: (): Promise<APIResponse<PrerequisitesResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_PREREQUISITES),

  // SSH Keys
  listKeys: (): Promise<APIResponse<SSHKey[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.LIST_KEYS),

  generateKey: (options: KeyGenOptions): Promise<APIResponse<SSHKey>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_KEY, options),

  deleteKey: (keyName: string): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_KEY, keyName),

  importKey: (sourcePath: string): Promise<APIResponse<SSHKey>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_KEY, sourcePath),

  exportKey: (keyName: string, destinationPath: string): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_KEY, keyName, destinationPath),

  getKeyInfo: (keyName: string): Promise<APIResponse<SSHKey>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_KEY_INFO, keyName),

  // SSH Config
  parseConfig: (): Promise<APIResponse<SSHConfig[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PARSE_CONFIG),

  addHostConfig: (config: SSHConfig): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_HOST_CONFIG, config),

  updateHostConfig: (host: string, config: SSHConfig): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_HOST_CONFIG, host, config),

  deleteHostConfig: (host: string): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_HOST_CONFIG, host),

  testConnection: (host: string): Promise<APIResponse<ConnectionTestResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEST_CONNECTION, host),

  // Permissions
  checkPermissions: (): Promise<APIResponse<PermissionStatus[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_PERMISSIONS),

  fixPermissions: (path: string): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FIX_PERMISSIONS, path),

  fixAllPermissions: (): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FIX_ALL_PERMISSIONS),

  // Backup/Restore
  createBackup: (destinationPath: string): Promise<APIResponse<BackupInfo>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_BACKUP, destinationPath),

  restoreBackup: (options: RestoreOptions): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESTORE_BACKUP, options),

  listBackups: (directory: string): Promise<APIResponse<BackupInfo[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.LIST_BACKUPS, directory),

  // Settings
  getSettings: (): Promise<APIResponse<AppSettings>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),

  updateSettings: (settings: Partial<AppSettings>): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings),

  resetSettings: (): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESET_SETTINGS),

  // Logs
  getLogs: (limit?: number): Promise<APIResponse<LogEntry[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS, limit),

  clearLogs: (): Promise<APIResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LOGS),

  // File System Dialogs
  openFileDialog: (options?: any): Promise<APIResponse<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG, options),

  openDirectoryDialog: (options?: any): Promise<APIResponse<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_DIRECTORY_DIALOG, options),

  saveFileDialog: (options?: any): Promise<APIResponse<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE_DIALOG, options)
});

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      checkPrerequisites: () => Promise<APIResponse<PrerequisitesResult>>;
      listKeys: () => Promise<APIResponse<SSHKey[]>>;
      generateKey: (options: KeyGenOptions) => Promise<APIResponse<SSHKey>>;
      deleteKey: (keyName: string) => Promise<APIResponse<void>>;
      importKey: (sourcePath: string) => Promise<APIResponse<SSHKey>>;
      exportKey: (keyName: string, destinationPath: string) => Promise<APIResponse<void>>;
      getKeyInfo: (keyName: string) => Promise<APIResponse<SSHKey>>;
      parseConfig: () => Promise<APIResponse<SSHConfig[]>>;
      addHostConfig: (config: SSHConfig) => Promise<APIResponse<void>>;
      updateHostConfig: (host: string, config: SSHConfig) => Promise<APIResponse<void>>;
      deleteHostConfig: (host: string) => Promise<APIResponse<void>>;
      testConnection: (host: string) => Promise<APIResponse<ConnectionTestResult>>;
      checkPermissions: () => Promise<APIResponse<PermissionStatus[]>>;
      fixPermissions: (path: string) => Promise<APIResponse<void>>;
      fixAllPermissions: () => Promise<APIResponse<void>>;
      createBackup: (destinationPath: string) => Promise<APIResponse<BackupInfo>>;
      restoreBackup: (options: RestoreOptions) => Promise<APIResponse<void>>;
      listBackups: (directory: string) => Promise<APIResponse<BackupInfo[]>>;
      getSettings: () => Promise<APIResponse<AppSettings>>;
      updateSettings: (settings: Partial<AppSettings>) => Promise<APIResponse<void>>;
      resetSettings: () => Promise<APIResponse<void>>;
      getLogs: (limit?: number) => Promise<APIResponse<LogEntry[]>>;
      clearLogs: () => Promise<APIResponse<void>>;
      openFileDialog: (options?: any) => Promise<APIResponse<string>>;
      openDirectoryDialog: (options?: any) => Promise<APIResponse<string>>;
      saveFileDialog: (options?: any) => Promise<APIResponse<string>>;
    };
  }
}
