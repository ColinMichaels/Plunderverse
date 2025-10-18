/**
 * Custom Logger Service
 * 
 * A flexible, environment-aware logging service that can be configured
 * for different environments and output destinations.
 * 
 * Features:
 * - Environment detection (development/production)
 * - Configurable log levels
 * - Multiple output destinations (console, remote, etc.)
 * - Structured logging with metadata
 * - Performance tracking
 */

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
  enableRemote: boolean;
  remoteEndpoint?: string;
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

  constructor(config?: Partial<LoggerConfig>) {
    // Default configuration
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    this.config = {
      minLevel: isDev ? LogLevel.DEBUG : LogLevel.LOG,
      enableConsole: true,
      enableRemote: false,
      enableTimestamps: isDev,
      enableStackTrace: false,
      prefix: '',
      ...config
    };

    // Register console output by default
    if (this.config.enableConsole) {
      this.registerOutput(this.consoleOutput.bind(this));
    }

    // Register remote output if enabled
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.registerOutput(this.remoteOutput.bind(this));
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

    // Re-register outputs if relevant config changed
    this.outputs = [];

    // Register console output if enabled
    if (this.config.enableConsole) {
      this.registerOutput(this.consoleOutput.bind(this));
    }

    // Register remote output if enabled
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.registerOutput(this.remoteOutput.bind(this));
    }
  }

  /**
   * Unregister all outputs
   */
  clearOutputs(): void {
    this.outputs = [];
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
   * Console output handler
   */
  private consoleOutput(entry: LogEntry): void {
    const parts: any[] = [];

    // Add timestamp
    if (this.config.enableTimestamps) {
      const date = new Date(entry.timestamp);
      const time = date.toLocaleTimeString('en-US', { hour12: false });
      parts.push(`[${time}]`);
    }

    // Add prefix
    if (entry.prefix) {
      parts.push(`[${entry.prefix}]`);
    }

    // Add message
    parts.push(entry.message);

    // Add additional data
    if (entry.data && entry.data.length > 0) {
      parts.push(...entry.data);
    }

    // Output to appropriate console method
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(...parts);
        break;
      case LogLevel.LOG:
        console.log(...parts);
        break;
      case LogLevel.WARN:
        console.warn(...parts);
        if (entry.stack && this.config.enableStackTrace) {
          console.warn(entry.stack);
        }
        break;
      case LogLevel.ERROR:
        console.error(...parts);
        if (entry.stack && this.config.enableStackTrace) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Remote output handler (for sending logs to a server)
   */
  private remoteOutput(entry: LogEntry): void {
    if (!this.config.remoteEndpoint) return;

    // Send to remote endpoint asynchronously
    fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    }).catch(() => {
      // Fail silently to avoid logging loops
    });
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
   * Group logging
   */
  group(label: string): void {
    if (this.config.enableConsole) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.config.enableConsole) {
      console.groupEnd();
    }
  }
}

// Create and export singleton instance
export const Logger = new LoggerService();

// Export default instance
export default Logger;
