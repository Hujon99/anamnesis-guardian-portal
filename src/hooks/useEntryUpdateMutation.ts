
/**
 * This hook provides mutation functions for updating anamnesis entries.
 * It handles authentication, validation, and error recovery.
 */

import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { 
  updateEntry,
  updateEntryStatus,
  updateEntryFormattedRawData,
  updateEntryPatientIdentifier,
  updateEntryAiSummary 
} from "@/utils/entryMutationUtils";
import { AnamnesesEntry } from "@/types/anamnesis";

export const useEntryUpdateMutation = (entryId: string, onSuccess?: () => void) => {
  const { supabase, refreshClient } = useSupabaseClient();
  const queryClient = useQueryClient();

  // Helper function to ensure authentication before making requests
  const ensureAuthenticated = async (force = false) => {
    try {
      console.log(`Ensuring authentication for update mutation (force=${force})`);
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

  const updateEntryMutation = useMutation({
    mutationFn: async ({ 
      status, 
      formattedRawData, 
      identifier, 
      aiSummary 
    }: { 
      status?: string; 
      formattedRawData?: string; 
      identifier?: string; 
      aiSummary?: string 
    }) => {
      // Ensure we have a valid authentication token
      await ensureAuthenticated();
      
      const updates: Partial<AnamnesesEntry> = {};
      
      // If status is "reviewed", map it to "journaled"
      if (status === "reviewed") {
        status = "journaled";
      }
      
      if (status) updates.status = status;
      if (formattedRawData !== undefined) {
        console.log("Updating formatted raw data");
        updates.formatted_raw_data = formattedRawData;
      }
      if (identifier !== undefined) updates.patient_identifier = identifier;
      if (aiSummary !== undefined) updates.ai_summary = aiSummary;
      
      return updateEntry(supabase, entryId, updates);
    },
    onSuccess: (data) => {
      console.log("Entry updated successfully:", data);
      
      // Update status in the cache immediately in a more selective way
      queryClient.setQueryData(
        ["anamnes-entries", undefined, data.status],
        (oldData: AnamnesesEntry[] | undefined) => {
          if (!oldData) return undefined;
          
          return oldData.map(entry => 
            entry.id === entryId ? { ...entry, ...data } : entry
          );
        }
      );
      
      // Only invalidate the specific status query that was affected
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ["anamnes-entries", undefined, data.status] 
        });
      }, 100);
      
      toast({
        title: "Anamnesen uppdaterad",
        description: "Ändringarna har sparats.",
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Update mutation error:", error);
      
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Kunde inte uppdatera anamnesen. Försök igen.",
        variant: "destructive",
      });
      
      // Try to recover from auth issues with a forced refresh
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
    updateEntryMutation,
    updateStatus: (newStatus: string, formattedRawData?: string) => {
      return updateEntryMutation.mutateAsync({ status: newStatus, formattedRawData });
    },
    saveFormattedRawData: (formattedRawData: string) => {
      console.log("saveFormattedRawData called with data of length:", formattedRawData.length);
      return updateEntryMutation.mutateAsync({ formattedRawData });
    },
    savePatientIdentifier: (identifier: string) => {
      return updateEntryMutation.mutateAsync({ identifier });
    },
    saveAiSummary: (aiSummary: string) => {
      return updateEntryMutation.mutateAsync({ aiSummary });
    }
  };
};
