
import { useEffect, useState, useRef } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "./useSupabaseClient";
import { toast } from "@/components/ui/use-toast";

/**
 * A hook that ensures the current Clerk organization exists in Supabase
 */
export const useSyncOrganization = () => {
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { supabase, isLoading: isSupabaseLoading } = useSupabaseClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const syncAttempts = useRef(0);
  const maxRetries = 3;
  const syncedOrgId = useRef<string | null>(null);

  useEffect(() => {
    const syncOrganization = async () => {
      // Reset sync status when organization changes
      if (organization?.id && organization.id !== syncedOrgId.current) {
        setIsSynced(false);
        syncAttempts.current = 0;
        syncedOrgId.current = null;
      }
      
      // Skip if no organization, auth not loaded, supabase is loading, or already synced this org
      if (!isOrgLoaded || !organization || isSupabaseLoading || 
          (isSynced && syncedOrgId.current === organization.id)) {
        return;
      }

      // Prevent excessive retries
      if (syncAttempts.current >= maxRetries) {
        console.log(`Max sync attempts (${maxRetries}) reached for org: ${organization.id}`);
        return;
      }

      try {
        setIsSyncing(true);
        syncAttempts.current += 1;
        
        console.log(`Attempt ${syncAttempts.current}: Syncing organization ${organization.id}`);
        
        // Check if organization exists in Supabase
        const { data: existingOrg, error: fetchError } = await supabase
          .from("organizations")
          .select("id")
          .eq("id", organization.id)
          .maybeSingle();
          
        if (fetchError) {
          console.error("Error fetching organization:", fetchError);
          throw fetchError;
        }
        
        // If organization doesn't exist, create it
        if (!existingOrg) {
          console.log("Creating organization in Supabase:", organization.id);
          const { error: insertError } = await supabase
            .from("organizations")
            .insert({
              id: organization.id,
              name: organization.name || "Unnamed Organization"
            });
            
          if (insertError) {
            console.error("Error inserting organization:", insertError);
            throw insertError;
          }
          
          console.log("Organization created successfully");
        } else {
          console.log("Organization already exists in Supabase");
        }
        
        // Mark this org as successfully synced
        setIsSynced(true);
        syncedOrgId.current = organization.id;
        setError(null);
      } catch (err) {
        console.error("Error syncing organization with Supabase:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        
        // Only show toast on final attempt
        if (syncAttempts.current >= maxRetries) {
          toast({
            title: "Synkroniseringsfel",
            description: "Det gick inte att synkronisera organisation med databasen. Försök igen senare.",
            variant: "destructive",
          });
        } else {
          // Schedule a retry with exponential backoff
          const retryDelay = Math.min(1000 * Math.pow(2, syncAttempts.current - 1), 10000);
          console.log(`Scheduling retry in ${retryDelay}ms`);
          setTimeout(() => {
            // Only reset if we're still on the same org
            if (organization?.id === syncedOrgId.current) {
              setIsSynced(false); // Trigger another sync attempt
            }
          }, retryDelay);
        }
      } finally {
        setIsSyncing(false);
      }
    };

    syncOrganization();
  }, [organization, isOrgLoaded, supabase, isSupabaseLoading, isSynced]);

  return { isSyncing, isSynced, error };
};
