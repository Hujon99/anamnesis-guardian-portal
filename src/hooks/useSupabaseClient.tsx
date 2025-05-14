
/**
 * This hook provides a Supabase client authenticated with the current Clerk session.
 * It handles token management, client creation, and authentication state synchronization.
 * The hook implements caching, debouncing, and retry mechanisms to optimize performance
 * and reduce unnecessary API calls.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { Database } from "@/integrations/supabase/types";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { createSupabaseClient } from "@/utils/supabaseClientUtils";

// Configuration
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes - more frequent refreshes
const TOKEN_COOLDOWN_PERIOD = 5000; // 5 seconds cooldown between token requests (reduced from 10s)
const TOKEN_EXPIRY_BUFFER = 10 * 60 * 1000; // 10 minutes before expiry
const MAX_RETRIES = 3; // Increased max retries
const INITIAL_RETRY_DELAY = 1000; // 1 second initial delay (reduced)

// Helper function for token caching
const getTokenCache = () => {
  const cacheRef = useRef<{
    token: string;
    expiresAt: number;
  } | null>(null);
  
  return {
    get: () => {
      if (!cacheRef.current) return null;
      const now = Date.now();
      // Return cached token only if it's not nearing expiry (buffer time)
      if (cacheRef.current.expiresAt > now + TOKEN_EXPIRY_BUFFER) {
        return cacheRef.current.token;
      }
      return null;
    },
    set: (token: string) => {
      if (!token) return;
      cacheRef.current = {
        token,
        expiresAt: Date.now() + 45 * 60 * 1000
      };
    },
    clear: () => {
      cacheRef.current = null;
    },
    isNearExpiry: () => {
      if (!cacheRef.current) return true;
      const now = Date.now();
      // Check if token is nearing expiry
      return cacheRef.current.expiresAt - now < TOKEN_EXPIRY_BUFFER;
    }
  };
};

/**
 * A hook that provides a Supabase client authenticated with the current Clerk session
 */
