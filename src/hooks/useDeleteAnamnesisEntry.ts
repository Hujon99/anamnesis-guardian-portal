
/**
 * This hook provides functionality for deleting anamnesis entries.
 * It handles the deletion process, error states, and success notifications.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { handleSupabaseError } from "@/utils/supabaseClientUtils";

export const useDeleteAnamnesisEntry = (onSuccess?: () => void) => {
  const { supabase } = useSupabaseClient();
  const queryClient = useQueryClient();
  
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      console.log(`Deleting entry with ID: ${entryId}`);
      
      const { error, data } = await supabase
        .from("anamnes_entries")
        .delete()
        .eq("id", entryId)
        .select();
      
      if (error) {
        console.error("Error deleting entry:", error);
        throw handleSupabaseError(error);
      }
      
      console.log("Delete operation returned:", data);
      return { success: true, entryId };
    },
    onSuccess: (data) => {
      console.log("Entry deleted successfully:", data.entryId);
      
      // Invalidate queries to refresh lists that display entries
      queryClient.invalidateQueries({
        queryKey: ["anamnes-entries-all"]
      });
      
      // Show success notification
      toast({
        title: "Anamnes borttagen",
        description: "Anamnesdata har tagits bort från systemet.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Failed to delete entry:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Ett okänt fel uppstod";
      
      toast({
        title: "Kunde inte ta bort anamnes",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });
  
  return {
    deleteEntry: (entryId: string) => deleteEntryMutation.mutate(entryId),
    isDeleting: deleteEntryMutation.isPending,
    error: deleteEntryMutation.error
  };
};
