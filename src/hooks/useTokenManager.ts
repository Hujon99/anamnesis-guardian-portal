
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
  
  // Verify token with the backend
  const verifyToken = useCallback(async (token: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase client not initialized");
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      // Fetch the entry using the token
      const { data: entry, error } = await supabaseClient
        .from("anamnes_entries")
        .select("*")
        .eq("access_token", token)
        .maybeSingle();
      
      if (error) {
        console.error("[useTokenManager/verifyToken]: Database error:", error);
        setVerificationError(`Database error: ${error.message}`);
        setIsVerifying(false);
        return { valid: false, error: error.message };
      }
      
      if (!entry) {
        console.error("[useTokenManager/verifyToken]: Entry not found");
        setVerificationError("Ogiltig åtkomsttoken eller så har formuläret redan skickats in");
        setIsVerifying(false);
        return { valid: false, error: "Ogiltig åtkomsttoken" };
      }
      
      // Check if the entry has expired
      if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
        console.error("[useTokenManager/verifyToken]: Token expired");
        setVerificationError("Åtkomsttokenet har upphört att gälla");
        setIsVerifying(false);
        return { valid: false, error: "Token expired", expired: true };
      }
      
      console.log("[useTokenManager/verifyToken]: Token verified successfully");
      setIsVerifying(false);
      return { valid: true, entry };
      
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
