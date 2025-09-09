/**
 * Hook for fetching GDPR confirmation data for anamnesis entries
 * Retrieves information about how patients were informed about data processing
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

      // Fetch GDPR data from anamnes_entries
      const { data, error } = await supabase
        .from("anamnes_entries")
        .select("id, gdpr_confirmed_by_name, consent_timestamp, gdpr_info_type, gdpr_notes, gdpr_method")
        .eq("id", entryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Only return confirmation data if it's a store verbal confirmation
      if (data?.gdpr_method === 'store_verbal' && data?.gdpr_confirmed_by_name) {
        return {
          id: data.id,
          confirmed_by_name: data.gdpr_confirmed_by_name,
          confirmed_at: data.consent_timestamp || new Date().toISOString(),
          info_type: data.gdpr_info_type || 'full',
          notes: data.gdpr_notes
        } as GdprConfirmation;
      }

      return null;
    },
    enabled: !!entryId,
  });
};