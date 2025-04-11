
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
    console.error('Token validation failed: Token is missing');
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
    console.error(`Token validation failed: Token is not a string but ${typeof token}`);
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
    console.error(`Token validation failed: Token length is only ${token.length} characters`);
    return { 
      isValid: false, 
      error: { 
        message: 'Token har ogiltigt format', 
        code: 'invalid_request' 
      } 
    };
  }

  // Log token length and first/last few characters for debugging
  const tokenLength = token.length;
  const tokenPrefix = token.substring(0, 6);
  const tokenSuffix = token.substring(tokenLength - 6);
  console.log(`Token validation passed: Length: ${tokenLength}, Prefix: ${tokenPrefix}..., Suffix: ...${tokenSuffix}`);
  
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
    // Log request method and content type
    console.log(`Request validation: Method: ${request.method}, Content-Type: ${request.headers.get('content-type')}`);
    
    // Check if the token is in the URL query parameters (support both methods for flexibility)
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');
    
    if (queryToken) {
      console.log('Token found in query parameters');
      const tokenValidation = validateToken(queryToken);
      if (tokenValidation.isValid) {
        return { 
          token: queryToken, 
          isValid: true 
        };
      }
    }
    
    // If no token in query params or it's invalid, try the request body
    console.log('No valid token in query params, trying request body...');
    
    // Parse request body as JSON
    const requestData = await request.json();
    console.log('Request data received:', Object.keys(requestData).join(', '));
    
    const token = requestData.token;
    
    // Log token information (safely)
    if (token) {
      const tokenLength = typeof token === 'string' ? token.length : 'not a string';
      console.log(`Extracted token from request body: Length: ${tokenLength}`);
    } else {
      console.error('No token found in request body data');
    }
    
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
    console.error('Error parsing request:', error instanceof Error ? error.message : 'Unknown error');
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
