import { exec } from 'child_process';
import { promisify } from 'util';
import { DEFAULT_SSH_TIMEOUT, SSH_ERROR_MESSAGES } from '@shared/constants';
import { logger } from './logger';
import type { ConnectionTestResult } from '@shared/types';

const execAsync = promisify(exec);

/**
 * Test SSH connection to a host
 */
export async function testSSHConnection(host: string, timeout: number = DEFAULT_SSH_TIMEOUT): Promise<ConnectionTestResult> {
  logger.info(`Testing SSH connection to: ${host}`);

  const startTime = Date.now();

  try {
    // Build SSH command with test flag
    // -T: Disable pseudo-terminal allocation
    // -o ConnectTimeout: Set connection timeout
    // -o StrictHostKeyChecking=no: Don't prompt for host key verification (for testing)
    // -o BatchMode=yes: Don't prompt for passwords
    const command = `ssh -T -o ConnectTimeout=${timeout} -o StrictHostKeyChecking=no -o BatchMode=yes ${host} exit`;

    logger.debug(`Executing command: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: (timeout + 5) * 1000 // Add 5 seconds buffer
    });

    const connectionTime = Date.now() - startTime;

    // SSH connection successful
    logger.info(`SSH connection successful to ${host} (${connectionTime}ms)`);

    return {
      success: true,
      message: 'Connection successful',
      authMethod: 'publickey',
      connectionTime,
      error: undefined,
      errorDetails: stderr || undefined
    };
  } catch (error: any) {
    const connectionTime = Date.now() - startTime;

    logger.warn(`SSH connection failed to ${host}`, String(error));

    // Parse error message
    const errorMessage = error.message || String(error);
    const stderr = error.stderr || '';

    // Determine error type and provide helpful message
    const { friendlyMessage, errorType } = parseSSHError(stderr || errorMessage);

    return {
      success: false,
      message: friendlyMessage,
      connectionTime,
      error: errorType,
      errorDetails: stderr || errorMessage
    };
  }
}

/**
 * Parse SSH error and provide user-friendly message
 */
function parseSSHError(errorText: string): { friendlyMessage: string; errorType: string } {
  // Check for known error patterns
  for (const [pattern, message] of Object.entries(SSH_ERROR_MESSAGES)) {
    if (errorText.includes(pattern)) {
      return {
        friendlyMessage: message,
        errorType: pattern
      };
    }
  }

  // Check for specific error patterns
  if (errorText.includes('timed out') || errorText.includes('timeout')) {
    return {
      friendlyMessage: SSH_ERROR_MESSAGES['Connection timed out'],
      errorType: 'Connection timed out'
    };
  }

  if (errorText.includes('refused')) {
    return {
      friendlyMessage: SSH_ERROR_MESSAGES['Connection refused'],
      errorType: 'Connection refused'
    };
  }

  if (errorText.includes('Permission denied')) {
    return {
      friendlyMessage: SSH_ERROR_MESSAGES['Permission denied (publickey)'],
      errorType: 'Permission denied'
    };
  }

  if (errorText.includes('No route to host')) {
    return {
      friendlyMessage: SSH_ERROR_MESSAGES['No route to host'],
      errorType: 'No route to host'
    };
  }

  if (errorText.includes('Could not resolve hostname') || errorText.includes('Name or service not known')) {
    return {
      friendlyMessage: SSH_ERROR_MESSAGES['Name or service not known'],
      errorType: 'DNS resolution failed'
    };
  }

  if (errorText.includes('Host key verification failed')) {
    return {
      friendlyMessage: SSH_ERROR_MESSAGES['Host key verification failed'],
      errorType: 'Host key verification failed'
    };
  }

  if (errorText.includes('Bad owner or permissions')) {
    return {
      friendlyMessage: SSH_ERROR_MESSAGES['Bad owner or permissions'],
      errorType: 'Bad permissions'
    };
  }

  // Generic error
  return {
    friendlyMessage: 'Connection failed. Check the error details for more information.',
    errorType: 'Unknown error'
  };
}

/**
 * Test SSH connection with custom options
 */
export async function testSSHConnectionWithOptions(
  hostname: string,
  port: number = 22,
  user?: string,
  identityFile?: string,
  timeout: number = DEFAULT_SSH_TIMEOUT
): Promise<ConnectionTestResult> {
  logger.info(`Testing SSH connection to ${user ? user + '@' : ''}${hostname}:${port}`);

  const startTime = Date.now();

  try {
    // Build SSH command
    let command = 'ssh -T';

    // Add timeout
    command += ` -o ConnectTimeout=${timeout}`;

    // Add other options
    command += ' -o StrictHostKeyChecking=no -o BatchMode=yes';

    // Add port if not default
    if (port !== 22) {
      command += ` -p ${port}`;
    }

    // Add identity file
    if (identityFile) {
      command += ` -i "${identityFile}"`;
    }

    // Add user and hostname
    const hostString = user ? `${user}@${hostname}` : hostname;
    command += ` ${hostString} exit`;

    logger.debug(`Executing command: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: (timeout + 5) * 1000
    });

    const connectionTime = Date.now() - startTime;

    logger.info(`SSH connection successful (${connectionTime}ms)`);

    return {
      success: true,
      message: 'Connection successful',
      authMethod: identityFile ? 'publickey' : 'default',
      connectionTime,
      errorDetails: stderr || undefined
    };
  } catch (error: any) {
    const connectionTime = Date.now() - startTime;

    logger.warn('SSH connection failed', String(error));

    const errorMessage = error.message || String(error);
    const stderr = error.stderr || '';

    const { friendlyMessage, errorType } = parseSSHError(stderr || errorMessage);

    return {
      success: false,
      message: friendlyMessage,
      connectionTime,
      error: errorType,
      errorDetails: stderr || errorMessage
    };
  }
}

/**
 * Check if SSH service is reachable on a host (basic port check)
 */
export async function checkSSHPortReachable(hostname: string, port: number = 22, timeout: number = 5): Promise<boolean> {
  logger.info(`Checking if SSH port is reachable on ${hostname}:${port}`);

  try {
    // Use PowerShell Test-NetConnection on Windows
    const command = `powershell -Command "Test-NetConnection -ComputerName ${hostname} -Port ${port} -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded"`;

    const { stdout } = await execAsync(command, {
      timeout: timeout * 1000
    });

    const result = stdout.trim().toLowerCase() === 'true';

    logger.info(`SSH port reachable: ${result}`);
    return result;
  } catch (error) {
    logger.warn(`Failed to check SSH port reachability`, String(error));
    return false;
  }
}
