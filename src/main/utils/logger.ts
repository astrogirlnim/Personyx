/**
 * Logger utility for Personyx main process
 * Handles both console and file logging with rotation
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PATHS } from '@shared/constants';
import type { LogLevel, LogEntry } from '@shared/types';

// Conditionally import Electron app (may not be available in CI/test environments)
let electronApp: { getPath: (path: string) => string } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  electronApp = require('electron').app;
} catch {
  // Electron not available - running in Node.js environment (CI/tests)
  electronApp = null;
}

export class Logger {
  private source: string;
  private logFilePath!: string; // Definite assignment assertion - initialized in setupLogFile

  constructor(source: string) {
    this.source = source;
    this.setupLogFile();
  }

  /**
   * Set up log file path and ensure directory exists
   */
  private setupLogFile(): void {
    let userDataPath: string;

    if (electronApp) {
      // Running in Electron environment
      userDataPath = electronApp.getPath('userData');
    } else {
      // Running in Node.js environment (CI/tests) - use current working directory
      userDataPath = join(process.cwd(), 'test-logs');
    }

    const logsDir = join(userDataPath, PATHS.LOGS);

    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    const logFileName = `${this.source}-${new Date().toISOString().split('T')[0]}.log`;
    this.logFilePath = join(logsDir, logFileName);
  }

  /**
   * Log debug message
   */
  public debug(message: string, details?: unknown): void {
    this.log('debug', message, details);
  }

  /**
   * Log info message
   */
  public info(message: string, details?: unknown): void {
    this.log('info', message, details);
  }

  /**
   * Log warning message
   */
  public warn(message: string, details?: unknown): void {
    this.log('warn', message, details);
  }

  /**
   * Log error message
   */
  public error(message: string, details?: unknown): void {
    this.log('error', message, details);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, details?: unknown): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      source: this.source as 'main' | 'renderer',
      details,
    };

    // Console output with emoji
    const emoji = this.getLogEmoji(level);
    const timestamp = logEntry.timestamp.toISOString();
    const formattedMessage = `${emoji} [${timestamp}] [${this.source.toUpperCase()}] ${message}`;

    if (details) {
      console.log(formattedMessage, details);
    } else {
      console.log(formattedMessage);
    }

    // File output
    this.writeToFile(logEntry);
  }

  /**
   * Get emoji for log level
   */
  private getLogEmoji(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return '🐛';
      case 'info':
        return 'ℹ️';
      case 'warn':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '📝';
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(logEntry: LogEntry): void {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      writeFileSync(this.logFilePath, logLine, { flag: 'a' });
    } catch (error) {
      // Fail silently to avoid logging loops
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Get current log file path
   */
  public getLogFilePath(): string {
    return this.logFilePath;
  }
}
