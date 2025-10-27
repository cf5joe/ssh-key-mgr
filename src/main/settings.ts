import Store from 'electron-store';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { logger } from './logger';
import type { AppSettings } from '@shared/types';

// Initialize electron-store
const store = new Store<AppSettings>({
  name: 'settings',
  defaults: DEFAULT_SETTINGS as AppSettings
});

/**
 * Get all settings
 */
export function getSettings(): AppSettings {
  try {
    const settings = store.store as AppSettings;
    logger.debug('Settings retrieved', JSON.stringify(settings));
    return settings;
  } catch (error) {
    logger.error('Failed to get settings', String(error));
    return DEFAULT_SETTINGS as AppSettings;
  }
}

/**
 * Update settings (partial update)
 */
export function updateSettings(newSettings: Partial<AppSettings>): AppSettings {
  try {
    // Get current settings
    const currentSettings = getSettings();

    // Merge with new settings
    const updatedSettings = {
      ...currentSettings,
      ...newSettings
    };

    // Save to store
    store.store = updatedSettings;

    logger.info('Settings updated', JSON.stringify(newSettings));
    return updatedSettings;
  } catch (error) {
    logger.error('Failed to update settings', String(error));
    throw new Error(`Failed to update settings: ${error}`);
  }
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): AppSettings {
  try {
    store.store = DEFAULT_SETTINGS as AppSettings;
    logger.info('Settings reset to defaults');
    return DEFAULT_SETTINGS as AppSettings;
  } catch (error) {
    logger.error('Failed to reset settings', String(error));
    throw new Error(`Failed to reset settings: ${error}`);
  }
}

/**
 * Get a specific setting value
 */
export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  try {
    return store.get(key);
  } catch (error) {
    logger.error(`Failed to get setting: ${key}`, String(error));
    return DEFAULT_SETTINGS[key] as AppSettings[K];
  }
}

/**
 * Set a specific setting value
 */
export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  try {
    store.set(key, value);
    logger.info(`Setting updated: ${key} = ${value}`);
  } catch (error) {
    logger.error(`Failed to set setting: ${key}`, String(error));
    throw new Error(`Failed to set setting: ${error}`);
  }
}

/**
 * Check if a setting exists
 */
export function hasSetting(key: keyof AppSettings): boolean {
  return store.has(key);
}

/**
 * Delete a specific setting (revert to default)
 */
export function deleteSetting(key: keyof AppSettings): void {
  try {
    store.delete(key);
    logger.info(`Setting deleted: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete setting: ${key}`, String(error));
    throw new Error(`Failed to delete setting: ${error}`);
  }
}

/**
 * Get settings file path
 */
export function getSettingsPath(): string {
  return store.path;
}

/**
 * Export settings to JSON
 */
export function exportSettings(): string {
  try {
    const settings = getSettings();
    return JSON.stringify(settings, null, 2);
  } catch (error) {
    logger.error('Failed to export settings', String(error));
    throw new Error(`Failed to export settings: ${error}`);
  }
}

/**
 * Import settings from JSON
 */
export function importSettings(json: string): AppSettings {
  try {
    const settings = JSON.parse(json) as AppSettings;

    // Validate settings (basic check)
    if (typeof settings !== 'object') {
      throw new Error('Invalid settings format');
    }

    // Update settings
    store.store = settings;

    logger.info('Settings imported successfully');
    return settings;
  } catch (error) {
    logger.error('Failed to import settings', String(error));
    throw new Error(`Failed to import settings: ${error}`);
  }
}
