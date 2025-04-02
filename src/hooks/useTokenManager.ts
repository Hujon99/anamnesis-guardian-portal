
/**
 * This utility hook manages token caching and validation for the Supabase client.
 * It provides functions to store and retrieve cached tokens with expiration management,
 * reducing unnecessary token requests and improving performance.
 */

import { useCallback, useRef } from 'react';

interface TokenCache {
  token: string;
  expiresAt: number;
}

export const useTokenManager = () => {
  // Use refs to avoid re-renders when updating the token cache
  const tokenCacheRef = useRef<TokenCache | null>(null);
  
  // Get token from cache if it's still valid
  const getTokenFromCache = useCallback(() => {
    if (!tokenCacheRef.current) return null;
    
    const now = Date.now();
    // Token is valid if it expires more than 5 minutes from now (increased from 2 min)
    if (tokenCacheRef.current.expiresAt > now + 5 * 60 * 1000) {
      console.log("Using cached token");
      return tokenCacheRef.current.token;
    }
    return null;
  }, []);

  // Save token to cache with expiration
  const saveTokenToCache = useCallback((token: string) => {
    // Validate token before caching
    if (!token) {
      console.warn("Attempted to cache empty token, ignoring");
      return;
    }
    
    try {
      // Cache token with 45 min expiry (longer than before)
      tokenCacheRef.current = {
        token,
        expiresAt: Date.now() + 45 * 60 * 1000
      };
      console.log("Token cached with expiry at", new Date(tokenCacheRef.current.expiresAt).toISOString());
    } catch (err) {
      console.error("Error saving token to cache:", err);
    }
  }, []);

  // Validate token format (basic validation only)
  const isValidToken = useCallback((token: string): boolean => {
    if (!token) return false;
    // Basic validation - token should be a non-empty string
    // Could be extended with JWT validation if needed
    return typeof token === 'string' && token.length > 0;
  }, []);

  // Clear token cache
  const clearTokenCache = useCallback(() => {
    tokenCacheRef.current = null;
    console.log("Token cache cleared");
  }, []);

  return {
    getTokenFromCache,
    saveTokenToCache,
    isValidToken,
    clearTokenCache,
    tokenCacheRef
  };
};
