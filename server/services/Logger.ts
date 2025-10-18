/**
 * Server-side Logger Service
 * 
 * A flexible logging service for the Node.js backend with support for
 * different environments, log levels, and output destinations.
 * 
 * Features:
 * - Environment detection (development/production)
 * - Configurable log levels
 * - File output support
 * - Structured logging with metadata
 * - Performance tracking
 */

import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 0,
  LOG = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logFilePath?: string;
  enableTimestamps: boolean;
  enableStackTrace: boolean;
  prefix?: string;
}

export interface LogEntry {
  level: LogLevel;
  timestamp: number;
  message: string;
  data?: any[];
  stack?: string;
  prefix?: string;
}

type LogOutput = (entry: LogEntry) => void;

class LoggerService {
  private config: LoggerConfig;
  private outputs: LogOutput[] = [];
  private buffer: LogEntry[] = [];
  private maxBufferSize = 1000;
  private fileStream?: fs.WriteStream;

  constructor(config?: Partial<LoggerConfig>) {
    // Default configuration
    const isDev = process.env.NODE_ENV === 'development';
    
    this.config = {
      minLevel: isDev ? LogLevel.DEBUG : LogLevel.LOG,
      enableConsole: true,
      enableFile: false,
      enableTimestamps: true,
      enableStackTrace: isDev,
      prefix: '',
      ...config
    };

    // Register console output by default
    if (this.config.enableConsole) {
      this.registerOutput(this.consoleOutput.bind(this));
    }

    // Register file output if enabled
    if (this.config.enableFile && this.config.logFilePath) {
      this.initFileOutput(this.config.logFilePath);
    }
  }

  /**
   * Initialize file output
   */
  private initFileOutput(logFilePath: string): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create write stream
      this.fileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      this.registerOutput(this.fileOutput.bind(this));
    } catch (error) {
      console.error('[Logger] Failed to initialize file output:', error);
    }
  }

  /**
   * Register a custom output handler
   */
  registerOutput(output: LogOutput): void {
    this.outputs.push(output);
  }

  /**
   * Update logger configuration and re-register outputs
   */
  configure(config: Partial<LoggerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Close existing file stream if disabling or changing path
    if (this.fileStream && (!this.config.enableFile || config.logFilePath !== oldConfig.logFilePath)) {
      this.fileStream.end();
      this.fileStream = undefined;
    }

    // Re-register all outputs
    this.outputs = [];

    // Register console output if enabled
    if (this.config.enableConsole) {
      this.registerOutput(this.consoleOutput.bind(this));
    }

    // Register file output if enabled
    if (this.config.enableFile && this.config.logFilePath) {
      this.initFileOutput(this.config.logFilePath);
    }
  }

  /**
   * Unregister all outputs
   */
  clearOutputs(): void {
    this.outputs = [];
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = undefined;
    }
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  /**
   * Create a log entry
   */
  private createEntry(level: LogLevel, message: string, data?: any[]): LogEntry {
    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      message,
      data,
      prefix: this.config.prefix
    };

    if (this.config.enableStackTrace && level >= LogLevel.WARN) {
      entry.stack = new Error().stack;
    }

    return entry;
  }

  /**
   * Write a log entry to all outputs
   */
  private write(entry: LogEntry): void {
    // Add to buffer
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Write to all outputs
    this.outputs.forEach(output => {
      try {
        output(entry);
      } catch (error) {
        // Fail silently to avoid logging loops
      }
    });
  }

  /**
   * Format log entry for output
   */
  private formatEntry(entry: LogEntry): string {
    const parts: string[] = [];

    // Add timestamp
    if (this.config.enableTimestamps) {
      const date = new Date(entry.timestamp);
      const time = date.toLocaleTimeString('en-US', { hour12: false });
      parts.push(`[${time}]`);
    }

    // Add level
    const levelName = LogLevel[entry.level];
    parts.push(`[${levelName}]`);

    // Add prefix
    if (entry.prefix) {
      parts.push(`[${entry.prefix}]`);
    }

    // Add message
    parts.push(entry.message);

    return parts.join(' ');
  }

  /**
   * Console output handler
   */
  private consoleOutput(entry: LogEntry): void {
    const message = this.formatEntry(entry);
    const data = entry.data || [];

    // Output to appropriate console method
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, ...data);
        break;
      case LogLevel.LOG:
        console.log(message, ...data);
        break;
      case LogLevel.WARN:
        console.warn(message, ...data);
        if (entry.stack && this.config.enableStackTrace) {
          console.warn(entry.stack);
        }
        break;
      case LogLevel.ERROR:
        console.error(message, ...data);
        if (entry.stack && this.config.enableStackTrace) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * File output handler
   */
  private fileOutput(entry: LogEntry): void {
    if (!this.fileStream) return;

    const message = this.formatEntry(entry);
    const dataStr = entry.data ? ' ' + JSON.stringify(entry.data) : '';
    const line = `${message}${dataStr}\n`;

    this.fileStream.write(line);

    if (entry.stack && this.config.enableStackTrace) {
      this.fileStream.write(`${entry.stack}\n`);
    }
  }

  /**
   * Public logging methods
   */
  debug(message: string, ...data: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createEntry(LogLevel.DEBUG, message, data);
    this.write(entry);
  }

  log(message: string, ...data: any[]): void {
    if (!this.shouldLog(LogLevel.LOG)) return;
    const entry = this.createEntry(LogLevel.LOG, message, data);
    this.write(entry);
  }

  warn(message: string, ...data: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createEntry(LogLevel.WARN, message, data);
    this.write(entry);
  }

  error(message: string, ...data: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createEntry(LogLevel.ERROR, message, data);
    this.write(entry);
  }

  /**
   * Utility methods
   */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Performance timing helpers
   */
  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
  }

  /**
   * Close file stream
   */
  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = undefined;
    }
  }
}

// Create and export singleton instance
export const Logger = new LoggerService();

// Export default instance
export default Logger;
