
/**
 * This hook combines mutation functions for anamnesis entries,
 * providing a unified interface for all entry-related mutations.
 * It aggregates the functionality from useEntryUpdateMutation and useSendLinkMutation.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEntryUpdateMutation } from "./useEntryUpdateMutation";
import { useSendLinkMutation } from "./useSendLinkMutation";
import { useSupabaseClient } from "./useSupabaseClient";
import { toast } from "@/components/ui/use-toast";

export const useEntryMutations = (entryId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { supabase } = useSupabaseClient();
  
  const {
    updateEntryMutation,
    updateStatus,
    saveFormattedRawData,
    savePatientIdentifier,
    saveAiSummary
  } = useEntryUpdateMutation(entryId, onSuccess);
  
  const {
    sendLinkMutation,
    sendLink
  } = useSendLinkMutation(entryId, onSuccess);

  // Mutation for assigning an optician to an entry
  const assignOpticianMutation = {
    isPending: false, // Add this property
    mutateAsync: async (opticianId: string | null) => {
      try {
        assignOpticianMutation.isPending = true; // Set pending state
        const { data, error } = await supabase
          .from("anamnes_entries")
          .update({ optician_id: opticianId })
          .eq("id", entryId)
          .select()
          .single();
          
        if (error) throw error;
        
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({
          queryKey: ["anamnes-entries"]
        });
        
        // Show success message
        toast({
          title: "Optiker tilldelad",
          description: opticianId 
            ? "Anamnes har tilldelats till optiker" 
            : "Optikertilldelning har tagits bort",
        });
        
        // Execute any success callback
        if (onSuccess) onSuccess();
        
        return data;
      } catch (error) {
        console.error("Error assigning optician:", error);
        
        toast({
          title: "Fel vid tilldelning av optiker",
          description: "Det gick inte att tilldela optiker till anamnesen",
          variant: "destructive",
        });
        
        throw error;
      } finally {
        assignOpticianMutation.isPending = false; // Reset pending state
      }
    }
  };

  // Mutation for assigning a store to an entry
  const assignStoreMutation = {
    isPending: false, // Add this property
    mutateAsync: async (storeId: string | null) => {
      try {
        assignStoreMutation.isPending = true; // Set pending state
        const { data, error } = await supabase
          .from("anamnes_entries")
          .update({ store_id: storeId })
          .eq("id", entryId)
          .select()
          .single();
          
        if (error) throw error;
        
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({
          queryKey: ["anamnes-entries"]
        });
        
        // Show success message
        toast({
          title: "Butik tilldelad",
          description: storeId 
            ? "Anamnes har kopplats till butik" 
            : "Butikskoppling har tagits bort",
        });
        
        // Execute any success callback
        if (onSuccess) onSuccess();
        
        return data;
      } catch (error) {
        console.error("Error assigning store:", error);
        
        toast({
          title: "Fel vid tilldelning av butik",
          description: "Det gick inte att koppla anamnes till butik",
          variant: "destructive",
        });
        
        throw error;
      } finally {
        assignStoreMutation.isPending = false; // Reset pending state
      }
    }
  };

  return {
    updateEntryMutation,
    sendLinkMutation,
    assignOpticianMutation,
    assignStoreMutation,
    updateStatus,
    saveFormattedRawData,
    savePatientIdentifier,
    saveAiSummary,
    sendLink,
    assignOptician: assignOpticianMutation.mutateAsync,
    assignStore: assignStoreMutation.mutateAsync,
    refreshData: () => {
      // Provide a more selective refresh that only refreshes the current view
      queryClient.invalidateQueries({
        queryKey: ["anamnes-entries"]
      });
    }
  };
};
