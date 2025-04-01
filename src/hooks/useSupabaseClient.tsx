
import { useState, useEffect, useRef } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

/**
 * A hook that provides a Supabase client authenticated with the current Clerk session
 */
export const useSupabaseClient = () => {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { session } = useClerk();
  const [authenticatedClient, setAuthenticatedClient] = useState(supabaseClient);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a ref to track if we've initialized the client to prevent duplicate setups
  const initialized = useRef(false);
  // Store the last known token to detect changes
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // Creating a function to cleanly handle the async code
    const setupClient = async () => {
      // Skip if auth not loaded
      if (!isAuthLoaded) return;
      
      try {
        setIsLoading(true);
        
        if (!userId || !session) {
          // Return the unauthenticated client if no user is logged in
          setAuthenticatedClient(supabaseClient);
          initialized.current = false;
          lastTokenRef.current = null;
          return;
        }
        
        // Get the token directly from the Clerk session
        const token = await session.getToken();
        
        // Only recreate the client if the token has changed
        if (token && (token !== lastTokenRef.current || !initialized.current)) {
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
        }
      } catch (err) {
        console.error("Error setting up Supabase client with Clerk session token:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    setupClient();
    
    // Set up an interval to refresh the token periodically
    const intervalId = setInterval(() => {
      if (session) {
        initialized.current = false; // Force recreation on next check
        setupClient();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthLoaded, userId, session]);

  return { supabase: authenticatedClient, isLoading, error };
};
