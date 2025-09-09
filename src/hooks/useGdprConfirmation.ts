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
  info_type: 'full' | 'short' | 'store_direct' | 'digital';
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
        .select("id, gdpr_confirmed_by_name, consent_timestamp, gdpr_info_type, gdpr_notes, gdpr_method, patient_identifier, first_name, consent_given, created_at")
        .eq("id", entryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Handle different types of GDPR consent
      
      // Store verbal confirmation - detailed confirmation data
      if (data?.gdpr_method === 'store_verbal' && data?.gdpr_confirmed_by_name) {
        return {
          id: data.id,
          confirmed_by_name: data.gdpr_confirmed_by_name,
          confirmed_at: data.consent_timestamp || new Date().toISOString(),
          info_type: data.gdpr_info_type || 'full',
          notes: data.gdpr_notes
        } as GdprConfirmation;
      }
      
      // Direct store forms (indicated by patient_identifier containing "Direkt ifyllning i butik")
      if (data?.patient_identifier?.includes('Direkt ifyllning i butik')) {
        const customerName = data.patient_identifier.split(' (')[0] || 'Okänd kund';
        return {
          id: data.id,
          confirmed_by_name: customerName,
          confirmed_at: data.consent_timestamp || data.created_at || new Date().toISOString(),
          info_type: 'store_direct',
          notes: 'Kunden fyllde i formuläret direkt i butiken med muntlig GDPR-information'
        } as GdprConfirmation;
      }
      
      // Online forms with digital consent
      if (data?.consent_given === true && data?.consent_timestamp) {
        return {
          id: data.id,
          confirmed_by_name: data.first_name || data.patient_identifier || 'Patient',
          confirmed_at: data.consent_timestamp,
          info_type: 'digital',
          notes: 'Digital samtycke via formuläret'
        } as GdprConfirmation;
      }

      return null;
    },
    enabled: !!entryId,
  });
};