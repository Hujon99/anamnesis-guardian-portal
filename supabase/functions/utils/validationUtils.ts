
/**
 * This utility module provides input validation functions for edge functions.
 * It includes functions for validating tokens, request data, and other input.
 * Enhanced with better logging and improved error handling to help diagnose issues.
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
    
    // Check if the token is in the URL query parameters
    const url = new URL(request.url);
    console.log("Validating request URL:", url.toString());
    console.log("URL path:", url.pathname);
    console.log("URL query parameters:", url.searchParams.toString());
    
    const queryToken = url.searchParams.get('token');
    
    if (queryToken) {
      console.log('Token found in query parameters:', queryToken.substring(0, 6) + '...');
      const tokenValidation = validateToken(queryToken);
      if (tokenValidation.isValid) {
        return { 
          token: queryToken, 
          isValid: true 
        };
      } else {
        console.error('Token from query parameters failed validation:', tokenValidation.error);
      }
    } else {
      console.log('No token found in query parameters, will try request body');
    }
    
    // If no token in query params or it's invalid, try the request body
    // Parse request body as JSON
    // Clone the request to avoid consuming the body which can only be read once
    const requestClone = request.clone();
    let requestData;
    
    try {
      requestData = await requestClone.json();
      console.log('Request body parsed successfully');
    } catch (err) {
      console.log('Could not parse request body as JSON:', err instanceof Error ? err.message : 'Unknown error');
      requestData = {};
    }
      
    console.log('Request data received:', Object.keys(requestData).join(', '));
    
    const token = requestData.token;
    
    // Log token information (safely)
    if (token) {
      const tokenLength = typeof token === 'string' ? token.length : 'not a string';
      console.log(`Extracted token from request body: Length: ${tokenLength}`);
    } else {
      console.log('No token found in request body data');
    }
    
    // Validate token from body
    if (token) {
      const tokenValidation = validateToken(token);
      if (tokenValidation.isValid) {
        return { 
          token,
          isValid: true 
        };
      } else {
        console.error('Token from request body failed validation:', tokenValidation.error);
      }
    }
    
    // If we get here, no valid token was found
    console.error('No valid token found in request');
    return {
      isValid: false,
      error: {
        message: 'Ingen giltig token hittades',
        code: 'missing_token',
        details: 'Token saknas både i URL och i request body'
      }
    };
  } catch (error) {
    // Handle errors
    console.error('Error parsing request:', error instanceof Error ? error.message : 'Unknown error');
    return { 
      isValid: false, 
      error: { 
        message: 'Ogiltig förfrågan, token saknas', 
        code: 'invalid_request',
        details: error instanceof Error ? error.message : 'Error processing request'
      } 
    };
  }
}