export const useSupabaseClient = () => {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { session } = useClerk();
  const [authenticatedClient, setAuthenticatedClient] = useState(supabaseClient);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Use refs to track state without causing re-renders
  const initialized = useRef(false);
  const lastTokenRef = useRef<string | null>(null);
  const lastTokenTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const jwtExpiryWarningShown = useRef(false);
  
  // Create local token cache
  const tokenCache = getTokenCache();

  // Get token with debouncing, caching and retry logic
  const getTokenWithRetry = useCallback(async (force = false): Promise<string | null> => {
    if (!session) return null;
    
    // Always refresh if we're approaching expiry
    const shouldRefreshDueToExpiry = tokenCache.isNearExpiry();
    
    // Check cooldown period to prevent excessive requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastTokenTimeRef.current;
    
    if (!force && !shouldRefreshDueToExpiry && timeSinceLastRequest < TOKEN_COOLDOWN_PERIOD) {
      console.log(`[useSupabaseClient] Token request debounced (${timeSinceLastRequest}ms < ${TOKEN_COOLDOWN_PERIOD}ms cooldown)`);
      pendingRefreshRef.current = true;
      return lastTokenRef.current;
    }
    
    // Check token cache first if not forcing refresh and not near expiry
    if (!force && !shouldRefreshDueToExpiry) {
      const cachedToken = tokenCache.get();
      if (cachedToken) {
        return cachedToken;
      }
    }
    
    let retryCount = 0;
    let retryDelay = INITIAL_RETRY_DELAY;

    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`[useSupabaseClient] Requesting new token from Clerk (attempt ${retryCount + 1})`);
        lastTokenTimeRef.current = now;
        pendingRefreshRef.current = false;
        
        const token = await session.getToken();
        retryCountRef.current = 0; // Reset on success
        
        // Reset JWT expiry warning flag when we successfully get a new token
        jwtExpiryWarningShown.current = false;
        
        // Cache the token
        if (token) {
          tokenCache.set(token);
          console.log("[useSupabaseClient] New token successfully obtained and cached");
        }
        
        return token;
      } catch (err) {
        console.warn(`[useSupabaseClient] Token fetch attempt ${retryCount + 1} failed:`, err);
        retryCount++;
        
        if (retryCount >= MAX_RETRIES) {
          throw err;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // Double the delay for next retry
      }
    }
    
    return null;
  }, [session]);

  // Create authenticated Supabase client
  const createAuthenticatedClient = useCallback(async (token: string) => {
    if (token === lastTokenRef.current && initialized.current) {
      return; // Skip if token hasn't changed
    }
    
    console.log("[useSupabaseClient] Creating new Supabase client with updated token");
    lastTokenRef.current = token;
    
    const client = createSupabaseClient(token);
    setAuthenticatedClient(client);
    initialized.current = true;
  }, []);

  // Setup authenticated client
  const setupClient = useCallback(async (force = false) => {
    // Skip if auth not loaded
    if (!isAuthLoaded) {
      return;
    }
    
    // Don't run multiple refreshes in parallel unless forced
    if (isRefreshingRef.current && !force) {
      pendingRefreshRef.current = true;
      return;
    }
    
    isRefreshingRef.current = true;
    
    try {
      setIsLoading(true);
      
      if (!userId || !session) {
        // Return the unauthenticated client if no user is logged in
        setAuthenticatedClient(supabaseClient);
        initialized.current = false;
        lastTokenRef.current = null;
        isRefreshingRef.current = false;
        pendingRefreshRef.current = false;
        setIsLoading(false);
        setIsReady(true);
        return;
      }
      
      // Get the token with retry logic
      const token = await getTokenWithRetry(force);
      
      if (token) {
        await createAuthenticatedClient(token);
      } else {
        console.warn("[useSupabaseClient] No token obtained after attempts");
      }

      // Mark client as ready
      setIsReady(true);
    } catch (err) {
      console.error("[useSupabaseClient] Error setting up Supabase client:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Show toast only on critical failures after retries
      if (retryCountRef.current >= MAX_RETRIES) {
        // Only show JWT expiry warning once to avoid spamming users
        if (!jwtExpiryWarningShown.current) {
          toast({
            title: "Sessionen har löpt ut",
            description: "Din inloggning har upphört. Ladda om sidan för att fortsätta.",
            variant: "destructive",
          });
          jwtExpiryWarningShown.current = true;
        }
      }
      
      retryCountRef.current++;
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
      
      // If there's a pending refresh request, process it after a delay
      if (pendingRefreshRef.current) {
        setTimeout(() => {
          if (pendingRefreshRef.current) {
            setupClient();
          }
        }, TOKEN_COOLDOWN_PERIOD); // Use standard delay for pending refreshes
      }
    }
  }, [isAuthLoaded, userId, session, getTokenWithRetry, createAuthenticatedClient]);

  // Handle JWT expiry errors during requests
  const handleJwtError = useCallback(async () => {
    console.log("[useSupabaseClient] Handling JWT error, initiating forced refresh");
    // Force a client refresh to get a new token
    await setupClient(true);
    return true;
  }, [setupClient]);

  // Setup auth listener and initial check
  useEffect(() => {
    // Setup client immediately
    setupClient();
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Set up token refresh interval only if we have a session
    if (session) {
      intervalRef.current = window.setInterval(() => {
        if (tokenCache.isNearExpiry()) {
          console.log("[useSupabaseClient] Token nearing expiry, refreshing proactively");
          setupClient(true); // Force refresh when nearing expiry
        } else {
          setupClient();
        }
      }, TOKEN_REFRESH_INTERVAL);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthLoaded, userId, session, setupClient]);

  // Expose a manual refresh method for components to use with force option
  const refreshClient = useCallback(async (force = false) => {
    console.log(`[useSupabaseClient] Manual refresh requested (force=${force})`);
    return setupClient(force);
  }, [setupClient]);

  return { 
    supabase: authenticatedClient, 
    isLoading, 
    error,
    isReady, 
    refreshClient, 
    handleJwtError // New exposed method to handle JWT errors
  };
};
