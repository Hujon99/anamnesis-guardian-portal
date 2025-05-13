
/**
 * This module provides structured logging functionality for the submit-form edge function.
 * It helps with consistent formatting of log messages and includes context information.
 */

import { EntryData } from './types.ts';

export class Logger {
  private context: string;
  private token: string | null = null;
  private entryId: string | null = null;
  private isOptician: boolean | null = null;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Sets token information for contextual logging
   */
  setToken(token: string | null): Logger {
    if (token) {
      this.token = token.substring(0, 6) + '...';
    } else {
      this.token = null;
    }
    return this;
  }

  /**
   * Sets entry information for contextual logging
   */
  setEntry(entry: EntryData | null): Logger {
    if (entry) {
      this.entryId = entry.id;
    } else {
      this.entryId = null;
    }
    return this;
  }

  /**
   * Sets submission type (optician or patient)
   */
  setSubmissionType(isOptician: boolean): Logger {
    this.isOptician = isOptician;
    return this;
  }

  /**
   * Logs an informational message
   */
  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.log('ERROR', message, {
        errorMessage: error.message,
        stack: error.stack,
      });
    } else {
      this.log('ERROR', message, error);
    }
  }

  /**
   * Logs a debug message (for detailed information)
   */
  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  /**
   * Base log method with consistent formatting
   */
  private log(level: string, message: string, data?: any): void {
    const contextInfo = {
      context: this.context,
      token: this.token,
      entryId: this.entryId,
      isOptician: this.isOptician,
    };

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: `[submit-form/${this.context}]: ${message}`,
      ...contextInfo,
      ...(data ? { data: this.safeStringify(data) } : {}),
    };

    console.log(JSON.stringify(logEntry));
  }

  /**
   * Safely converts data to a string, handling circular references
   */
  private safeStringify(obj: any): string {
    if (typeof obj === 'string') return obj;
    
    try {
      const seen = new Set();
      return JSON.stringify(obj, (_, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      }, 2);
    } catch (e) {
      return `[Cannot stringify: ${e instanceof Error ? e.message : String(e)}]`;
    }
  }
}

// Create a default logger instance
export const createLogger = (context: string): Logger => new Logger(context);
