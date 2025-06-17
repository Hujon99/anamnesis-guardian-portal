
/**
 * Utility functions for managing optician form tokens in localStorage.
 * Handles token persistence, retrieval, and cleanup operations.
 */

// Constants for localStorage keys
export const DIRECT_FORM_TOKEN_KEY = 'opticianDirectFormToken';
export const DIRECT_FORM_MODE_KEY = 'opticianDirectFormMode';
export const AUTH_RETURN_URL_KEY = 'opticianFormReturnUrl';
export const AUTH_SAVED_TOKEN_KEY = 'opticianFormToken';

export interface TokenInitializationResult {
  token: string | null;
  mode: string;
}

/**
 * Initialize token from URL params or localStorage with priority order:
 * 1. URL params (highest priority)
 * 2. localStorage direct form token
 * 3. localStorage auth saved token
 */
export const initializeToken = (
  initialToken: string | null,
  initialMode: string | null,
  instanceId: string
): TokenInitializationResult => {
  console.log(`[TokenUtils/${instanceId}]: Initializing token (one-time only)...`);
  
  let resultToken = null;
  let resultMode = 'optician'; // Default mode

  if (initialToken) {
    // 1. URL params take highest priority
    console.log(`[TokenUtils/${instanceId}]: Using token from URL params: ${initialToken.substring(0, 6)}...`);
    resultToken = initialToken;
    
    // Also save to localStorage as backup
    localStorage.setItem(DIRECT_FORM_TOKEN_KEY, initialToken);
    
    if (initialMode) {
      resultMode = initialMode;
      localStorage.setItem(DIRECT_FORM_MODE_KEY, initialMode);
    } else {
      localStorage.setItem(DIRECT_FORM_MODE_KEY, 'optician');
    }
  } 
  else {
    // 2. Check localStorage for token
    const storedToken = localStorage.getItem(DIRECT_FORM_TOKEN_KEY);
    
    if (storedToken) {
      console.log(`[TokenUtils/${instanceId}]: Using token from localStorage: ${storedToken.substring(0, 6)}...`);
      resultToken = storedToken;
      
      const storedMode = localStorage.getItem(DIRECT_FORM_MODE_KEY) || 'optician';
      resultMode = storedMode;
    } 
    else {
      // 3. Last resort - check auth-specific localStorage
      const authToken = localStorage.getItem(AUTH_SAVED_TOKEN_KEY);
      
      if (authToken) {
        console.log(`[TokenUtils/${instanceId}]: Using token from auth localStorage: ${authToken.substring(0, 6)}...`);
        resultToken = authToken;
        resultMode = 'optician';
        
        // Clear auth storage to prevent reuse
        localStorage.removeItem(AUTH_SAVED_TOKEN_KEY);
        localStorage.removeItem(AUTH_RETURN_URL_KEY);
        
        // Save to regular localStorage
        localStorage.setItem(DIRECT_FORM_TOKEN_KEY, authToken);
        localStorage.setItem(DIRECT_FORM_MODE_KEY, 'optician');
      }
    }
  }

  return { token: resultToken, mode: resultMode };
};

/**
 * Save authentication context for recovery after login
 */
export const saveAuthContext = (token: string | null): void => {
  const currentUrl = window.location.href;
  localStorage.setItem(AUTH_RETURN_URL_KEY, currentUrl);
  
  if (token) {
    localStorage.setItem(AUTH_SAVED_TOKEN_KEY, token);
  }
};

/**
 * Restore authentication context after login
 */
export const restoreAuthContext = (instanceId: string): TokenInitializationResult | null => {
  const savedUrl = localStorage.getItem(AUTH_RETURN_URL_KEY);
  const savedToken = localStorage.getItem(AUTH_SAVED_TOKEN_KEY);
  
  console.log(`[TokenUtils/${instanceId}]: Checking for saved session data:`, {
    hasSavedUrl: !!savedUrl,
    hasSavedToken: !!savedToken
  });
  
  if (!savedUrl && !savedToken) return null;
  
  console.log(`[TokenUtils/${instanceId}]: Returning from authentication`);
  
  // Clear the stored data
  localStorage.removeItem(AUTH_RETURN_URL_KEY);
  localStorage.removeItem(AUTH_SAVED_TOKEN_KEY);
  
  let returnToken: string | null = null;
  let returnMode: string = "optician";
  
  // Extract parameters from the saved URL if available
  if (savedUrl) {
    try {
      const urlObj = new URL(savedUrl);
      returnToken = urlObj.searchParams.get("token");
      const urlMode = urlObj.searchParams.get("mode");
      if (urlMode) returnMode = urlMode;
    } catch (err) {
      console.error(`[TokenUtils/${instanceId}]: Error parsing saved URL:`, err);
    }
  }
  
  // If we couldn't get the token from URL, use the separately saved token
  if (!returnToken && savedToken) {
    console.log(`[TokenUtils/${instanceId}]: Using saved token from localStorage`);
    returnToken = savedToken;
  }
  
  if (returnToken) {
    // Save to regular localStorage
    localStorage.setItem(DIRECT_FORM_TOKEN_KEY, returnToken);
    localStorage.setItem(DIRECT_FORM_MODE_KEY, returnMode);
  }
  
  return { token: returnToken, mode: returnMode };
};
