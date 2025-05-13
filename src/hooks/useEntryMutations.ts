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
import { debugSupabaseAuth } from "@/integrations/supabase/client";

export const useEntryMutations = (entryId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { supabase, refreshClient, validateTokenBeforeRequest } = useSupabaseClient();
  
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

  // Enhanced UUID validation with additional checks and logging
  const isValidUuid = (uuid: string | null): boolean => {
    if (!uuid) return true; // Null is valid for removing assignments
    
    // Log the UUID being validated
    console.log(`Validating UUID: ${uuid}`);
    
    // Reject Clerk user IDs (they start with "user_")
    if (uuid.startsWith("user_")) {
      console.error("Rejected Clerk user ID:", uuid);
      return false;
    }
    
    // Check for valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(uuid);
    
    if (!isValid) {
      console.error("Invalid UUID format:", uuid);
    }
    
    return isValid;
  };
  
  // Common error handler function with better error classification
  const handleMutationError = (error: any, operation: string) => {
    console.error(`Error during ${operation}:`, error);
    
    let errorMessage = "Ett oväntat fel uppstod";
    let isAuthError = false;
    
    // Check if it's a JWT error
    if (error?.message?.includes("JWT") || 
        error?.message?.includes("token") || 
        error?.code === "PGRST301") {
      errorMessage = "Sessionen har upphört. Försöker återansluta...";
      isAuthError = true;
    } else if (error?.message?.includes("UUID") || 
              error?.message?.includes("invalid input syntax") ||
              error?.code === "22P02") {
      errorMessage = "Ogiltigt ID-format. Vänligen försök igen.";
    } else {
      errorMessage = error?.message || errorMessage;
    }
    
    toast({
      title: `Fel vid ${operation}`,
      description: errorMessage,
      variant: "destructive",
    });
    
    // Silently try to refresh the token in the background for auth errors
    if (isAuthError) {
      console.log("Attempting background token refresh due to auth error");
      refreshClient(true).then(() => {
        debugSupabaseAuth(); // Log auth state after refresh
      }).catch(e => {
        console.error("Background token refresh failed:", e);
      });
    }
    
    throw error;
  };

  // Mutation for assigning an optician to an entry with enhanced validation
  const assignOpticianMutation = {
    isPending: false,
    mutateAsync: async (opticianId: string | null) => {
      try {
        console.log("Starting optician assignment with ID:", opticianId);
        
        // Validate UUID format to prevent database errors
        if (opticianId !== null && !isValidUuid(opticianId)) {
          const error = new Error("Invalid optician ID format");
          console.error(error);
          throw error;
        }
        
        assignOpticianMutation.isPending = true;
        
        // Log auth state before the request
        await debugSupabaseAuth();
        
        // Pre-validate token before making the request
        await validateTokenBeforeRequest(true);
        
        // Log the optician ID for debugging
        console.log("Assigning optician with ID:", opticianId);
        
        const { data, error } = await supabase
          .from("anamnes_entries")
          .update({ optician_id: opticianId })
          .eq("id", entryId)
          .select()
          .single();
          
        if (error) {
          console.error("Supabase error during assignment:", error);
          throw error;
        }
        
        // Invalidate queries to refetch data
        queryClient.invalidateQueries({
          queryKey: ["anamnes-entries"]
        });
        
        // Execute any success callback
        if (onSuccess) onSuccess();
        
        console.log("Assignment successful:", data);
        
        return data;
      } catch (error) {
        return handleMutationError(error, "tilldelning av optiker");
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
        // Validate UUID format to prevent database errors
        if (storeId !== null && !isValidUuid(storeId)) {
          throw new Error("Invalid store ID format");
        }
        
        assignStoreMutation.isPending = true;
        
        // Pre-validate token before making the request
        await validateTokenBeforeRequest(true);
        
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
        return handleMutationError(error, "tilldelning av butik");
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
        
        // Pre-validate token before making the request
        await validateTokenBeforeRequest(true);
        
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
        return handleMutationError(error, "borttagning");
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
