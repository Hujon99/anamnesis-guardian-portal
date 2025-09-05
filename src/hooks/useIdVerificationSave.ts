/**
 * Hook for saving ID verification data to anamnes_entries table.
 * This handles saving ID verification for all types of forms,
 * whether they are direct in-store forms or driving license examinations.
 */

import { useSupabaseClient } from "./useSupabaseClient";
import { toast } from "@/hooks/use-toast";

export const useIdVerificationSave = () => {
  const { supabase } = useSupabaseClient();

  const saveIdVerificationToEntry = async (
    entryId: string, 
    idData: {
      idType: string;
      personalNumber: string;
      userId: string;
    }
  ) => {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    console.log('[IdVerificationSave] Saving ID verification to entry:', entryId, idData);

    const { error } = await supabase
      .from("anamnes_entries")
      .update({
        id_verification_completed: true,
        id_type: idData.idType as any,
        personal_number: idData.personalNumber,
        verified_by: idData.userId,
        verified_at: new Date().toISOString(),
      })
      .eq("id", entryId);

    if (error) {
      console.error('[IdVerificationSave] Error updating entry:', error);
      throw new Error(`Kunde inte spara legitimationsdata: ${error.message}`);
    }

    console.log('[IdVerificationSave] Successfully saved ID verification to entry');
    
    toast({
      title: "Legitimation verifierad",
      description: "Legitimationskontrollen har sparats"
    });
  };

  return {
    saveIdVerificationToEntry
  };
};