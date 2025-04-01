
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

  useEffect(() => {
    // Creating a function to cleanly handle the async code
    const setupClient = async () => {
      // Skip if already initialized or auth not loaded
      if (initialized.current || !isAuthLoaded) return;
      
      try {
        setIsLoading(true);
        
        if (!userId || !session) {
          // Return the unauthenticated client if no user is logged in
          setAuthenticatedClient(supabaseClient);
          return;
        }
        
        // Get the token directly from the Clerk session
        const token = await session.getToken();
        
        if (token) {
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

    // Create a listener for Clerk session changes
    const handleSessionChange = () => {
      // Reset the initialization flag so we regenerate on next render
      initialized.current = false;
      setupClient();
    };

    // Listen for session token changes
    if (session) {
      session.listen(handleSessionChange);
    }

    return () => {
      if (session) {
        session.unlisten(handleSessionChange);
      }
    };
  }, [isAuthLoaded, userId, session]);

  return { supabase: authenticatedClient, isLoading, error };
};
