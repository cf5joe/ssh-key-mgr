import fs from 'fs/promises';
import { SSH_CONFIG_PATH } from '@shared/constants';
import { logger } from './logger';
import { fileExists } from './fileSystem';
import type { SSHConfig } from '@shared/types';

/**
 * Parse SSH config file into structured objects
 */
export async function parseSSHConfig(): Promise<SSHConfig[]> {
  logger.info('Parsing SSH config file');

  try {
    // Check if config file exists
    if (!(await fileExists(SSH_CONFIG_PATH))) {
      logger.warn('SSH config file does not exist');
      return [];
    }

    const content = await fs.readFile(SSH_CONFIG_PATH, 'utf-8');
    const configs: SSHConfig[] = [];
    const lines = content.split('\n');

    let currentHost: Partial<SSHConfig> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Match Host directive
      const hostMatch = line.match(/^Host\s+(.+)$/i);
      if (hostMatch) {
        // Save previous host if exists
        if (currentHost && currentHost.host && currentHost.hostname) {
          configs.push(currentHost as SSHConfig);
        }

        // Start new host
        currentHost = {
          host: hostMatch[1].trim(),
          hostname: '', // Will be set by HostName directive
          additionalOptions: {}
        };
        continue;
      }

      // Parse other directives if we're in a Host block
      if (currentHost) {
        const [key, ...valueParts] = line.split(/\s+/);
        const value = valueParts.join(' ');

        switch (key.toLowerCase()) {
          case 'hostname':
            currentHost.hostname = value;
            break;
          case 'port':
            currentHost.port = parseInt(value, 10);
            break;
          case 'user':
            currentHost.user = value;
            break;
          case 'identityfile':
            currentHost.identityFile = value.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '');
            break;
          case 'preferredauthentications':
            currentHost.preferredAuthentications = value;
            break;
          default:
            // Store other options
            if (!currentHost.additionalOptions) {
              currentHost.additionalOptions = {};
            }
            currentHost.additionalOptions[key] = value;
        }
      }
    }

    // Save last host
    if (currentHost && currentHost.host && currentHost.hostname) {
      configs.push(currentHost as SSHConfig);
    }

    logger.info(`Parsed ${configs.length} SSH host configurations`);
    return configs;
  } catch (error) {
    logger.error('Failed to parse SSH config', String(error));
    throw new Error(`Failed to parse SSH config: ${error}`);
  }
}

/**
 * Add a new host configuration to SSH config file
 */
export async function addHostConfig(config: SSHConfig): Promise<void> {
  logger.info('Adding host configuration', JSON.stringify(config));

  try {
    // Parse existing configs
    const existingConfigs = await parseSSHConfig();

    // Check if host already exists
    if (existingConfigs.some(c => c.host === config.host)) {
      throw new Error(`Host configuration already exists: ${config.host}`);
    }

    // Add new config
    existingConfigs.push(config);

    // Write back to file
    await writeSSHConfig(existingConfigs);

    logger.info(`Host configuration added: ${config.host}`);
  } catch (error) {
    logger.error('Failed to add host configuration', String(error));
    throw new Error(`Failed to add host configuration: ${error}`);
  }
}

/**
 * Update an existing host configuration
 */
export async function updateHostConfig(host: string, newConfig: SSHConfig): Promise<void> {
  logger.info(`Updating host configuration: ${host}`);

  try {
    // Parse existing configs
    const existingConfigs = await parseSSHConfig();

    // Find and update the config
    const index = existingConfigs.findIndex(c => c.host === host);
    if (index === -1) {
      throw new Error(`Host configuration not found: ${host}`);
    }

    existingConfigs[index] = newConfig;

    // Write back to file
    await writeSSHConfig(existingConfigs);

    logger.info(`Host configuration updated: ${host}`);
  } catch (error) {
    logger.error('Failed to update host configuration', String(error));
    throw new Error(`Failed to update host configuration: ${error}`);
  }
}

/**
 * Delete a host configuration
 */
export async function deleteHostConfig(host: string): Promise<void> {
  logger.info(`Deleting host configuration: ${host}`);

  try {
    // Parse existing configs
    const existingConfigs = await parseSSHConfig();

    // Filter out the config
    const filteredConfigs = existingConfigs.filter(c => c.host !== host);

    if (filteredConfigs.length === existingConfigs.length) {
      throw new Error(`Host configuration not found: ${host}`);
    }

    // Write back to file
    await writeSSHConfig(filteredConfigs);

    logger.info(`Host configuration deleted: ${host}`);
  } catch (error) {
    logger.error('Failed to delete host configuration', String(error));
    throw new Error(`Failed to delete host configuration: ${error}`);
  }
}

/**
 * Write SSH configurations back to config file
 */
async function writeSSHConfig(configs: SSHConfig[]): Promise<void> {
  logger.info('Writing SSH config file');

  try {
    let content = '# SSH Config File\n';
    content += '# Generated by SSH Key Manager\n\n';

    for (const config of configs) {
      content += `Host ${config.host}\n`;
      content += `    HostName ${config.hostname}\n`;

      if (config.port) {
        content += `    Port ${config.port}\n`;
      }

      if (config.user) {
        content += `    User ${config.user}\n`;
      }

      if (config.identityFile) {
        content += `    IdentityFile ${config.identityFile}\n`;
      }

      if (config.preferredAuthentications) {
        content += `    PreferredAuthentications ${config.preferredAuthentications}\n`;
      }

      // Write additional options
      if (config.additionalOptions) {
        for (const [key, value] of Object.entries(config.additionalOptions)) {
          content += `    ${key} ${value}\n`;
        }
      }

      content += '\n';
    }

    await fs.writeFile(SSH_CONFIG_PATH, content, 'utf-8');
    logger.info('SSH config file written successfully');
  } catch (error) {
    logger.error('Failed to write SSH config file', String(error));
    throw new Error(`Failed to write SSH config file: ${error}`);
  }
}

/**
 * Validate SSH config syntax
 */
export async function validateSSHConfig(): Promise<{ valid: boolean; errors: string[] }> {
  logger.info('Validating SSH config');

  const errors: string[] = [];

  try {
    const configs = await parseSSHConfig();

    for (const config of configs) {
      if (!config.host) {
        errors.push('Missing Host directive');
      }

      if (!config.hostname) {
        errors.push(`Host ${config.host}: Missing HostName`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    errors.push(String(error));
    return {
      valid: false,
      errors
    };
  }
}
