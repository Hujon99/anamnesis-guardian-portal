
/**
 * This utility hook manages token caching and validation for the Supabase client.
 * It provides functions to store and retrieve cached tokens with expiration management,
 * reducing unnecessary token requests and improving performance.
 */

import { useCallback, useRef, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from "@/integrations/supabase/types";

interface TokenCache {
  token: string;
  expiresAt: number;
}

export const useTokenManager = (supabaseClient?: SupabaseClient<Database>) => {
  // Use refs to avoid re-renders when updating the token cache
  const tokenCacheRef = useRef<TokenCache | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationAttemptRef = useRef(0);
  const MAX_VERIFICATION_ATTEMPTS = 2;
  
  // Get token from cache if it's still valid
  const getTokenFromCache = useCallback(() => {
    if (!tokenCacheRef.current) return null;
    
    const now = Date.now();
    // Token is valid if it expires more than 5 minutes from now (increased from 2 min)
    if (tokenCacheRef.current.expiresAt > now + 5 * 60 * 1000) {
      console.log("[useTokenManager]: Using cached token");
      return tokenCacheRef.current.token;
    }
    return null;
  }, []);

  // Save token to cache with expiration
  const saveTokenToCache = useCallback((token: string) => {
    // Validate token before caching
    if (!token) {
      console.warn("[useTokenManager]: Attempted to cache empty token, ignoring");
      return;
    }
    
    try {
      // Cache token with 45 min expiry (longer than before)
      tokenCacheRef.current = {
        token,
        expiresAt: Date.now() + 45 * 60 * 1000
      };
      console.log("[useTokenManager]: Token cached with expiry at", new Date(tokenCacheRef.current.expiresAt).toISOString());
    } catch (err) {
      console.error("[useTokenManager]: Error saving token to cache:", err);
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
    console.log("[useTokenManager]: Token cache cleared");
  }, []);
  
  // Verify token with the backend
  const verifyToken = useCallback(async (token: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase client not initialized");
    }
    
    // Check if we've exceeded max attempts
    if (verificationAttemptRef.current >= MAX_VERIFICATION_ATTEMPTS) {
      setVerificationError("För många verifieringsförsök. Vänligen försök igen senare.");
      return { 
        valid: false, 
        error: "För många verifieringsförsök" 
      };
    }
    
    verificationAttemptRef.current++;
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      // Use more reliable technique - fetch from edge function
      const response = await fetch(`${window.location.origin}/functions/v1/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[useTokenManager/verifyToken]: API error:", response.status, errorData);
        
        // Check specifically for expired token
        if (response.status === 403 && errorData.expired) {
          setVerificationError("Åtkomsttokenet har upphört att gälla");
          setIsVerifying(false);
          return { valid: false, error: "Token expired", expired: true };
        }
        
        // Handle other errors
        setVerificationError(`API error: ${response.status} ${errorData.error || response.statusText}`);
        setIsVerifying(false);
        return { valid: false, error: errorData.error || `Error ${response.status}` };
      }
      
      const data = await response.json();
      
      // Handle already submitted case
      if (data.submitted) {
        console.log("[useTokenManager/verifyToken]: Form already submitted");
        setIsVerifying(false);
        return { valid: true, entry: data.entry };
      }
      
      // Successful verification
      if (data.verified && data.entry) {
        console.log("[useTokenManager/verifyToken]: Token verified successfully");
        setIsVerifying(false);
        verificationAttemptRef.current = 0; // Reset counter on success
        return { valid: true, entry: data.entry };
      }
      
      // Fallback error
      console.error("[useTokenManager/verifyToken]: Unexpected response format:", data);
      setVerificationError("Oväntat svar från servern");
      setIsVerifying(false);
      return { valid: false, error: "Unexpected response format" };
      
    } catch (err: any) {
      console.error("[useTokenManager/verifyToken]: Error:", err);
      setVerificationError(err.message || "Ett fel uppstod vid verifiering av token");
      setIsVerifying(false);
      return { valid: false, error: err.message };
    }
  }, [supabaseClient]);
  
  // Reset verification state
  const resetVerification = useCallback(() => {
    setIsVerifying(false);
    setVerificationError(null);
    verificationAttemptRef.current = 0; // Reset attempt counter
  }, []);

  return {
    getTokenFromCache,
    saveTokenToCache,
    isValidToken,
    clearTokenCache,
    tokenCacheRef,
    verifyToken,
    isVerifying,
    verificationError,
    resetVerification
  };
};
