
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
const TOKEN_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes - reduced frequency
const TOKEN_COOLDOWN_PERIOD = 10000; // 10 seconds cooldown between token requests (increased)
const MAX_RETRIES = 2; // Reduced max retries
const INITIAL_RETRY_DELAY = 2000; // 2 seconds initial delay (increased)

// Helper function for token caching (moved from useTokenManager)
const getTokenCache = () => {
  const cacheRef = useRef<{
    token: string;
    expiresAt: number;
  } | null>(null);
  
  return {
    get: () => {
      if (!cacheRef.current) return null;
      const now = Date.now();
      if (cacheRef.current.expiresAt > now + 5 * 60 * 1000) {
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

    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`Requesting new token from Clerk (attempt ${retryCount + 1})`);
        lastTokenTimeRef.current = now;
        pendingRefreshRef.current = false;
        
        const token = await session.getToken();
        retryCountRef.current = 0; // Reset on success
        
        // Cache the token
        if (token) {
          tokenCache.set(token);
        }
        
        return token;
      } catch (err) {
        console.warn(`Token fetch attempt ${retryCount + 1} failed:`, err);
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
      
      // If there's a pending refresh request, process it after a longer delay
      if (pendingRefreshRef.current) {
        setTimeout(() => {
          if (pendingRefreshRef.current) {
            setupClient();
          }
        }, TOKEN_COOLDOWN_PERIOD * 2); // Use a longer delay for pending refreshes
      }
    }
  }, [isAuthLoaded, userId, session, getTokenWithRetry, createAuthenticatedClient]);

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

  // Expose a manual refresh method for components to use with force option
  const refreshClient = useCallback((force = false) => {
    return setupClient(force);
  }, [setupClient]);

  return { 
    supabase: authenticatedClient, 
    isLoading, 
    error,
    isReady, // New state to indicate client is fully initialized
    refreshClient // Expose refresh method with force option
  };
};
