import fs from 'fs/promises';
import path from 'path';
import { LOGS_DIR, LOG_FILE, MAX_LOG_FILES, MAX_LOG_SIZE_MB } from '@shared/constants';
import type { LogEntry } from '@shared/types';

class Logger {
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      // Create logs directory if it doesn't exist
      await fs.mkdir(LOGS_DIR, { recursive: true });

      // Rotate logs if needed
      await this.rotateLogs();

      this.initialized = true;
      this.info('Logger initialized');
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  private async rotateLogs(): Promise<void> {
    try {
      const stats = await fs.stat(LOG_FILE).catch(() => null);

      if (stats && stats.size > MAX_LOG_SIZE_MB * 1024 * 1024) {
        // Rotate existing logs
        for (let i = MAX_LOG_FILES - 1; i >= 0; i--) {
          const oldFile = i === 0 ? LOG_FILE : `${LOG_FILE}.${i}`;
          const newFile = `${LOG_FILE}.${i + 1}`;

          try {
            await fs.rename(oldFile, newFile);
          } catch {
            // File doesn't exist, skip
          }
        }

        // Delete oldest log if it exists
        try {
          await fs.unlink(`${LOG_FILE}.${MAX_LOG_FILES}`);
        } catch {
          // File doesn't exist, skip
        }
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  private async writeLog(level: LogEntry['level'], message: string, details?: string): Promise<void> {
    if (!this.initialized) {
      console.log(`[${level.toUpperCase()}] ${message}`, details || '');
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };

    const logLine = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}${details ? ` | ${details}` : ''}\n`;

    try {
      await fs.appendFile(LOG_FILE, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  info(message: string, details?: string): void {
    this.writeLog('info', message, details);
  }

  warn(message: string, details?: string): void {
    this.writeLog('warn', message, details);
  }

  error(message: string, details?: string): void {
    this.writeLog('error', message, details);
  }

  debug(message: string, details?: string): void {
    this.writeLog('debug', message, details);
  }

  async getLogs(limit?: number): Promise<LogEntry[]> {
    try {
      const content = await fs.readFile(LOG_FILE, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      const entries: LogEntry[] = lines.map(line => {
        const match = line.match(/\[(.*?)\] \[(.*?)\] (.*?)(?:\s\|\s(.*))?$/);
        if (!match) {
          return null;
        }

        return {
          timestamp: match[1],
          level: match[2].toLowerCase() as LogEntry['level'],
          message: match[3],
          details: match[4]
        };
      }).filter(Boolean) as LogEntry[];

      if (limit) {
        return entries.slice(-limit);
      }

      return entries;
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    try {
      await fs.writeFile(LOG_FILE, '', 'utf-8');
      this.info('Logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
      throw error;
    }
  }
}

export const logger = new Logger();

export async function initializeLogger(): Promise<void> {
  await logger.initialize();
}
