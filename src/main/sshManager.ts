import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { SSH_DIR, PRIVATE_KEY_PATTERNS, PUBLIC_KEY_EXTENSION } from '@shared/constants';
import { logger } from './logger';
import { fileExists, listFiles, getFileStats } from './fileSystem';
import type { SSHKey, KeyGenOptions, KeyType } from '@shared/types';

const execAsync = promisify(exec);

/**
 * Generate a new SSH key pair
 */
export async function generateSSHKey(options: KeyGenOptions): Promise<SSHKey> {
  logger.info('Generating SSH key', JSON.stringify(options));

  const { type, bits, name, passphrase, comment } = options;
  const outputPath = options.outputPath || path.join(SSH_DIR, name);

  // Build ssh-keygen command
  let command = `ssh-keygen -t ${type}`;

  // Add bits for RSA and ECDSA
  if ((type === 'rsa' || type === 'ecdsa') && bits) {
    command += ` -b ${bits}`;
  }

  // Add comment
  if (comment) {
    command += ` -C "${comment}"`;
  }

  // Add output file
  command += ` -f "${outputPath}"`;

  // Add passphrase (empty string for no passphrase)
  command += ` -N "${passphrase || ''}"`;

  try {
    const { stdout, stderr } = await execAsync(command);
    logger.info('SSH key generated successfully', stdout);

    // Get key information
    const keyInfo = await getKeyInfo(name);
    return keyInfo;
  } catch (error) {
    logger.error('Failed to generate SSH key', String(error));
    throw new Error(`Failed to generate SSH key: ${error}`);
  }
}

/**
 * Check if a file is a private SSH key by examining its content
 */
async function isPrivateKeyFile(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for SSH private key headers
    const privateKeyHeaders = [
      '-----BEGIN RSA PRIVATE KEY-----',
      '-----BEGIN DSA PRIVATE KEY-----',
      '-----BEGIN EC PRIVATE KEY-----',
      '-----BEGIN OPENSSH PRIVATE KEY-----',
      '-----BEGIN PRIVATE KEY-----'
    ];

    return privateKeyHeaders.some(header => content.includes(header));
  } catch (error) {
    return false;
  }
}

/**
 * List all SSH keys in the .ssh directory
 */
export async function listSSHKeys(): Promise<SSHKey[]> {
  logger.info('Listing SSH keys');

  try {
    // Get SSH config to check which keys are mapped
    const { parseSSHConfig } = await import('./configParser');
    const configs = await parseSSHConfig();
    const mappedKeyPaths = new Set<string>();

    // Collect all identity files from config
    for (const config of configs) {
      if (config.identityFile) {
        // Normalize path for comparison
        const normalizedPath = config.identityFile.replace(/^~/, process.env.USERPROFILE || '').toLowerCase();
        mappedKeyPaths.add(path.basename(normalizedPath));
      }
    }

    const files = await listFiles(SSH_DIR);
    const keys: SSHKey[] = [];
    const processedKeys = new Set<string>();

    for (const file of files) {
      // Skip public keys and non-key files
      if (file.endsWith(PUBLIC_KEY_EXTENSION) || file.includes('known_hosts') || file === 'config') {
        continue;
      }

      const fullPath = path.join(SSH_DIR, file);

      // Check if it's a private key by content or pattern
      const matchesPattern = PRIVATE_KEY_PATTERNS.some(pattern => pattern.test(file));
      const isPrivateKey = matchesPattern || await isPrivateKeyFile(fullPath);

      if (isPrivateKey && !processedKeys.has(file)) {
        try {
          const keyInfo = await getKeyInfo(file);
          keys.push(keyInfo);
          processedKeys.add(file);
        } catch (error) {
          logger.warn(`Failed to get info for key: ${file}`, String(error));
        }
      }
    }

    logger.info(`Found ${keys.length} SSH keys`);
    return keys;
  } catch (error) {
    logger.error('Failed to list SSH keys', String(error));
    throw new Error(`Failed to list SSH keys: ${error}`);
  }
}

/**
 * Get detailed information about an SSH key
 */
