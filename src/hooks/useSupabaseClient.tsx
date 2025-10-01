/**
 * This file defines a custom React hook, `useSupabaseClient`, that provides an authenticated 
 * Supabase client with dynamic JWT token refresh. It uses a token provider pattern to inject 
 * fresh tokens for each request, eliminating "JWT expired" errors and improving user experience.
 * The client automatically retries failed requests once with a fresh token.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { createSupabaseClient } from "@/utils/supabaseClientUtils";
import { Database } from "@/integrations/supabase/types";
import { SupabaseClient } from "@supabase/supabase-js";

// Configuration constants
const TOKEN_CACHE_TTL = 30 * 1000; // 30 seconds cache TTL for tokens
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

/**
 * Lightweight token cache with JWT expiry respect
 */
const getTokenCache = () => {
  const cache = {
    token: null as string | null,
    expiresAt: 0,
    get: () => {
      const now = Date.now();
      if (cache.token && cache.expiresAt > now) {
        return cache.token;
      }
      return null;
    },
    set: (token: string) => {
      cache.token = token;
      
      // Try to decode JWT to get the actual expiry
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp) {
          // Use JWT exp minus 30 seconds buffer
          cache.expiresAt = (payload.exp * 1000) - 30000;
        } else {
          // Fallback to short TTL
          cache.expiresAt = Date.now() + TOKEN_CACHE_TTL;
        }
      } catch {
        // Fallback to short TTL if JWT parsing fails
        cache.expiresAt = Date.now() + TOKEN_CACHE_TTL;
      }
    },
    clear: () => {
      cache.token = null;
      cache.expiresAt = 0;
    }
  };
  
  return cache;
};

export const useSupabaseClient = () => {
  const { getToken, isSignedIn, userId } = useAuth();
  const clerk = useClerk();
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for managing token cache and setup
  const tokenCache = useRef(getTokenCache());
  const setupPromiseRef = useRef<Promise<void> | null>(null);
  const isSettingUpRef = useRef(false);

  /**
   * Token provider function that returns a fresh token with caching
   */
  const tokenProvider = useCallback(async (): Promise<string | null> => {
    console.log("[tokenProvider] Called");
    console.log("[tokenProvider] isSignedIn:", isSignedIn);
    console.log("[tokenProvider] userId:", userId);
    console.log("[tokenProvider] hasGetToken:", !!getToken);
    
    if (!isSignedIn || !getToken) {
      console.warn("[tokenProvider] User not signed in or getToken not available");
      return null;
    }

    // Check cache first
    const cachedToken = tokenCache.current.get();
    if (cachedToken) {
      console.log("[tokenProvider] Using cached token, length:", cachedToken.length);
      return cachedToken;
    }

    console.log("[tokenProvider] No cached token, fetching fresh token from Clerk");
    
    // Get fresh token with retry logic
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[tokenProvider] Attempt ${attempt}/${MAX_RETRIES} - Calling getToken()`);
        
        // Try with supabase template first, fallback to default if it doesn't exist
        let token;
        try {
          console.log("[tokenProvider] Trying with 'supabase' template");
          token = await getToken({ template: "supabase" });
          console.log("[tokenProvider] Token from template:", token ? `length=${token.length}` : "null");
        } catch (templateError) {
          console.log("[tokenProvider] Supabase template not found, using default");
          token = await getToken();
          console.log("[tokenProvider] Token from default:", token ? `length=${token.length}` : "null");
        }
        
        if (token) {
          console.log("[tokenProvider] ✓ Fresh token retrieved successfully");
          console.log("[tokenProvider] Token prefix:", token.substring(0, 20) + "...");
          
          // Decode and log payload for debugging
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log("[tokenProvider] JWT payload decoded:", {
              sub: payload.sub,
              org_id: payload.org_id,
              email: payload.email,
              exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
              iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'none'
            });
          } catch (decodeError) {
            console.error("[tokenProvider] Failed to decode JWT:", decodeError);
          }
          
          tokenCache.current.set(token);
          return token;
        } else {
          console.warn(`[tokenProvider] Attempt ${attempt}: getToken returned null/empty`);
        }
      } catch (error) {
        console.error(`[tokenProvider] Attempt ${attempt} failed with error:`, error);
        
        if (attempt === MAX_RETRIES) {
          console.error("[tokenProvider] All retry attempts exhausted");
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`[tokenProvider] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error("[tokenProvider] Failed to get token after all retries");
    return null;
  }, [isSignedIn, getToken, userId]);

  /**
   * Create authenticated or unauthenticated Supabase client
   */
  const createAuthenticatedClient = useCallback(() => {
    if (isSignedIn) {
      console.log("[useSupabaseClient] Creating authenticated client with token provider");
      return createSupabaseClient(tokenProvider);
    } else {
      console.log("[useSupabaseClient] Creating unauthenticated client");
      return createSupabaseClient(); // No token provider for unauthenticated
    }
  }, [isSignedIn, tokenProvider]);

  /**
   * Set up the Supabase client with dynamic token provider
   */
  const setupClient = useCallback(async (force = false) => {
    if (isSettingUpRef.current && !force) {
      console.log("[useSupabaseClient] Setup already in progress, waiting...");
      if (setupPromiseRef.current) {
        await setupPromiseRef.current;
        return;
      }
    }

    console.log("[useSupabaseClient] Setting up Supabase client" + (force ? " (forced)" : ""));
    
    isSettingUpRef.current = true;
    setIsLoading(true);
    setError(null);

    const setupPromise = (async () => {
      try {
        if (isSignedIn) {
          // For authenticated users, test token provider
          const testToken = await tokenProvider();
          if (!testToken) {
            throw new Error("Kunde inte hämta åtkomsttoken");
          }
          console.log("[useSupabaseClient] Client setup complete with token provider");
        } else {
          console.log("[useSupabaseClient] Client setup complete without authentication");
        }

        const newClient = createAuthenticatedClient();
        setClient(newClient);
      } catch (err) {
        console.error("[useSupabaseClient] Setup failed:", err);
        const errorMessage = err instanceof Error ? err.message : "Okänt fel uppstod";
        setError(`Kunde inte konfigurera databasanslutning: ${errorMessage}`);
        setClient(null);
      } finally {
        setIsLoading(false);
        isSettingUpRef.current = false;
        setupPromiseRef.current = null;
      }
    })();

    setupPromiseRef.current = setupPromise;
    await setupPromise;
  }, [isSignedIn, tokenProvider, createAuthenticatedClient]);

  /**
   * Handle JWT errors by clearing cache and refreshing
   */
  const handleJwtError = useCallback(async () => {
    console.log("[useSupabaseClient] Handling JWT error, clearing token cache");
    tokenCache.current.clear();
  }, []);

  /**
   * Refresh the Supabase client (mainly for external calls)
   */
  const refreshClient = useCallback(async (force = false) => {
    console.log("[useSupabaseClient] Refreshing client" + (force ? " (forced)" : ""));
    
    if (force) {
      tokenCache.current.clear();
    }
    
    await setupClient(force);
  }, [setupClient]);

  // Set up client when authentication state changes or on mount
  useEffect(() => {
    console.log("[useSupabaseClient] Auth state changed:", { isSignedIn, userId });
    setupClient();
  }, [isSignedIn, userId, setupClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tokenCache.current.clear();
    };
  }, []);

  return {
    supabase: client,
    isLoading,
    error,
    isReady: !!client && !isLoading,
    refreshClient,
    handleJwtError
  };
};