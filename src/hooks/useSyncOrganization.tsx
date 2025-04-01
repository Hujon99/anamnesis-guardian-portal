
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const syncOrganization = async () => {
      if (!isOrgLoaded || !organization || isSupabaseLoading || isSynced) {
        return;
      }

      try {
        setIsSyncing(true);
        
        // Check if organization exists in Supabase
        const { data: existingOrg, error: fetchError } = await supabase
          .from("organizations")
          .select("id")
          .eq("id", organization.id)
          .maybeSingle();
          
        if (fetchError) {
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
            throw insertError;
          }
          
          console.log("Organization created successfully");
        } else {
          console.log("Organization already exists in Supabase");
        }
        
        setIsSynced(true);
      } catch (err) {
        console.error("Error syncing organization with Supabase:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Synkroniseringsfel",
          description: "Det gick inte att synkronisera organisation med databasen.",
          variant: "destructive",
        });
      } finally {
        setIsSyncing(false);
      }
    };

    syncOrganization();
  }, [organization, isOrgLoaded, supabase, isSupabaseLoading, isSynced]);

  return { isSyncing, isSynced, error };
};
