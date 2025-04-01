
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/components/ui/use-toast";

export const useEntryMutations = (entryId: string, onSuccess?: () => void) => {
  const { supabase } = useSupabaseClient();
  const queryClient = useQueryClient();
  
  const updateEntryMutation = useMutation({
    mutationFn: async ({ status, notes, email }: { status?: string; notes?: string; email?: string }) => {
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

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnes-entries"] });
      toast({
        title: "Anamnesen uppdaterad",
        description: "Ändringarna har sparats.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Ett fel uppstod",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const sendLinkMutation = useMutation({
    mutationFn: async (patientEmail: string) => {
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

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnes-entries"] });
      toast({
        title: "Länk skickad",
        description: "Anamneslänken har skickats till patienten.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Ett fel uppstod",
        description: error.message,
        variant: "destructive",
      });
    }
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
    }
  };
};
