/**
 * This hook combines mutation functions for anamnesis entries,
 * providing a unified interface for all entry-related mutations.
 * It aggregates the functionality from useEntryUpdateMutation and useSendLinkMutation.
 * Updated to work with Clerk user IDs instead of database UUIDs.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEntryUpdateMutation } from "./useEntryUpdateMutation";
import { useSendLinkMutation } from "./useSendLinkMutation";
import { useSupabaseClient } from "./useSupabaseClient";
import { toast } from "@/components/ui/use-toast";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Clerk ID validation regex (starts with "user_" followed by alphanumeric characters)
const CLERK_ID_REGEX = /^user_[a-zA-Z0-9]+$/;

export const useEntryMutations = (entryId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { supabase, handleJwtError, refreshClient } = useSupabaseClient();
  
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

  // Validate ID format
  const validateId = (id: string | null, fieldName: string, isOpticianId: boolean = false): boolean => {
    if (id === null) return true; // null is valid for clearing assignments
    
    if (isOpticianId) {
      // For optician IDs, we now expect a Clerk user ID format
      if (!CLERK_ID_REGEX.test(id)) {
        console.error(`Invalid Clerk user ID format for ${fieldName}:`, id);
        return false;
      }
    } else {
      // For other IDs (entry ID, store ID), we expect a UUID format
      if (!UUID_REGEX.test(id)) {
        console.error(`Invalid UUID format for ${fieldName}:`, id);
        return false;
      }
    }
    return true;
  };

  // Helper function to handle JWT errors with retry capability
  const handleJwtErrorWithRetry = async (operation: () => Promise<any>, retryCount = 0): Promise<any> => {
    const MAX_RETRIES = 2;
    
    try {
      return await operation();
    } catch (error: any) {
      console.error("Error in operation:", error);
      
      // Check if it's a JWT error (PGRST301 or similar)
      const isJwtError = error?.code === "PGRST301" || 
                         error?.message?.includes("JWT") || 
                         error?.message?.includes("401");
      
      if (isJwtError && retryCount < MAX_RETRIES) {
        console.log(`JWT error detected, refreshing token and retrying (attempt ${retryCount + 1})`);
        
        // Wait a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force refresh the token
        await refreshClient(true);
        
        // Try again with refreshed token
        return handleJwtErrorWithRetry(operation, retryCount + 1);
      }
      
      // If not a JWT error or max retries reached, rethrow
      throw error;
    }
  };

  // Mutation for assigning an optician to an entry
  const assignOpticianMutation = {
    isPending: false,
    mutateAsync: async (opticianId: string | null): Promise<void> => {
      try {
        console.log(`Starting optician assignment. Entry ID: ${entryId}, Optician ID: ${opticianId}`);
        assignOpticianMutation.isPending = true;
        
        // Validate IDs - now using the new validation function
        if (!validateId(entryId, 'entryId')) {
          throw new Error(`Invalid entry ID format: ${entryId}`);
        }
        
        if (opticianId !== null && !validateId(opticianId, 'opticianId', true)) {
          throw new Error(`Invalid optician ID format: ${opticianId}`);
        }
        
        // Use the helper function to handle JWT errors with retry
        await handleJwtErrorWithRetry(async () => {
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
          
          return data;
        });
        
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

  // Mutation for assigning a store to an entry - Modified to return Promise<void>
  const assignStoreMutation = {
    isPending: false,
    mutateAsync: async (storeId: string | null): Promise<void> => {
      try {
        console.log(`Starting store assignment. Entry ID: ${entryId}, Store ID: ${storeId}`);
        assignStoreMutation.isPending = true;
        
        // Validate IDs
        if (!validateId(entryId, 'entryId')) {
          throw new Error(`Invalid entry ID format: ${entryId}`);
        }
        
        if (storeId !== null && !validateId(storeId, 'storeId')) {
          throw new Error(`Invalid store ID format: ${storeId}`);
        }
        
        // Use the helper function to handle JWT errors with retry
        await handleJwtErrorWithRetry(async () => {
          const { data, error } = await supabase
            .from("anamnes_entries")
            .update({ store_id: storeId })
            .eq("id", entryId)
            .select()
            .single();
            
          if (error) {
            console.error("Supabase error in assignStoreMutation:", error);
            throw error;
          }
          
          return data;
        });
        
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
      } catch (error) {
        console.error("Error assigning store:", error);
        
        toast({
          title: "Fel vid tilldelning av butik",
          description: error instanceof Error 
            ? error.message 
            : "Det gick inte att koppla anamnes till butik",
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
    mutateAsync: async (entryId: string): Promise<void> => {
      try {
        deleteMutation.isPending = true;
        
        // Validate ID
        if (!validateId(entryId, 'entryId')) {
          throw new Error(`Invalid entry ID format: ${entryId}`);
        }
        
        // Use the helper function to handle JWT errors with retry
        await handleJwtErrorWithRetry(async () => {
          const { error } = await supabase
            .from("anamnes_entries")
            .delete()
            .eq("id", entryId);
            
          if (error) throw error;
        });
        
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({
          queryKey: ["anamnes-entries"]
        });
        
        // Execute any success callback
        if (onSuccess) onSuccess();
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
    isAssigningStore: assignStoreMutation.isPending,
    isAssigningOptician: assignOpticianMutation.isPending,
    refreshData: () => {
      // Provide a more selective refresh that only refreshes the current view
      queryClient.invalidateQueries({
        queryKey: ["anamnes-entries"]
      });
    }
  };
};
