import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '@shared/constants';
import { checkPrerequisites } from './prerequisitesCheck';
import { ensureSSHDirectory, ensureSSHConfig } from './fileSystem';
import { logger } from './logger';
import { generateSSHKey, listSSHKeys, getKeyInfo, deleteSSHKey, importSSHKey, exportSSHKey } from './sshManager';
import { parseSSHConfig, addHostConfig, updateHostConfig, deleteHostConfig } from './configParser';
import { testSSHConnection, testSSHConnectionWithOptions } from './connectionTester';
import { checkAllPermissions, fixPermissions, fixAllPermissions } from './permissions';
import { createBackup, restoreBackup, listBackups } from './backup';
import { getSettings, updateSettings, resetSettings } from './settings';
import type { APIResponse, KeyGenOptions, SSHConfig, RestoreOptions } from '@shared/types';

export function initializeIpcHandlers(): void {
  logger.info('Initializing IPC handlers');

  // Prerequisites
  ipcMain.handle(IPC_CHANNELS.CHECK_PREREQUISITES, async () => {
    try {
      const result = await checkPrerequisites();
      return { success: true, data: result } as APIResponse;
    } catch (error) {
      logger.error('Failed to check prerequisites', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    try {
      const settings = getSettings();
      return { success: true, data: settings } as APIResponse;
    } catch (error) {
      logger.error('Failed to get settings', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, async (event, settings) => {
    try {
      const updatedSettings = updateSettings(settings);
      return { success: true, data: updatedSettings } as APIResponse;
    } catch (error) {
      logger.error('Failed to update settings', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.RESET_SETTINGS, async () => {
    try {
      const defaultSettings = resetSettings();
      return { success: true, data: defaultSettings } as APIResponse;
    } catch (error) {
      logger.error('Failed to reset settings', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  // Logs
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, async (event, limit?: number) => {
    try {
      const logs = await logger.getLogs(limit);
      return { success: true, data: logs } as APIResponse;
    } catch (error) {
      logger.error('Failed to get logs', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, async () => {
    try {
      await logger.clearLogs();
      return { success: true } as APIResponse;
    } catch (error) {
      logger.error('Failed to clear logs', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  // File System Dialogs
  ipcMain.handle(IPC_CHANNELS.OPEN_FILE_DIALOG, async (event, options) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        ...options
      });

      if (result.canceled) {
        return { success: false, error: 'Cancelled' } as APIResponse;
      }

      return { success: true, data: result.filePaths[0] } as APIResponse;
    } catch (error) {
      logger.error('Failed to open file dialog', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_DIRECTORY_DIALOG, async (event, options) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        ...options
      });

      if (result.canceled) {
        return { success: false, error: 'Cancelled' } as APIResponse;
      }

      return { success: true, data: result.filePaths[0] } as APIResponse;
    } catch (error) {
      logger.error('Failed to open directory dialog', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_FILE_DIALOG, async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(options);

      if (result.canceled) {
        return { success: false, error: 'Cancelled' } as APIResponse;
      }

      return { success: true, data: result.filePath } as APIResponse;
    } catch (error) {
      logger.error('Failed to open save dialog', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  // SSH Keys
  ipcMain.handle(IPC_CHANNELS.LIST_KEYS, async () => {
    try {
      const keys = await listSSHKeys();
      return { success: true, data: keys } as APIResponse;
    } catch (error) {
      logger.error('Failed to list SSH keys', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.GENERATE_KEY, async (event, options: KeyGenOptions) => {
    try {
      const key = await generateSSHKey(options);
      return { success: true, data: key } as APIResponse;
    } catch (error) {
      logger.error('Failed to generate SSH key', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_KEY_INFO, async (event, keyName: string) => {
    try {
      const keyInfo = await getKeyInfo(keyName);
      return { success: true, data: keyInfo } as APIResponse;
    } catch (error) {
      logger.error('Failed to get key info', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_KEY, async (event, keyName: string) => {
    try {
      await deleteSSHKey(keyName);
      return { success: true } as APIResponse;
    } catch (error) {
      logger.error('Failed to delete SSH key', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_KEY, async (event, sourcePath: string) => {
    try {
      const key = await importSSHKey(sourcePath);
      return { success: true, data: key } as APIResponse;
    } catch (error) {
      logger.error('Failed to import SSH key', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_KEY, async (event, keyName: string, destinationPath: string) => {
    try {
      await exportSSHKey(keyName, destinationPath);
      return { success: true } as APIResponse;
    } catch (error) {
      logger.error('Failed to export SSH key', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  // SSH Config
  ipcMain.handle(IPC_CHANNELS.PARSE_CONFIG, async () => {
    try {
      const configs = await parseSSHConfig();
      return { success: true, data: configs } as APIResponse;
    } catch (error) {
      logger.error('Failed to parse SSH config', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_HOST_CONFIG, async (event, config: SSHConfig) => {
    try {
      await addHostConfig(config);
      return { success: true } as APIResponse;
    } catch (error) {
      logger.error('Failed to add host config', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_HOST_CONFIG, async (event, host: string, config: SSHConfig) => {
    try {
      await updateHostConfig(host, config);
      return { success: true } as APIResponse;
    } catch (error) {
      logger.error('Failed to update host config', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_HOST_CONFIG, async (event, host: string) => {
    try {
      await deleteHostConfig(host);
      return { success: true } as APIResponse;
    } catch (error) {
      logger.error('Failed to delete host config', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEST_CONNECTION, async (event, host: string) => {
    try {
      const result = await testSSHConnection(host);
      return { success: true, data: result } as APIResponse;
    } catch (error) {
      logger.error('Failed to test connection', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  // Permissions
  ipcMain.handle(IPC_CHANNELS.CHECK_PERMISSIONS, async () => {
    try {
      const permissions = await checkAllPermissions();
      return { success: true, data: permissions } as APIResponse;
    } catch (error) {
      logger.error('Failed to check permissions', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FIX_PERMISSIONS, async (event, path: string) => {
    try {
      // Determine file type based on path
      const fileType = path.includes('.pub') ? 'public-key' :
                       path.includes('config') ? 'config' :
                       path.endsWith('.ssh') ? 'directory' : 'private-key';
      await fixPermissions(path, fileType);
      return { success: true } as APIResponse;
    } catch (error) {
      logger.error('Failed to fix permissions', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FIX_ALL_PERMISSIONS, async () => {
    try {
      const result = await fixAllPermissions();
      return { success: true, data: result } as APIResponse;
    } catch (error) {
      logger.error('Failed to fix all permissions', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  // Backup/Restore
  ipcMain.handle(IPC_CHANNELS.CREATE_BACKUP, async (event, destinationPath: string) => {
    try {
      const backupInfo = await createBackup(destinationPath);
      return { success: true, data: backupInfo } as APIResponse;
    } catch (error) {
      logger.error('Failed to create backup', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.RESTORE_BACKUP, async (event, options: RestoreOptions) => {
    try {
      await restoreBackup(options);
      return { success: true } as APIResponse;
    } catch (error) {
      logger.error('Failed to restore backup', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.LIST_BACKUPS, async (event, directory: string) => {
    try {
      const backups = await listBackups(directory);
      return { success: true, data: backups } as APIResponse;
    } catch (error) {
      logger.error('Failed to list backups', String(error));
      return { success: false, error: String(error) } as APIResponse;
    }
  });

  logger.info('IPC handlers initialized');
}
