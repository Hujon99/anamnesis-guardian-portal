
/**
 * This hook provides mutation functions for anamnesis entries,
 * handling authentication, optimistic updates, and error recovery.
 * It includes mutations for updating entries and sending links to patients.
 */

import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/components/ui/use-toast";
import { useAnamnesis } from "@/contexts/AnamnesisContext";
import { handleSupabaseError } from "@/utils/supabaseClientUtils";

export const useEntryMutations = (entryId: string, onSuccess?: () => void) => {
  const { supabase, refreshClient } = useSupabaseClient();
  const queryClient = useQueryClient();
  const { refreshData, forceRefresh } = useAnamnesis();
  
  // Helper function to ensure authentication before making requests
  const ensureAuthenticated = async (force = false) => {
    try {
      console.log(`Ensuring authentication for mutation (force=${force})`);
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
      
      console.log(`Updating entry ${entryId} with:`, updates);
      
      const { data, error } = await supabase
        .from("anamnes_entries")
        .update(updates)
        .eq("id", entryId)
        .select()
        .single();

      if (error) {
        console.error("Error updating entry:", error);
        throw handleSupabaseError(error);
      }
      return data;
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
        // Only invalidate the relevant status
        queryClient.invalidateQueries({ 
          queryKey: ["anamnes-entries", undefined, data.status] 
        });
        
        // Don't call refreshData() or forceRefresh() for minor updates
      }, 100);
      
      toast({
        title: "Anamnesen uppdaterad",
        description: "Ändringarna har sparats.",
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      
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
        return failureCount < 2; // Reduced from 3 to 2 retries for network issues
      }
      return false; // Don't retry other errors
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
  });

  const sendLinkMutation = useMutation({
    mutationFn: async (patientEmail: string) => {
      // Ensure we have a valid authentication token with forced refresh
      await ensureAuthenticated(true);
      
      if (!patientEmail) {
        throw new Error("E-post är obligatoriskt för att skicka länk");
      }
      
      console.log(`Sending link for entry ${entryId} to ${patientEmail}`);
      
      const { data, error } = await supabase
        .from("anamnes_entries")
        .update({
          patient_email: patientEmail,
          status: "sent",
          sent_at: new Date().toISOString()
        })
        .eq("id", entryId)
        .select()
        .single();

      if (error) {
        console.error("Error sending link:", error);
        throw handleSupabaseError(error);
      }
      return data;
    },
    onSuccess: (data) => {
      console.log("Link sent successfully:", data);
      
      // For significant status changes, we still need a more complete refresh
      // But we make it more targeted - only refresh the sent tab
      setTimeout(() => {
        // Only invalidate the "sent" status since that's where the entry is now
        queryClient.invalidateQueries({ 
          queryKey: ["anamnes-entries", undefined, "sent"] 
        });
      }, 100);
      
      toast({
        title: "Länk skickad",
        description: "Anamneslänken har skickats till patienten.",
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Kunde inte skicka länken. Försök igen.",
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
        return failureCount < 2; // Reduced from 3 to 2 retries
      }
      return false; // Don't retry other errors
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
  });

  return {
    updateEntryMutation,
    sendLinkMutation,
    updateStatus: (newStatus: string, notes?: string) => {
      updateEntryMutation.mutate({ status: newStatus, notes });
    },
    saveNotes: (notes: string) => {
      updateEntryMutation.mutate({ notes });
    },
    savePatientEmail: (email: string) => {
      updateEntryMutation.mutate({ email });
    },
    sendLink: (patientEmail: string) => {
      sendLinkMutation.mutate(patientEmail);
    },
    refreshData: () => {
      // Provide a more selective refresh that only refreshes the current view
      queryClient.invalidateQueries({
        queryKey: ["anamnes-entries"]
      });
    }
  };
};
