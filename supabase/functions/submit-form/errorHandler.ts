
/**
 * This module provides standardized error handling for the submit-form edge function.
 * It helps create consistent error responses and logs errors appropriately.
 */

import { corsHeaders } from './corsHeaders.ts';
import { ErrorResponse } from './types.ts';
import { Logger } from './logger.ts';

// Define error categories
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  DATABASE = 'DATABASE',
  SERVER = 'SERVER',
}

// Define standard error codes
export enum ErrorCode {
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_DATA = 'MISSING_DATA',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
}

export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Creates a standardized error response
   */
  createErrorResponse(
    message: string,
    details?: string,
    category: ErrorCategory = ErrorCategory.SERVER,
    code: ErrorCode = ErrorCode.SERVER_ERROR,
    status: number = 500
  ): Response {
    // Log the error
    this.logger.error(message, { details, category, code, status });

    // Create the response body
    const errorResponse: ErrorResponse = {
      error: message,
    };

    // Add optional details if provided
    if (details) {
      errorResponse.details = details;
    }

    // Add error code if provided
    if (code) {
      errorResponse.code = code;
    }

    // Return the formatted response
    return new Response(
      JSON.stringify(errorResponse),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  /**
   * Handles validation errors
   */
  validationError(message: string, details?: string): Response {
    return this.createErrorResponse(
      message,
      details,
      ErrorCategory.VALIDATION,
      ErrorCode.INVALID_REQUEST,
      400
    );
  }

  /**
   * Handles authentication errors
   */
  authenticationError(message: string, details?: string): Response {
    return this.createErrorResponse(
      message,
      details,
      ErrorCategory.AUTHENTICATION,
      ErrorCode.INVALID_TOKEN,
      401
    );
  }

  /**
   * Handles database errors
   */
  databaseError(message: string, details?: string): Response {
    return this.createErrorResponse(
      message,
      details,
      ErrorCategory.DATABASE,
      ErrorCode.DATABASE_ERROR,
      500
    );
  }

  /**
   * Handles server errors
   */
  serverError(message: string, details?: string): Response {
    return this.createErrorResponse(
      message,
      details,
      ErrorCategory.SERVER,
      ErrorCode.SERVER_ERROR,
      500
    );
  }

  /**
   * Handles not found errors
   */
  notFoundError(message: string, details?: string): Response {
    return this.createErrorResponse(
      message,
      details,
      ErrorCategory.VALIDATION,
      ErrorCode.INVALID_TOKEN,
      404
    );
  }
}

// Create a default error handler
export const createErrorHandler = (logger: Logger): ErrorHandler => new ErrorHandler(logger);
