
/**
 * This hook provides mutation functions for updating anamnesis entries.
 * It handles authentication, validation, and error recovery.
 */

import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { updateEntry, updateEntryStatus, updateEntryNotes, updateEntryPatientEmail } from "@/utils/entryMutationUtils";
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
    mutationFn: async ({ status, notes, email }: { status?: string; notes?: string; email?: string }) => {
      // Ensure we have a valid authentication token
      await ensureAuthenticated();
      
      const updates: Partial<AnamnesesEntry> = {};
      
      if (status) updates.status = status;
      if (notes !== undefined) updates.internal_notes = notes;
      if (email !== undefined) updates.patient_email = email;
      
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
    updateStatus: (newStatus: string, notes?: string) => {
      updateEntryMutation.mutate({ status: newStatus, notes });
    },
    saveNotes: (notes: string) => {
      updateEntryMutation.mutate({ notes });
    },
    savePatientEmail: (email: string) => {
      updateEntryMutation.mutate({ email });
    },
  };
};
