/**
 * This utility hook manages token caching and validation for the Supabase client.
 * It provides functions to store and retrieve cached tokens with expiration management,
 * reducing unnecessary token requests and improving performance.
 * Enhanced with direct database fallback when edge function is unavailable.
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
  const MAX_VERIFICATION_ATTEMPTS = 3; // Increased from 2 to 3
  
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
  
  // Verify token directly in the database if edge function fails
  const verifyTokenWithDatabase = useCallback(async (token: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase client not initialized");
    }
    
    console.log("[useTokenManager]: Attempting direct database verification");
    
    // First get the entry
    const { data: entry, error } = await supabaseClient
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', token)
      .maybeSingle();
    
    if (error) {
      console.error("[useTokenManager/verifyTokenWithDatabase]: Database error:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!entry) {
      console.log("[useTokenManager/verifyTokenWithDatabase]: No entry found");
      return { valid: false, error: "Token not found" };
    }
    
    // Check if the entry has expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      console.log("[useTokenManager/verifyTokenWithDatabase]: Token expired");
      return { valid: false, error: "Token expired", expired: true };
    }
    
    // Check if already submitted
    if (entry.status === 'submitted') {
      return { valid: true, entry, submitted: true };
    }
    
    console.log("[useTokenManager/verifyTokenWithDatabase]: Token verified successfully");
    return { valid: true, entry };
  }, [supabaseClient]);
  
  // Verify token with the edge function, falling back to direct database verification if needed
  const verifyToken = useCallback(async (token: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase client not initialized");
    }
    
    // Check if we've exceeded max attempts
    if (verificationAttemptRef.current >= MAX_VERIFICATION_ATTEMPTS) {
      const errorMsg = "För många verifieringsförsök. Vänligen försök igen senare.";
      setVerificationError(errorMsg);
      console.error("[useTokenManager]: Max verification attempts reached:", MAX_VERIFICATION_ATTEMPTS);
      return { 
        valid: false, 
        error: errorMsg
      };
    }
    
    verificationAttemptRef.current++;
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      console.log("[useTokenManager]: Verifying token with attempt #", verificationAttemptRef.current);
      
      // Construct the edge function URL correctly using the project ID
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://jawtwwwelxaaprzsqfyp.supabase.co";
      const projectId = supabaseUrl.match(/\/\/([^.]+)\.supabase\.co/)?.[1] || "jawtwwwelxaaprzsqfyp";
      const edgeFunctionUrl = `https://${projectId}.supabase.co/functions/v1/verify-token`;
      
      console.log("[useTokenManager]: Using edge function URL:", edgeFunctionUrl);
      
      // Try using the edge function first
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          // If edge function fails, extract the error details
          let errorMsg = `API error: ${response.status} ${response.statusText}`;
          let errorData = null;
          
          try {
            errorData = await response.json();
            console.error("[useTokenManager]: Edge function error:", response.status, errorData);
            
            // Check specifically for expired token
            if (response.status === 403 && errorData.expired) {
              errorMsg = "Åtkomsttokenet har upphört att gälla";
              setVerificationError(errorMsg);
              setIsVerifying(false);
              return { valid: false, error: "Token expired", expired: true };
            }
            
            // Add more details to error message if available
            if (errorData.error) {
              errorMsg = `API error: ${response.status} ${errorData.error}`;
              if (errorData.details) {
                errorMsg += ` - ${errorData.details}`;
              }
            }
          } catch (parseError) {
            // If we can't parse the JSON, just use the status text
            console.error("[useTokenManager]: Failed to parse error response:", parseError);
          }
          
          // If edge function returned 404 (not found) or other server error,
          // fall back to direct database verification
          if (response.status === 404 || response.status >= 500) {
            console.warn("[useTokenManager]: Edge function unavailable, falling back to direct database verification");
            return await verifyTokenWithDatabase(token);
          }
          
          // Otherwise, handle as a legitimate error
          setVerificationError(errorMsg);
          setIsVerifying(false);
          return { valid: false, error: errorMsg };
        }
        
        // Process successful edge function response
        const data = await response.json();
        console.log("[useTokenManager]: Edge function response received:", 
          data.verified ? "Verified" : "Not verified",
          data.submitted ? ", Submitted" : "",
          data.expired ? ", Expired" : ""
        );
        
        // Handle already submitted case
        if (data.submitted) {
          console.log("[useTokenManager]: Form already submitted");
          setIsVerifying(false);
          return { valid: true, entry: data.entry };
        }
        
        // Successful verification
        if (data.verified && data.entry) {
          console.log("[useTokenManager]: Token verified successfully");
          setIsVerifying(false);
          verificationAttemptRef.current = 0; // Reset counter on success
          return { valid: true, entry: data.entry };
        }
        
        // Fallback error
        console.error("[useTokenManager]: Unexpected response format:", data);
        const errorMsg = "Oväntat svar från servern";
        setVerificationError(errorMsg);
        setIsVerifying(false);
        return { valid: false, error: "Unexpected response format" };
      } catch (fetchError: any) {
        // Network error or other fetch error - fall back to direct database verification
        console.warn("[useTokenManager]: Edge function fetch error, falling back to direct database:", fetchError);
        return await verifyTokenWithDatabase(token);
      }
      
    } catch (err: any) {
      console.error("[useTokenManager]: Error:", err);
      const errorMsg = err.message || "Ett fel uppstod vid verifiering av token";
      setVerificationError(errorMsg);
      setIsVerifying(false);
      return { valid: false, error: errorMsg };
    }
  }, [supabaseClient, verifyTokenWithDatabase]);
  
  // Reset verification state
  const resetVerification = useCallback(() => {
    console.log("[useTokenManager]: Resetting verification state");
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
