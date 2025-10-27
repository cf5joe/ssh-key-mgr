import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { SSH_DIR, SSH_CONFIG_PATH, PUBLIC_KEY_EXTENSION } from '@shared/constants';
import { logger } from './logger';
import { listFiles, fileExists, directoryExists } from './fileSystem';
import type { PermissionStatus } from '@shared/types';

const execAsync = promisify(exec);

/**
 * Check permissions for all SSH-related files
 */
export async function checkAllPermissions(): Promise<PermissionStatus[]> {
  logger.info('Checking all SSH file permissions');

  const permissionStatuses: PermissionStatus[] = [];

  try {
    // Check .ssh directory
    if (await directoryExists(SSH_DIR)) {
      const dirStatus = await checkPermissions(SSH_DIR, 'directory');
      permissionStatuses.push(dirStatus);

      // Check config file
      if (await fileExists(SSH_CONFIG_PATH)) {
        const configStatus = await checkPermissions(SSH_CONFIG_PATH, 'config');
        permissionStatuses.push(configStatus);
      }

      // Check all key files
      const files = await listFiles(SSH_DIR);

      for (const file of files) {
        const filePath = path.join(SSH_DIR, file);

        // Skip directories and known_hosts
        if (file === '.' || file === '..' || file.includes('known_hosts')) {
          continue;
        }

        // Determine file type
        let fileType: PermissionStatus['fileType'];
        if (file.endsWith(PUBLIC_KEY_EXTENSION)) {
          fileType = 'public-key';
        } else if (file === 'config') {
          fileType = 'config';
        } else {
          // Assume it's a private key
          fileType = 'private-key';
        }

        const status = await checkPermissions(filePath, fileType);
        permissionStatuses.push(status);
      }
    }

    logger.info(`Checked ${permissionStatuses.length} files/directories`);
    return permissionStatuses;
  } catch (error) {
    logger.error('Failed to check permissions', String(error));
    throw new Error(`Failed to check permissions: ${error}`);
  }
}

/**
 * Check permissions for a specific file or directory
 */
async function checkPermissions(
  filePath: string,
  fileType: PermissionStatus['fileType']
): Promise<PermissionStatus> {
  try {
    // Get current permissions using icacls
    const { stdout } = await execAsync(`icacls "${filePath}"`);

    // Parse icacls output
    const currentPermissions = parseIcaclsOutput(stdout);

    // Determine expected permissions based on file type
    const expectedPermissions = getExpectedPermissions(fileType);

    // Check if current permissions match expected
    const isCorrect = checkPermissionsMatch(currentPermissions, expectedPermissions);

    return {
      path: filePath,
      currentPermissions,
      expectedPermissions,
      isCorrect,
      fileType
    };
  } catch (error) {
    logger.error(`Failed to check permissions for ${filePath}`, String(error));

    return {
      path: filePath,
      currentPermissions: 'Unknown',
      expectedPermissions: getExpectedPermissions(fileType),
      isCorrect: false,
      fileType
    };
  }
}

/**
 * Parse icacls output to get permission summary
 */
function parseIcaclsOutput(output: string): string {
  const lines = output.split('\n');

  // Get the line with permissions (typically the second line)
  if (lines.length < 2) {
    return 'Unknown';
  }

  // Extract permission info
  const permLine = lines[1].trim();

  // Look for the current user or owner
  const username = process.env.USERNAME || 'BUILTIN\\Administrators';

  if (permLine.includes(username)) {
    if (permLine.includes('(F)')) {
      return 'Full Control';
    } else if (permLine.includes('(M)')) {
      return 'Modify';
    } else if (permLine.includes('(R)')) {
      return 'Read';
    }
  }

  return permLine;
}

/**
 * Get expected permissions based on file type
 */
function getExpectedPermissions(fileType: PermissionStatus['fileType']): string {
  switch (fileType) {
    case 'directory':
      return 'Full Control (Current User Only)';
    case 'private-key':
      return 'Read (Current User Only)';
    case 'public-key':
      return 'Read (Current User + Everyone)';
    case 'config':
      return 'Read (Current User Only)';
    default:
      return 'Full Control (Current User Only)';
  }
}

/**
 * Check if permissions match expected (simplified check)
 */
function checkPermissionsMatch(current: string, expected: string): boolean {
  // This is a simplified check - in reality, we'd need more sophisticated comparison
  // For now, we check if current user has appropriate access

  if (expected.includes('Current User Only')) {
    // Should not have Everyone or other users
    return !current.toLowerCase().includes('everyone') &&
           !current.toLowerCase().includes('users');
  }

  return true; // Simplified - assume OK for now
}

/**
 * Fix permissions for a specific file or directory
 */
export async function fixPermissions(filePath: string, fileType: PermissionStatus['fileType']): Promise<void> {
  logger.info(`Fixing permissions for: ${filePath} (${fileType})`);

  try {
    const username = process.env.USERNAME;

    if (!username) {
      throw new Error('Could not determine current username');
    }

    let command: string;

    switch (fileType) {
      case 'directory':
        // Remove inheritance and grant full control to current user
        command = `icacls "${filePath}" /inheritance:r /grant:r "${username}:(OI)(CI)F"`;
        break;

      case 'private-key':
      case 'config':
        // Remove inheritance and grant read-only to current user
        command = `icacls "${filePath}" /inheritance:r /grant:r "${username}:R"`;
        break;

      case 'public-key':
        // Remove inheritance, grant read to current user and everyone
        command = `icacls "${filePath}" /inheritance:r /grant:r "${username}:R" /grant:r "Everyone:R"`;
        break;

      default:
        // Default to current user only
        command = `icacls "${filePath}" /inheritance:r /grant:r "${username}:R"`;
    }

    logger.debug(`Executing: ${command}`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('processed')) {
      logger.warn(`Permission fix warning: ${stderr}`);
    }

    logger.info(`Permissions fixed for: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to fix permissions for ${filePath}`, String(error));
    throw new Error(`Failed to fix permissions: ${error}`);
  }
}

/**
 * Fix permissions for all SSH files
 */
export async function fixAllPermissions(): Promise<{ fixed: number; failed: number; errors: string[] }> {
  logger.info('Fixing all SSH file permissions');

  const results = {
    fixed: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // Get all files that need permission fixing
    const statuses = await checkAllPermissions();

    for (const status of statuses) {
      if (!status.isCorrect) {
        try {
          await fixPermissions(status.path, status.fileType);
          results.fixed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${status.path}: ${error}`);
          logger.error(`Failed to fix permissions for ${status.path}`, String(error));
        }
      }
    }

    logger.info(`Fixed ${results.fixed} files, ${results.failed} failed`);
    return results;
  } catch (error) {
    logger.error('Failed to fix all permissions', String(error));
    throw new Error(`Failed to fix all permissions: ${error}`);
  }
}

/**
 * Check if a file has correct permissions
 */
export async function hasCorrectPermissions(filePath: string, fileType: PermissionStatus['fileType']): Promise<boolean> {
  try {
    const status = await checkPermissions(filePath, fileType);
    return status.isCorrect;
  } catch (error) {
    logger.error(`Failed to check permissions for ${filePath}`, String(error));
    return false;
  }
}
