import fs from 'fs/promises';
import { SSH_DIR, SSH_CONFIG_PATH, APP_DATA_DIR, LOGS_DIR } from '@shared/constants';
import { logger } from './logger';

export async function ensureAppDirectories(): Promise<void> {
  const directories = [APP_DATA_DIR, LOGS_DIR];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`Ensured directory exists: ${dir}`);
    } catch (error) {
      logger.error(`Failed to create directory: ${dir}`, String(error));
      throw error;
    }
  }
}

export async function ensureSSHDirectory(): Promise<boolean> {
  try {
    await fs.access(SSH_DIR);
    return true;
  } catch {
    try {
      await fs.mkdir(SSH_DIR, { recursive: true, mode: 0o700 });
      logger.info(`Created SSH directory: ${SSH_DIR}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create SSH directory: ${SSH_DIR}`, String(error));
      return false;
    }
  }
}

export async function ensureSSHConfig(): Promise<boolean> {
  try {
    await fs.access(SSH_CONFIG_PATH);
    return true;
  } catch {
    try {
      await fs.writeFile(SSH_CONFIG_PATH, '# SSH Config File\n', { mode: 0o600 });
      logger.info(`Created SSH config file: ${SSH_CONFIG_PATH}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create SSH config file: ${SSH_CONFIG_PATH}`, String(error));
      return false;
    }
  }
}

export async function directoryExists(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function readFile(path: string): Promise<string> {
  try {
    return await fs.readFile(path, 'utf-8');
  } catch (error) {
    logger.error(`Failed to read file: ${path}`, String(error));
    throw error;
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  try {
    await fs.writeFile(path, content, 'utf-8');
    logger.info(`Wrote file: ${path}`);
  } catch (error) {
    logger.error(`Failed to write file: ${path}`, String(error));
    throw error;
  }
}

export async function deleteFile(path: string): Promise<void> {
  try {
    await fs.unlink(path);
    logger.info(`Deleted file: ${path}`);
  } catch (error) {
    logger.error(`Failed to delete file: ${path}`, String(error));
    throw error;
  }
}

export async function listFiles(directory: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directory);
    return files;
  } catch (error) {
    logger.error(`Failed to list files in directory: ${directory}`, String(error));
    throw error;
  }
}

export async function getFileStats(path: string) {
  try {
    return await fs.stat(path);
  } catch (error) {
    logger.error(`Failed to get file stats: ${path}`, String(error));
    throw error;
  }
}
