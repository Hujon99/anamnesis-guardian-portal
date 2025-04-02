
/**
 * This utility module provides standardized response handling for edge functions.
 * It includes functions for creating consistent response objects, error handling,
 * and CORS headers to ensure proper cross-origin requests.
 */

// Standard CORS headers for cross-origin requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standard response types
export type ApiErrorCode = 
  | 'invalid_request' 
  | 'invalid_token' 
  | 'expired' 
  | 'invalid_status' 
  | 'already_submitted' 
  | 'config_error' 
  | 'form_error' 
  | 'missing_form' 
  | 'missing_org' 
  | 'server_error';

// Interface for error response structure
export interface ApiErrorResponse {
  error: string;
  details?: string;
  code: ApiErrorCode;
  status?: string;
}

// Interface for success response structure
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Creates a standardized success response
 * @param data The data to include in the response
 * @param status HTTP status code (default: 200)
 * @returns Response object with standardized structure
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  return new Response(
    JSON.stringify({ 
      success: true, 
      ...data
    }),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Creates a standardized error response
 * @param message User-friendly error message
 * @param code Error code for client-side handling
 * @param status HTTP status code
 * @param details Additional error details (not shown to users)
 * @param metadata Any additional metadata to include
 * @returns Response object with standardized structure
 */
export function createErrorResponse(
  message: string, 
  code: ApiErrorCode, 
  status = 400, 
  details?: string,
  metadata?: Record<string, any>
): Response {
  return new Response(
    JSON.stringify({ 
      error: message, 
      code,
      ...(details ? { details } : {}),
      ...(metadata || {})
    }),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handles CORS preflight requests
 * @param request The incoming request
 * @returns Response for OPTIONS requests or null for other methods
 */
export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Logs the start of a function execution
 * @param functionName Name of the function
 * @param version Version string
 * @param request Request object
 */
export function logFunctionStart(functionName: string, version: string, request: Request): void {
  console.log(`Starting ${functionName} function - ${version}`);
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
}

/**
 * Handles and logs unexpected errors
 * @param error The error object
 * @param context Additional context for the error
 * @returns Standardized error response
 */
export function handleUnexpectedError(error: Error, context?: string): Response {
  const errorMessage = `Unexpected error${context ? ` in ${context}` : ''}: ${error.message}`;
  console.error(errorMessage);
  console.error(error.stack);
  
  return createErrorResponse(
    'Ett oväntat fel uppstod', 
    'server_error',
    500,
    error.message
  );
}
