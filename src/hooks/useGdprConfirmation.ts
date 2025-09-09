/**
 * Hook for fetching GDPR confirmation data for anamnesis entries
 * Retrieves information about how patients were informed about data processing in store
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";

interface GdprConfirmation {
  id: string;
  confirmed_by_name: string;
  confirmed_at: string;
  info_type: 'full' | 'short';
  notes?: string;
}

export const useGdprConfirmation = (entryId: string | null) => {
  const { supabase } = useSupabaseClient();

  return useQuery({
    queryKey: ["gdpr-confirmation", entryId],
    queryFn: async (): Promise<GdprConfirmation | null> => {
      if (!entryId) return null;

      const { data, error } = await supabase
        .from("gdpr_store_confirmations")
        .select("id, confirmed_by_name, confirmed_at, info_type, notes")
        .eq("entry_id", entryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - this is expected for entries without GDPR confirmation
          return null;
        }
        throw error;
      }

      return data as GdprConfirmation;
    },
    enabled: !!entryId,
  });
};