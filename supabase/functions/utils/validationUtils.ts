
/**
 * This utility module provides input validation functions for edge functions.
 * It includes functions for validating tokens, request data, and other input.
 */

/**
 * Validates a token string
 * @param token The token to validate
 * @returns Object containing isValid and optional error information
 */
export function validateToken(token: unknown): { 
  isValid: boolean; 
  error?: { message: string; code: string } 
} {
  // Check if token exists
  if (!token) {
    return { 
      isValid: false, 
      error: { 
        message: 'Token är obligatorisk', 
        code: 'invalid_request' 
      } 
    };
  }
  
  // Check if token is a string
  if (typeof token !== 'string') {
    return { 
      isValid: false, 
      error: { 
        message: 'Token måste vara en textsträng', 
        code: 'invalid_request' 
      } 
    };
  }
  
  // Check if token has valid length (minimum 6 characters)
  if (token.length < 6) {
    return { 
      isValid: false, 
      error: { 
        message: 'Token har ogiltigt format', 
        code: 'invalid_request' 
      } 
    };
  }
  
  // Token passes all validation
  return { isValid: true };
}

/**
 * Validates request data and extracts token
 * @param request The incoming request object
 * @returns Object containing the validated token and success status
 */
export async function validateRequestAndExtractToken(request: Request): Promise<{ 
  token?: string; 
  isValid: boolean; 
  error?: { message: string; code: string; details?: string } 
}> {
  try {
    // Parse request body as JSON
    const requestData = await request.json();
    const token = requestData.token;
    
    // Validate token
    const tokenValidation = validateToken(token);
    if (!tokenValidation.isValid) {
      return { 
        isValid: false, 
        error: tokenValidation.error 
      };
    }
    
    // Return validated token
    return { 
      token, 
      isValid: true 
    };
  } catch (error) {
    // Handle JSON parsing errors
    return { 
      isValid: false, 
      error: { 
        message: 'Ogiltig förfrågan, token saknas', 
        code: 'invalid_request',
        details: error instanceof Error ? error.message : 'JSON parse error'
      } 
    };
  }
}