export async function getKeyInfo(keyName: string): Promise<SSHKey> {
  const privateKeyPath = path.join(SSH_DIR, keyName);
  const publicKeyPath = privateKeyPath + PUBLIC_KEY_EXTENSION;

  // Check if private key exists
  const privateExists = await fileExists(privateKeyPath);
  if (!privateExists) {
    throw new Error(`Private key not found: ${keyName}`);
  }

  // Get fingerprint and type
  const { fingerprint, type, comment } = await getKeyFingerprint(privateKeyPath);

  // Check if public key exists
  const publicExists = await fileExists(publicKeyPath);

  // Check if key has passphrase (encrypted)
  const hasPassphrase = await checkIfEncrypted(privateKeyPath);

  // Get file stats
  const stats = await getFileStats(privateKeyPath);

  // Get associated hosts from SSH config
  const associatedHosts: string[] = [];
  let isMapped = false;

  try {
    const { parseSSHConfig } = await import('./configParser');
    const configs = await parseSSHConfig();

    for (const config of configs) {
      if (config.identityFile) {
        // Normalize paths for comparison
        const configKeyPath = config.identityFile
          .replace(/^~/, process.env.USERPROFILE || '')
          .toLowerCase();
        const configKeyName = path.basename(configKeyPath);

        // Check if this config references this key
        if (configKeyName === keyName.toLowerCase() ||
            configKeyPath === privateKeyPath.toLowerCase()) {
          associatedHosts.push(config.host);
          isMapped = true;
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to check SSH config for associated hosts', String(error));
  }

  return {
    name: keyName,
    type,
    fingerprint,
    publicKeyPath,
    privateKeyPath,
    comment,
    hasPassphrase,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
    size: stats.size,
    associatedHosts,
    isMapped
  };
}

/**
 * Get SSH key fingerprint and type
 */
async function getKeyFingerprint(keyPath: string): Promise<{ fingerprint: string; type: KeyType; comment?: string }> {
  try {
    // Use ssh-keygen to get fingerprint
    const { stdout } = await execAsync(`ssh-keygen -lf "${keyPath}"`);

    // Parse output: "2048 SHA256:fingerprint comment (RSA)"
    const match = stdout.match(/(\d+)\s+(SHA256:[^\s]+)\s*(.*?)\s*\(([^)]+)\)/);

    if (!match) {
      throw new Error('Failed to parse key fingerprint');
    }

    const fingerprint = match[2];
    const comment = match[3]?.trim() || undefined;
    const typeString = match[4].toLowerCase();

    // Map type string to KeyType
    let type: KeyType;
    if (typeString.includes('rsa')) {
      type = 'rsa';
    } else if (typeString.includes('ed25519')) {
      type = 'ed25519';
    } else if (typeString.includes('ecdsa')) {
      type = 'ecdsa';
    } else if (typeString.includes('dsa')) {
      type = 'dsa';
    } else {
      type = 'rsa'; // fallback
    }

    return { fingerprint, type, comment };
  } catch (error) {
    logger.error(`Failed to get fingerprint for ${keyPath}`, String(error));
    throw error;
  }
}

/**
 * Check if a private key is encrypted (has passphrase)
 */
async function checkIfEncrypted(keyPath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(keyPath, 'utf-8');

    // Check for encryption headers
    const encryptedHeaders = [
      'ENCRYPTED',
      'Proc-Type: 4,ENCRYPTED',
      'DEK-Info:'
    ];

    return encryptedHeaders.some(header => content.includes(header));
  } catch (error) {
    logger.error(`Failed to check encryption for ${keyPath}`, String(error));
    return false;
  }
}

/**
 * Delete an SSH key pair
 */
export async function deleteSSHKey(keyName: string): Promise<void> {
  logger.info(`Deleting SSH key: ${keyName}`);

  const privateKeyPath = path.join(SSH_DIR, keyName);
  const publicKeyPath = privateKeyPath + PUBLIC_KEY_EXTENSION;

  try {
    // Delete private key
    if (await fileExists(privateKeyPath)) {
      await fs.unlink(privateKeyPath);
      logger.info(`Deleted private key: ${privateKeyPath}`);
    }

    // Delete public key
    if (await fileExists(publicKeyPath)) {
      await fs.unlink(publicKeyPath);
      logger.info(`Deleted public key: ${publicKeyPath}`);
    }

    logger.info(`SSH key deleted successfully: ${keyName}`);
  } catch (error) {
    logger.error(`Failed to delete SSH key: ${keyName}`, String(error));
    throw new Error(`Failed to delete SSH key: ${error}`);
  }
}

/**
 * Import an SSH key from an external file
 */
export async function importSSHKey(sourcePath: string): Promise<SSHKey> {
  logger.info(`Importing SSH key from: ${sourcePath}`);

  try {
    const fileName = path.basename(sourcePath);
    const destinationPath = path.join(SSH_DIR, fileName);

    // Check if destination already exists
    if (await fileExists(destinationPath)) {
      throw new Error(`Key already exists: ${fileName}`);
    }

    // Copy private key
    await fs.copyFile(sourcePath, destinationPath);
    logger.info(`Copied private key to: ${destinationPath}`);

    // Check if public key exists and copy it
    const sourcePublicPath = sourcePath + PUBLIC_KEY_EXTENSION;
    if (await fileExists(sourcePublicPath)) {
      const destinationPublicPath = destinationPath + PUBLIC_KEY_EXTENSION;
      await fs.copyFile(sourcePublicPath, destinationPublicPath);
      logger.info(`Copied public key to: ${destinationPublicPath}`);
    }

    // Set proper permissions (will implement later)
    // await fixKeyPermissions(fileName);

    // Get key info
    const keyInfo = await getKeyInfo(fileName);
    logger.info(`SSH key imported successfully: ${fileName}`);

    return keyInfo;
  } catch (error) {
    logger.error(`Failed to import SSH key`, String(error));
    throw new Error(`Failed to import SSH key: ${error}`);
  }
}

/**
 * Export an SSH key to an external location
 */
export async function exportSSHKey(keyName: string, destinationPath: string): Promise<void> {
  logger.info(`Exporting SSH key: ${keyName} to ${destinationPath}`);

  const privateKeyPath = path.join(SSH_DIR, keyName);
  const publicKeyPath = privateKeyPath + PUBLIC_KEY_EXTENSION;

  try {
    // Copy private key
    if (await fileExists(privateKeyPath)) {
      await fs.copyFile(privateKeyPath, destinationPath);
      logger.info(`Exported private key to: ${destinationPath}`);
    } else {
      throw new Error(`Private key not found: ${keyName}`);
    }

    // Copy public key if it exists
    if (await fileExists(publicKeyPath)) {
      const destinationPublicPath = destinationPath + PUBLIC_KEY_EXTENSION;
      await fs.copyFile(publicKeyPath, destinationPublicPath);
      logger.info(`Exported public key to: ${destinationPublicPath}`);
    }

    logger.info(`SSH key exported successfully: ${keyName}`);
  } catch (error) {
    logger.error(`Failed to export SSH key`, String(error));
    throw new Error(`Failed to export SSH key: ${error}`);
  }
}
