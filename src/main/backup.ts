import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SSH_DIR, BACKUP_FILE_PREFIX, BACKUP_FILE_EXTENSION } from '@shared/constants';
import { logger } from './logger';
import { listFiles, fileExists, directoryExists } from './fileSystem';
import type { BackupMetadata, BackupInfo, RestoreOptions } from '@shared/types';

const execAsync = promisify(exec);

/**
 * Create a backup of the .ssh directory
 */
export async function createBackup(destinationPath: string): Promise<BackupInfo> {
  logger.info(`Creating backup to: ${destinationPath}`);

  try {
    // Check if .ssh directory exists
    if (!(await directoryExists(SSH_DIR))) {
      throw new Error('.ssh directory does not exist');
    }

    // Get all files in .ssh directory
    const files = await listFiles(SSH_DIR);

    // Create metadata
    const metadata: BackupMetadata = {
      createdAt: new Date().toISOString(),
      username: os.userInfo().username,
      computerName: os.hostname(),
      appVersion: '1.0.0', // TODO: Get from package.json
      files: files.filter(f => f !== '.' && f !== '..'),
      fileCount: files.filter(f => f !== '.' && f !== '..').length
    };

    // Create temporary directory for backup
    const tempDir = path.join(os.tmpdir(), `ssh-backup-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Copy all files to temp directory
      for (const file of metadata.files) {
        const sourcePath = path.join(SSH_DIR, file);
        const destPath = path.join(tempDir, file);

        try {
          await fs.copyFile(sourcePath, destPath);
        } catch (error) {
          logger.warn(`Failed to copy file: ${file}`, String(error));
        }
      }

      // Write metadata file
      const metadataPath = path.join(tempDir, 'backup-metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

      // Create archive using tar (included with Windows 10+)
      const backupFileName = `${BACKUP_FILE_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}${BACKUP_FILE_EXTENSION}`;
      const finalBackupPath = path.join(destinationPath, backupFileName);

      // Ensure destination directory exists
      await fs.mkdir(destinationPath, { recursive: true });

      // Create tar.gz archive
      // Windows 10+ includes tar command
      const command = `tar -czf "${finalBackupPath}" -C "${tempDir}" .`;
      logger.debug(`Executing: ${command}`);

      await execAsync(command);

      // Get backup file size
      const stats = await fs.stat(finalBackupPath);

      logger.info(`Backup created successfully: ${finalBackupPath} (${stats.size} bytes)`);

      return {
        path: finalBackupPath,
        metadata,
        size: stats.size
      };
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        logger.warn('Failed to clean up temp directory', String(error));
      }
    }
  } catch (error) {
    logger.error('Failed to create backup', String(error));
    throw new Error(`Failed to create backup: ${error}`);
  }
}

/**
 * Restore a backup
 */
export async function restoreBackup(options: RestoreOptions): Promise<void> {
  logger.info(`Restoring backup from: ${options.backupPath}`);

  try {
    // Check if backup file exists
    if (!(await fileExists(options.backupPath))) {
      throw new Error('Backup file does not exist');
    }

    // Create backup of current .ssh directory if requested
    if (options.createBackup && await directoryExists(SSH_DIR)) {
      const currentBackupPath = path.join(
        path.dirname(options.backupPath),
        `${BACKUP_FILE_PREFIX}pre-restore-${Date.now()}${BACKUP_FILE_EXTENSION}`
      );

      logger.info(`Creating pre-restore backup: ${currentBackupPath}`);

      try {
        await createBackup(path.dirname(currentBackupPath));
      } catch (error) {
        logger.warn('Failed to create pre-restore backup', String(error));
        // Continue anyway
      }
    }

    // Create temporary directory for extraction
    const tempDir = path.join(os.tmpdir(), `ssh-restore-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Extract backup archive
      const command = `tar -xzf "${options.backupPath}" -C "${tempDir}"`;
      logger.debug(`Executing: ${command}`);

      await execAsync(command);

      // Read metadata
      const metadataPath = path.join(tempDir, 'backup-metadata.json');
      let metadata: BackupMetadata | null = null;

      if (await fileExists(metadataPath)) {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
        logger.info(`Restoring backup from ${metadata.createdAt}`);
      }

      // Ensure .ssh directory exists
      await fs.mkdir(SSH_DIR, { recursive: true });

      // Get files to restore (exclude metadata)
      const filesToRestore = await listFiles(tempDir);
      const restoreFiles = filesToRestore.filter(f => f !== 'backup-metadata.json' && f !== '.' && f !== '..');

      // Restore files
      for (const file of restoreFiles) {
        const sourcePath = path.join(tempDir, file);
        const destPath = path.join(SSH_DIR, file);

        try {
          // Check if file already exists
          const destExists = await fileExists(destPath);

          if (destExists && !options.overwriteExisting) {
            if (options.mergeDuplicates) {
              // Rename and keep both
              const newName = `${file}.restored-${Date.now()}`;
              const newDestPath = path.join(SSH_DIR, newName);
              await fs.copyFile(sourcePath, newDestPath);
              logger.info(`Merged file: ${file} -> ${newName}`);
            } else {
              logger.info(`Skipped existing file: ${file}`);
              continue;
            }
          } else {
            // Copy file
            await fs.copyFile(sourcePath, destPath);
            logger.info(`Restored file: ${file}`);
          }
        } catch (error) {
          logger.error(`Failed to restore file: ${file}`, String(error));
        }
      }

      logger.info('Backup restored successfully');
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        logger.warn('Failed to clean up temp directory', String(error));
      }
    }
  } catch (error) {
    logger.error('Failed to restore backup', String(error));
    throw new Error(`Failed to restore backup: ${error}`);
  }
}

