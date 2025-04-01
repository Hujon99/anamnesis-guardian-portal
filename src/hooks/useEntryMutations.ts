
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/components/ui/use-toast";
import { useAnamnesis } from "@/contexts/AnamnesisContext";

export const useEntryMutations = (entryId: string, onSuccess?: () => void) => {
  const { supabase, refreshClient } = useSupabaseClient();
  const queryClient = useQueryClient();
  const { refreshData } = useAnamnesis();
  
  // Helper function to ensure authentication before making requests
  const ensureAuthenticated = async () => {
    try {
      await refreshClient();
    } catch (error) {
      console.error("Authentication refresh failed:", error);
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
      
      const { data, error } = await supabase
        .from("anamnes_entries")
        .update(updates)
        .eq("id", entryId)
        .select()
        .single();

      if (error) {
        console.error("Error updating entry:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      // Use a small delay to prevent race conditions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["anamnes-entries"] });
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
      
      // Try to recover from auth issues
      if (error.message?.includes("auth") || error.code === "PGRST301") {
        refreshClient();
      }
    },
    retry: (failureCount, error) => {
      // Only retry specific errors that might be temporary
      if (error?.message?.includes("network") || error?.code === "PGRST301") {
        return failureCount < 3; // Retry up to 3 times for network issues
      }
      return false; // Don't retry other errors
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
  });

  const sendLinkMutation = useMutation({
    mutationFn: async (patientEmail: string) => {
      // Ensure we have a valid authentication token
      await ensureAuthenticated();
      
      if (!patientEmail) {
        throw new Error("E-post är obligatoriskt för att skicka länk");
      }
      
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
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      // Use a small delay to prevent race conditions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["anamnes-entries"] });
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
        refreshClient();
      }
    },
    retry: (failureCount, error) => {
      // Only retry specific errors that might be temporary
      if (error?.message?.includes("network") || error?.code === "PGRST301") {
        return failureCount < 3; // Retry up to 3 times for network issues
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
      refreshData();
    }
  };
};
