
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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  // Validate UUID format
  const validateUUID = (id: string | null, fieldName: string): boolean => {
    if (id === null) return true; // null is valid for clearing assignments
    if (!UUID_REGEX.test(id)) {
      console.error(`Invalid UUID format for ${fieldName}:`, id);
      return false;
    }
    return true;
  };

  // Mutation for assigning an optician to an entry
  const assignOpticianMutation = {
    isPending: false,
    mutateAsync: async (opticianId: string | null) => {
      try {
        console.log(`Starting optician assignment. Entry ID: ${entryId}, Optician ID: ${opticianId}`);
        assignOpticianMutation.isPending = true;
        
        // Validate IDs
        if (!validateUUID(entryId, 'entryId')) {
          throw new Error(`Invalid entry ID format: ${entryId}`);
        }
        
        if (opticianId !== null && !validateUUID(opticianId, 'opticianId')) {
          throw new Error(`Invalid optician ID format: ${opticianId}`);
        }
        
        const { data, error } = await supabase
          .from("anamnes_entries")
          .update({ optician_id: opticianId })
          .eq("id", entryId)
          .select()
          .single();
          
        if (error) {
          console.error("Supabase error in assignOpticianMutation:", error);
          throw error;
        }
        
        console.log("Assignment successful, response data:", data);
        
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
          description: error instanceof Error 
            ? error.message
            : "Det gick inte att tilldela optiker till anamnesen",
          variant: "destructive",
        });
        
        throw error;
      } finally {
        assignOpticianMutation.isPending = false;
      }
    }
  };

  // Mutation for assigning a store to an entry
  const assignStoreMutation = {
    isPending: false,
    mutateAsync: async (storeId: string | null) => {
      try {
        assignStoreMutation.isPending = true;
        
        // Validate IDs
        if (!validateUUID(entryId, 'entryId')) {
          throw new Error(`Invalid entry ID format: ${entryId}`);
        }
        
        if (storeId !== null && !validateUUID(storeId, 'storeId')) {
          throw new Error(`Invalid store ID format: ${storeId}`);
        }
        
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
        assignStoreMutation.isPending = false;
      }
    }
  };

  // Add deleteEntry mutation
  const deleteMutation = {
    isPending: false,
    mutateAsync: async (entryId: string) => {
      try {
        deleteMutation.isPending = true;
        
        // Validate ID
        if (!validateUUID(entryId, 'entryId')) {
          throw new Error(`Invalid entry ID format: ${entryId}`);
        }
        
        const { error } = await supabase
          .from("anamnes_entries")
          .delete()
          .eq("id", entryId);
          
        if (error) throw error;
        
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({
          queryKey: ["anamnes-entries"]
        });
        
        // Execute any success callback
        if (onSuccess) onSuccess();
        
        return true;
      } catch (error) {
        console.error("Error deleting entry:", error);
        
        toast({
          title: "Fel vid borttagning",
          description: "Det gick inte att ta bort anamnesen",
          variant: "destructive",
        });
        
        throw error;
      } finally {
        deleteMutation.isPending = false;
      }
    }
  };

  return {
    updateEntryMutation,
    sendLinkMutation,
    assignOpticianMutation,
    assignStoreMutation,
    deleteMutation,
    updateStatus,
    saveFormattedRawData,
    savePatientIdentifier,
    saveAiSummary,
    sendLink,
    assignOptician: assignOpticianMutation.mutateAsync,
    assignStore: assignStoreMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    refreshData: () => {
      // Provide a more selective refresh that only refreshes the current view
      queryClient.invalidateQueries({
        queryKey: ["anamnes-entries"]
      });
    }
  };
};
