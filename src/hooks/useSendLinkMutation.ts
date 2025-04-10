
/**
 * This hook provides a mutation function for updating patient identification.
 * It handles authentication, validation, and error recovery.
 */

import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { updateEntryPatientEmail } from "@/utils/entryMutationUtils";

export const useSendLinkMutation = (entryId: string, onSuccess?: () => void) => {
  const { supabase, refreshClient } = useSupabaseClient();
  const queryClient = useQueryClient();

  // Helper function to ensure authentication before making requests
  const ensureAuthenticated = async (force = false) => {
    try {
      console.log(`Ensuring authentication for patient update mutation (force=${force})`);
      await refreshClient(force);
      return true;
    } catch (error) {
      console.error("Authentication refresh failed:", error);
      toast({
        title: "Autentiseringsfel",
        description: "Det gick inte att autentisera förfrågan. Försök igen.",
        variant: "destructive",
      });
      throw new Error("Autentiseringsfel. Vänligen logga in igen.");
    }
  };

  const sendLinkMutation = useMutation({
    mutationFn: async (patientIdentifier: string) => {
      // Ensure we have a valid authentication token with forced refresh
      await ensureAuthenticated(true);
      
      return updateEntryPatientEmail(supabase, entryId, patientIdentifier);
    },
    onSuccess: (data) => {
      console.log("Patient identifier updated successfully:", data);
      
      // For significant status changes, we still need a more complete refresh
      // But we make it more targeted - only refresh the sent tab
      setTimeout(() => {
        // Only invalidate the "sent" status since that's where the entry is now
        queryClient.invalidateQueries({ 
          queryKey: ["anamnes-entries", undefined, "sent"] 
        });
      }, 100);
      
      toast({
        title: "Patientinformation uppdaterad",
        description: "Patientens identifierare har uppdaterats.",
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Patient identification update error:", error);
      
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Kunde inte uppdatera patientinformation. Försök igen.",
        variant: "destructive",
      });
      
      // Try to recover from auth issues
      if (error.message?.includes("auth") || error.code === "PGRST301") {
        refreshClient(true);
      }
    },
    retry: (failureCount, error) => {
      // Only retry specific errors that might be temporary
      if (error?.message?.includes("network") || error?.code === "PGRST301") {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  return {
    sendLinkMutation,
    sendLink: (patientIdentifier: string) => {
      sendLinkMutation.mutate(patientIdentifier);
    }
  };
};
