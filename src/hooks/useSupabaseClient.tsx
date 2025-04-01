
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

// Configuration
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes - reduced frequency
const TOKEN_COOLDOWN_PERIOD = 5000; // 5 seconds cooldown between token requests
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * A hook that provides a Supabase client authenticated with the current Clerk session
 */
export const useSupabaseClient = () => {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { session } = useClerk();
  const [authenticatedClient, setAuthenticatedClient] = useState(supabaseClient);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use refs to track state without causing re-renders
  const initialized = useRef(false);
  const lastTokenRef = useRef<string | null>(null);
  const lastTokenTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(null);

  // New token cache implementation
  const getTokenFromCache = useCallback(() => {
    if (!tokenCacheRef.current) return null;
    
    const now = Date.now();
    // Token is valid if it expires more than 2 minutes from now
    if (tokenCacheRef.current.expiresAt > now + 2 * 60 * 1000) {
      return tokenCacheRef.current.token;
    }
    return null;
  }, []);

  const saveTokenToCache = useCallback((token: string) => {
    // Cache token with 30 min expiry (shorter than the actual token lifetime)
    tokenCacheRef.current = {
      token,
      expiresAt: Date.now() + 30 * 60 * 1000
    };
  }, []);

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
      const cachedToken = getTokenFromCache();
      if (cachedToken) {
        console.log("Using cached token");
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
          saveTokenToCache(token);
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
  }, [session, getTokenFromCache, saveTokenToCache]);

  // Create authenticated Supabase client
  const createAuthenticatedClient = useCallback(async (token: string) => {
    if (token === lastTokenRef.current && initialized.current) {
      return; // Skip if token hasn't changed
    }
    
    console.log("Creating new Supabase client with updated token");
    lastTokenRef.current = token;
    
    const client = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL || "https://jawtwwwelxaaprzsqfyp.supabase.co",
      import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd3R3d3dlbHhhYXByenNxZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDMzMTYsImV4cCI6MjA1ODA3OTMxNn0.FAAh0QpAM18T2pDrohTUBUMcNez8dnmIu3bpRoa8Yhk",
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
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
        return;
      }
      
      // Get the token with retry logic
      const token = await getTokenWithRetry(force);
      
      if (token) {
        await createAuthenticatedClient(token);
      }
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
    refreshClient // Expose refresh method with force option
  };
};
