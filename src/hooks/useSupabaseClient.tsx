
/**
 * This hook provides a Supabase client authenticated with the current Clerk session.
 * It handles token management, client creation, and authentication state synchronization.
 * The hook implements caching, debouncing, and retry mechanisms to optimize performance
 * and reduce unnecessary API calls.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { Database } from "@/integrations/supabase/types";
import { supabase as supabaseClient, debugSupabaseAuth } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { createSupabaseClient } from "@/utils/supabaseClientUtils";

// Configuration
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes - reduced from 15
const TOKEN_COOLDOWN_PERIOD = 3000; // 3 seconds cooldown - reduced from 5
const TOKEN_EARLY_REFRESH = 5 * 60 * 1000; // Refresh 5 minutes before expiry - reduced from 10
const MAX_RETRIES = 4; // Increased max retries from 3
const INITIAL_RETRY_DELAY = 800; // 800ms initial delay - reduced for quicker recovery

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
      // Consider token as "expiring soon" if less than the early refresh window
      return cacheRef.current.expiresAt - now < TOKEN_EARLY_REFRESH;
    },
    getExpiry: () => {
      return cacheRef.current?.expiresAt || null;
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

  // Enhanced logging and debugging for token fetching
  const getTokenWithRetry = useCallback(async (force = false): Promise<string | null> => {
    if (!session) {
      console.log("No session available for token fetch");
      return null;
    }
    
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
        const expiryTime = new Date(tokenCache.getExpiry() || 0).toISOString();
        console.log(`Using cached token (expires: ${expiryTime})`);
        return cachedToken;
      }
    }
    
    console.log(`Fetching new token (force=${force})`);
    
    let retryCount = 0;
    let retryDelay = INITIAL_RETRY_DELAY;

    while (retryCount <= MAX_RETRIES) {
      try {
        console.log(`Requesting new token from Clerk (attempt ${retryCount + 1})`);
        lastTokenTimeRef.current = now;
        pendingRefreshRef.current = false;
        
        const token = await session.getToken({
          template: "supabase"
        });
        
        retryCountRef.current = 0; // Reset on success
        
        // Cache the token
        if (token) {
          tokenCache.set(token);
          const tokenPreview = token.substring(0, 10) + "...";
          console.log(`Token successfully retrieved and cached: ${tokenPreview}`);
        } else {
          console.warn("Clerk returned null token");
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
        retryDelay = Math.min(retryDelay * 2, 5000); // Cap at 5 seconds (reduced from 10s)
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
        console.log("No user or session, using unauthenticated client");
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
        console.warn("Failed to get token, using unauthenticated client");
        setAuthenticatedClient(supabaseClient);
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
      
      // If there's a pending refresh request, process it after a short delay
      if (pendingRefreshRef.current) {
        setTimeout(() => {
          if (pendingRefreshRef.current) {
            setupClient();
          }
        }, TOKEN_COOLDOWN_PERIOD); 
      }
    }
  }, [isAuthLoaded, userId, session, getTokenWithRetry, createAuthenticatedClient]);

  // Improved health check function with detailed logging
  const checkTokenHealth = useCallback(async (): Promise<boolean> => {
    // If not authenticated or no session, cannot check health
    if (!userId || !session) {
      console.log("Token health check: No user or session");
      return false;
    }
    
    // Check if token is expiring soon or last health check was too long ago
    const tokenExpiringSoon = tokenCache.isExpiringSoon();
    const timeSinceLastHealthCheck = Date.now() - healthCheckTimeRef.current;
    const needsRefresh = tokenExpiringSoon || timeSinceLastHealthCheck > TOKEN_REFRESH_INTERVAL;
    
    if (needsRefresh) {
      const expiresAt = tokenCache.getExpiry() ? new Date(tokenCache.getExpiry()!).toISOString() : "unknown";
      console.log(`Token health check: Refresh needed (expiring soon: ${tokenExpiringSoon}, expires at: ${expiresAt}, time since last check: ${timeSinceLastHealthCheck / 1000}s)`);
      return false;
    }
    
    return true;
  }, [userId, session]);

  // Setup auth listener and interval-based refresh
  useEffect(() => {
    // Setup client immediately
    setupClient();
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Set up token refresh interval (more frequent now)
    if (session) {
      intervalRef.current = window.setInterval(() => {
        console.log("Interval token refresh triggered");
        setupClient();
      }, TOKEN_REFRESH_INTERVAL);
      
      // Also refresh on tab focus using Page Visibility API
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log("Tab focus detected, checking token");
          checkTokenHealth().then(isHealthy => {
            if (!isHealthy) {
              console.log("Token requires refresh on tab focus");
              setupClient(true);
            }
          });
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthLoaded, userId, session, setupClient, checkTokenHealth]);

  // Enhanced pre-request token validation with detailed logging
  const validateTokenBeforeRequest = useCallback(async (forceRefresh = false) => {
    // Use debugSupabaseAuth to show current token state
    await debugSupabaseAuth().catch(err => {
      console.error("Debug auth check failed:", err);
    });
    
    // Check token health
    const isHealthy = await checkTokenHealth();
    if (isHealthy && !forceRefresh) {
      console.log("Pre-request validation: Token is healthy");
      return true;
    }
    
    // Token needs refresh
    console.log(`Pre-request validation: Refreshing token (force=${forceRefresh})`);
    await setupClient(true);
    
    // Verify refresh worked
    const verifyHealthy = await checkTokenHealth();
    if (!verifyHealthy) {
      console.warn("Token still unhealthy after refresh");
    }
    
    return true;
  }, [checkTokenHealth, setupClient]);

  // Force refresh method with detailed logging
  const refreshClient = useCallback(async (force = false) => {
    console.log(`Manual client refresh requested (force=${force})`);
    await setupClient(force);
    
    // Verify the refresh worked
    const healthy = await checkTokenHealth();
    console.log(`Refresh complete, token health: ${healthy ? 'good' : 'needs attention'}`);
    
    return healthy;
  }, [setupClient, checkTokenHealth]);

  return { 
    supabase: authenticatedClient, 
    isLoading, 
    error,
    isReady, 
    refreshClient,
    validateTokenBeforeRequest
  };
};
