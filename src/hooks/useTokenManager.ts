
/**
 * This utility hook manages token caching and validation for the Supabase client.
 * It provides functions to store and retrieve cached tokens with expiration management,
 * reducing unnecessary token requests and improving performance.
 * Enhanced with better debouncing and caching mechanisms to prevent race conditions.
 */

import { useCallback, useRef, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from "@/integrations/supabase/types";

interface TokenCache {
  token: string;
  expiresAt: number;
  verificationResult?: any; // Cache the verification result as well
  lastVerified?: number;
}

interface VerificationRequest {
  token: string;
  timestamp: number;
  promise: Promise<any>;
}

export const useTokenManager = (supabaseClient?: SupabaseClient<Database>) => {
  // Use refs to avoid re-renders when updating the token cache
  const tokenCacheRef = useRef<Record<string, TokenCache>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationAttemptRef = useRef(0);
  const pendingRequestRef = useRef<VerificationRequest | null>(null);
  const MAX_VERIFICATION_ATTEMPTS = 3;
  
  // Verification cooldown - important for preventing race conditions - reduced to allow more responsive state transitions
  const VERIFICATION_COOLDOWN_MS = 1000; // 1 second cooldown between identical requests
  
  // Get token verification result from cache if it's still valid
  const getFromCache = useCallback((token: string) => {
    if (!token) return null;
    
    const now = Date.now();
    const cachedData = tokenCacheRef.current[token];
    
    if (cachedData) {
      // Token is valid if it expires more than 5 minutes from now
      if (cachedData.expiresAt > now + 5 * 60 * 1000) {
        console.log("[useTokenManager]: Using cached token");
        
        // Also check if we have a cached verification result and it's recent enough
        if (cachedData.verificationResult && cachedData.lastVerified && 
            now - cachedData.lastVerified < 60000) { // 60 seconds max age for verification result
          console.log("[useTokenManager]: Using cached verification result");
          return cachedData.verificationResult;
        }
        
        // Token is valid but verification result is outdated or missing
        return { token: cachedData.token };
      }
    }
    return null;
  }, []);

  // Save token and verification result to cache
  const saveToCache = useCallback((token: string, result?: any) => {
    // Validate token before caching
    if (!token) {
      console.warn("[useTokenManager]: Attempted to cache empty token, ignoring");
      return;
    }
    
    try {
      // If we're updating an existing entry
      if (tokenCacheRef.current[token]) {
        // Update the verification result and timestamp if provided
        if (result) {
          tokenCacheRef.current[token] = {
            ...tokenCacheRef.current[token],
            verificationResult: result,
            lastVerified: Date.now()
          };
          console.log("[useTokenManager]: Updated cached verification result");
        }
      } else {
        // Creating a new cache entry
        tokenCacheRef.current[token] = {
          token,
          expiresAt: Date.now() + 45 * 60 * 1000, // 45 min expiry
          ...(result ? { 
            verificationResult: result,
            lastVerified: Date.now()
          } : {})
        };
        console.log("[useTokenManager]: Token cached with expiry at", 
                    new Date(tokenCacheRef.current[token].expiresAt).toISOString());
      }
    } catch (err) {
      console.error("[useTokenManager]: Error saving to cache:", err);
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
    tokenCacheRef.current = {};
    console.log("[useTokenManager]: Token cache cleared");
  }, []);
  
  // Check if a verification request is in progress or recently completed
  const isVerificationInProgress = useCallback((token: string): boolean => {
    const now = Date.now();
    
    // Check if there's a pending request for this token
    if (pendingRequestRef.current && 
        pendingRequestRef.current.token === token && 
        now - pendingRequestRef.current.timestamp < 5000) { // 5 second max age for pending requests
      return true;
    }
    
    // Check if we've recently verified this token (within cooldown period)
    const cachedData = tokenCacheRef.current[token];
    return !!(cachedData && 
             cachedData.lastVerified && 
             now - cachedData.lastVerified < VERIFICATION_COOLDOWN_MS);
  }, []);
  
  // Verify token directly in the database if edge function fails
  const verifyTokenWithDatabase = useCallback(async (token: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase client not initialized");
    }
    
    console.log("[useTokenManager]: Attempting direct database verification");
    
    try {
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
    } catch (error) {
      console.error("[useTokenManager]: Database verification error:", error);
      throw error;
    }
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

    // Check if this token is already being verified or was recently verified
    if (isVerificationInProgress(token)) {
      console.log("[useTokenManager]: Verification already in progress or recently completed for this token");
      
      // If there's a pending request, wait for it to complete rather than starting a new one
      if (pendingRequestRef.current && pendingRequestRef.current.token === token) {
        console.log("[useTokenManager]: Waiting for pending request to complete");
        try {
          const result = await pendingRequestRef.current.promise;
          return result;
        } catch (err) {
          console.error("[useTokenManager]: Error waiting for pending request:", err);
          // Continue with a new request if the pending one failed
        }
      } else {
        // Check if we have a recent cached result
        const cachedResult = getFromCache(token);
        if (cachedResult && cachedResult.verificationResult) {
          console.log("[useTokenManager]: Using cached verification result within cooldown period");
          return cachedResult.verificationResult;
        }
      }
    }
    
    // Check cache first before making a request
    const cachedResult = getFromCache(token);
    if (cachedResult && cachedResult.verificationResult) {
      console.log("[useTokenManager]: Using cached verification result");
      return cachedResult.verificationResult;
    }
    
    verificationAttemptRef.current++;
    setIsVerifying(true);
    setVerificationError(null);
    
    // Create a promise that will be stored in pendingRequestRef
    const verificationPromise = (async () => {
      try {
        console.log("[useTokenManager]: Starting token verification with attempt #", 
                   verificationAttemptRef.current);
        
        // Construct the edge function URL correctly using the project ID
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://jawtwwwelxaaprzsqfyp.supabase.co";
        const projectId = supabaseUrl.match(/\/\/([^.]+)\.supabase\.co/)?.[1] || "jawtwwwelxaaprzsqfyp";
        const edgeFunctionUrl = `https://${projectId}.supabase.co/functions/v1/verify-token`;
        
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
                
                const result = { valid: false, error: "Token expired", expired: true };
                saveToCache(token, result);
                return result;
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
              const dbResult = await verifyTokenWithDatabase(token);
              saveToCache(token, dbResult);
              return dbResult;
            }
            
            // Otherwise, handle as a legitimate error
            setVerificationError(errorMsg);
            setIsVerifying(false);
            
            const result = { valid: false, error: errorMsg };
            saveToCache(token, result);
            return result;
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
            
            const result = { valid: true, entry: data.entry, submitted: true };
            saveToCache(token, result);
            return result;
          }
          
          // Successful verification
          if (data.verified && data.entry) {
            console.log("[useTokenManager]: Token verified successfully");
            setIsVerifying(false);
            verificationAttemptRef.current = 0; // Reset counter on success
            
            const result = { valid: true, entry: data.entry };
            saveToCache(token, result);
            return result;
          }
          
          // Fallback error
          console.error("[useTokenManager]: Unexpected response format:", data);
          const errorMsg = "Oväntat svar från servern";
          setVerificationError(errorMsg);
          setIsVerifying(false);
          
          const result = { valid: false, error: "Unexpected response format" };
          saveToCache(token, result);
          return result;
        } catch (fetchError: any) {
          // Network error or other fetch error - fall back to direct database verification
          console.warn("[useTokenManager]: Edge function fetch error, falling back to direct database:", fetchError);
          try {
            const dbResult = await verifyTokenWithDatabase(token);
            saveToCache(token, dbResult);
            return dbResult;
          } catch (dbError) {
            // If database verification also fails, handle as an error
            console.error("[useTokenManager]: Database verification also failed:", dbError);
            const errorMsg = "Failed to verify token: " + (dbError.message || "Unknown error");
            setVerificationError(errorMsg);
            
            const result = { valid: false, error: errorMsg };
            saveToCache(token, result);
            return result;
          }
        }
        
      } catch (err: any) {
        console.error("[useTokenManager]: Error:", err);
        const errorMsg = err.message || "Ett fel uppstod vid verifiering av token";
        setVerificationError(errorMsg);
        
        const result = { valid: false, error: errorMsg };
        saveToCache(token, result);
        return result;
      } finally {
        // Clear the pending request reference if this was the current one
        if (pendingRequestRef.current && pendingRequestRef.current.token === token) {
          pendingRequestRef.current = null;
        }
        setIsVerifying(false);
      }
    })();
    
    // Store the verification promise so we can avoid duplicate requests
    pendingRequestRef.current = {
      token,
      timestamp: Date.now(),
      promise: verificationPromise
    };
    
    return verificationPromise;
  }, [supabaseClient, verifyTokenWithDatabase, getFromCache, saveToCache, isVerificationInProgress]);
  
  // Reset verification state
  const resetVerification = useCallback(() => {
    console.log("[useTokenManager]: Resetting verification state");
    setIsVerifying(false);
    setVerificationError(null);
    verificationAttemptRef.current = 0; // Reset attempt counter
    pendingRequestRef.current = null;
  }, []);

  return {
    getTokenFromCache: getFromCache,
    saveTokenToCache: saveToCache,
    isValidToken,
    clearTokenCache,
    tokenCacheRef,
    verifyToken,
    isVerifying,
    verificationError,
    resetVerification
  };
};
