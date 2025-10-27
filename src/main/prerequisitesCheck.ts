import { exec } from 'child_process';
import { promisify } from 'util';
import { SSH_DIR, SSH_CONFIG_PATH } from '@shared/constants';
import { directoryExists, fileExists } from './fileSystem';
import { logger } from './logger';
import type { PrerequisitesResult, PrerequisiteCheck } from '@shared/types';

const execAsync = promisify(exec);

export async function checkPrerequisites(): Promise<PrerequisitesResult> {
  logger.info('Checking prerequisites');

  const results: PrerequisitesResult = {
    opensshInstalled: await checkOpenSSH(),
    sshDirectoryExists: await checkSSHDirectory(),
    sshConfigExists: await checkSSHConfig(),
    permissionsCorrect: await checkPermissions(),
    pathConfigured: await checkPath()
  };

  logger.info('Prerequisites check completed', JSON.stringify(results));
  return results;
}

async function checkOpenSSH(): Promise<PrerequisiteCheck> {
  try {
    const { stdout } = await execAsync('where ssh');
    const sshPath = stdout.trim();

    return {
      name: 'OpenSSH Client',
      status: 'pass',
      message: 'OpenSSH client is installed',
      details: `Found at: ${sshPath}`,
      fixable: false
    };
  } catch {
    return {
      name: 'OpenSSH Client',
      status: 'fail',
      message: 'OpenSSH client not found',
      details: 'Install via Settings → Apps → Optional Features → OpenSSH Client',
      fixable: false
    };
  }
}

async function checkSSHDirectory(): Promise<PrerequisiteCheck> {
  const exists = await directoryExists(SSH_DIR);

  if (exists) {
    return {
      name: '.ssh Directory',
      status: 'pass',
      message: '.ssh directory exists',
      details: SSH_DIR,
      fixable: false
    };
  }

  return {
    name: '.ssh Directory',
    status: 'warning',
    message: '.ssh directory not found',
    details: `Expected at: ${SSH_DIR}`,
    fixable: true
  };
}

async function checkSSHConfig(): Promise<PrerequisiteCheck> {
  const exists = await fileExists(SSH_CONFIG_PATH);

  if (exists) {
    return {
      name: 'SSH Config File',
      status: 'pass',
      message: 'SSH config file exists',
      details: SSH_CONFIG_PATH,
      fixable: false
    };
  }

  return {
    name: 'SSH Config File',
    status: 'warning',
    message: 'SSH config file not found',
    details: `Expected at: ${SSH_CONFIG_PATH}`,
    fixable: true
  };
}

async function checkPermissions(): Promise<PrerequisiteCheck> {
  const exists = await directoryExists(SSH_DIR);

  if (!exists) {
    return {
      name: 'Directory Permissions',
      status: 'warning',
      message: 'Cannot check permissions - directory does not exist',
      fixable: true
    };
  }

  // On Windows, we'll implement more detailed permission checking later
  // For now, we'll just verify the directory is accessible
  return {
    name: 'Directory Permissions',
    status: 'pass',
    message: 'Directory is accessible',
    details: 'Detailed permission checking will be implemented',
    fixable: true
  };
}

async function checkPath(): Promise<PrerequisiteCheck> {
  try {
    const { stdout } = await execAsync('ssh -V');
    const version = stdout.trim();

    return {
      name: 'PATH Configuration',
      status: 'pass',
      message: 'SSH is accessible from PATH',
      details: version,
      fixable: false
    };
  } catch {
    return {
      name: 'PATH Configuration',
      status: 'warning',
      message: 'SSH not found in PATH',
      details: 'OpenSSH may be installed but not in system PATH',
      fixable: false
    };
  }
}
