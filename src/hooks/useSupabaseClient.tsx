
import { useState, useEffect } from "react";
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

  useEffect(() => {
    const setupClient = async () => {
      try {
        setIsLoading(true);
        
        if (!isAuthLoaded || !userId || !session) {
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
            }
          );
          setAuthenticatedClient(client);
        }
      } catch (err) {
        console.error("Error setting up Supabase client with Clerk session token:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    setupClient();
  }, [isAuthLoaded, userId, session]);

  return { supabase: authenticatedClient, isLoading, error };
};