/**
 * List available backups in a directory
 */
export async function listBackups(directory: string): Promise<BackupInfo[]> {
  logger.info(`Listing backups in: ${directory}`);

  try {
    if (!(await directoryExists(directory))) {
      return [];
    }

    const files = await listFiles(directory);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      // Check if file matches backup pattern
      if (file.startsWith(BACKUP_FILE_PREFIX) && file.endsWith(BACKUP_FILE_EXTENSION)) {
        const filePath = path.join(directory, file);

        try {
          // Get file stats
          const stats = await fs.stat(filePath);

          // Extract metadata from backup file
          let metadata = await getBackupMetadata(filePath);

          // Fallback to dummy metadata if extraction fails
          if (!metadata) {
            metadata = {
              createdAt: stats.birthtime.toISOString(),
              username: 'Unknown',
              computerName: 'Unknown',
              appVersion: 'Unknown',
              files: [],
              fileCount: 0
            };
          }

          backups.push({
            path: filePath,
            metadata,
            size: stats.size
          });
        } catch (error) {
          logger.warn(`Failed to get info for backup: ${file}`, String(error));
        }
      }
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());

    logger.info(`Found ${backups.length} backups`);
    return backups;
  } catch (error) {
    logger.error('Failed to list backups', String(error));
    throw new Error(`Failed to list backups: ${error}`);
  }
}

/**
 * Get backup metadata without extracting
 */
export async function getBackupMetadata(backupPath: string): Promise<BackupMetadata | null> {
  logger.info(`Getting metadata for backup: ${backupPath}`);

  try {
    // Create temporary directory
    const tempDir = path.join(os.tmpdir(), `ssh-backup-meta-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Extract only metadata file
      const command = `tar -xzf "${backupPath}" -C "${tempDir}" backup-metadata.json`;

      await execAsync(command);

      // Read metadata
      const metadataPath = path.join(tempDir, 'backup-metadata.json');

      if (await fileExists(metadataPath)) {
        const content = await fs.readFile(metadataPath, 'utf-8');
        return JSON.parse(content);
      }

      return null;
    } finally {
      // Clean up
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        logger.warn('Failed to clean up temp directory', String(error));
      }
    }
  } catch (error) {
    logger.warn('Failed to get backup metadata', String(error));
    return null;
  }
}

/**
 * Delete a backup file
 */
export async function deleteBackup(backupPath: string): Promise<void> {
  logger.info(`Deleting backup: ${backupPath}`);

  try {
    await fs.unlink(backupPath);
    logger.info('Backup deleted successfully');
  } catch (error) {
    logger.error('Failed to delete backup', String(error));
    throw new Error(`Failed to delete backup: ${error}`);
  }
}
