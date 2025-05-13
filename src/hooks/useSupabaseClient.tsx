
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
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes - reduced from 20
const TOKEN_COOLDOWN_PERIOD = 5000; // 5 seconds cooldown - reduced from 10
const TOKEN_EARLY_REFRESH = 10 * 60 * 1000; // Refresh 10 minutes before expiry
const MAX_RETRIES = 3; // Increased max retries from 2
const INITIAL_RETRY_DELAY = 1000; // 1 second initial delay - reduced for quicker recovery

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
      
      // Check if token is still valid with buffer time for early refresh
      if (cacheRef.current.expiresAt > now + TOKEN_EARLY_REFRESH) {
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
    isExpiringSoon: () => {
      if (!cacheRef.current) return true;
      const now = Date.now();
      // Consider token as "expiring soon" if less than 10 minutes left
      return cacheRef.current.expiresAt - now < TOKEN_EARLY_REFRESH;
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
  const healthCheckTimeRef = useRef<number>(0);
  
  // Create local token cache
  const tokenCache = getTokenCache();

  // Get token with debouncing, caching and retry logic
  const getTokenWithRetry = useCallback(async (force = false): Promise<string | null> => {
    if (!session) return null;
    
    // Check cooldown period to prevent excessive requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastTokenTimeRef.current;
    
    if (!force && timeSinceLastRequest < TOKEN_COOLDOWN_PERIOD) {
      console.log(`Token request debounced (${timeSinceLastRequest}ms < ${TOKEN_COOLDOWN_PERIOD}ms cooldown)`);
      pendingRefreshRef.current = true;
      return lastTokenRef.current;
    }
    
    // Check token cache first if not forcing refresh
    if (!force) {
      const cachedToken = tokenCache.get();
      if (cachedToken) {
        return cachedToken;
      }
    }
    
    let retryCount = 0;
    let retryDelay = INITIAL_RETRY_DELAY;

    while (retryCount <= MAX_RETRIES) {
      try {
        console.log(`Requesting new token from Clerk (attempt ${retryCount + 1})`);
        lastTokenTimeRef.current = now;
        pendingRefreshRef.current = false;
        
        const token = await session.getToken();
        retryCountRef.current = 0; // Reset on success
        
        // Cache the token
        if (token) {
          tokenCache.set(token);
          console.log(`Token successfully retrieved and cached (${token.substring(0, 10)}...)`);
        }
        
        return token;
      } catch (err) {
        console.warn(`Token fetch attempt ${retryCount + 1} failed:`, err);
        retryCount++;
        
        if (retryCount > MAX_RETRIES) {
          throw err;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay = Math.min(retryDelay * 2, 10000); // Cap at 10 seconds
      }
    }
    
    return null;
  }, [session]);

  // Create authenticated Supabase client
  const createAuthenticatedClient = useCallback(async (token: string) => {
    if (token === lastTokenRef.current && initialized.current) {
      return; // Skip if token hasn't changed
    }
    
    console.log("Creating new Supabase client with updated token");
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
      }

      // Mark client as ready
      setIsReady(true);
      
      // Update health check timestamp
      healthCheckTimeRef.current = Date.now();
    } catch (err) {
      console.error("Error setting up Supabase client with Clerk session token:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Show toast only on critical failures after retries
      if (retryCountRef.current >= MAX_RETRIES) {
        toast({
          title: "Autentiseringsfel",
          description: "Ett problem uppstod med din inloggning. Vänligen ladda om sidan.",
          variant: "destructive",
        });
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
        }, TOKEN_COOLDOWN_PERIOD); 
      }
    }
  }, [isAuthLoaded, userId, session, getTokenWithRetry, createAuthenticatedClient]);

  // Health check function - verify if token is still valid
  // Returns true if token is healthy, false if refresh needed
  const checkTokenHealth = useCallback(async (): Promise<boolean> => {
    // If not authenticated or no session, cannot check health
    if (!userId || !session) {
      return false;
    }
    
    // If token is expiring soon or last health check was too long ago, refresh
    const tokenExpiringSoon = tokenCache.isExpiringSoon();
    const timeSinceLastHealthCheck = Date.now() - healthCheckTimeRef.current;
    const needsRefresh = tokenExpiringSoon || timeSinceLastHealthCheck > TOKEN_REFRESH_INTERVAL;
    
    if (needsRefresh) {
      console.log(`Token health check: refresh needed (expiring soon: ${tokenExpiringSoon}, time since last check: ${timeSinceLastHealthCheck}ms)`);
      return false;
    }
    
    return true;
  }, [userId, session]);

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
        setupClient();
      }, TOKEN_REFRESH_INTERVAL);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthLoaded, userId, session, setupClient]);

  // Pre-request token validation
  // This ensures the token is valid before making any critical request
  const validateTokenBeforeRequest = useCallback(async (forceRefresh = false) => {
    // If token is healthy and we're not forcing a refresh, proceed
    const isHealthy = await checkTokenHealth();
    if (isHealthy && !forceRefresh) {
      return true;
    }
    
    // Token needs refresh
    console.log("Pre-request validation: refreshing token");
    await setupClient(true);
    return true;
  }, [checkTokenHealth, setupClient]);

  // Expose a manual refresh method for components to use with force option
  const refreshClient = useCallback(async (force = false) => {
    return setupClient(force);
  }, [setupClient]);

  return { 
    supabase: authenticatedClient, 
    isLoading, 
    error,
    isReady, 
    refreshClient,
    validateTokenBeforeRequest // New function to validate token before critical operations
  };
};
