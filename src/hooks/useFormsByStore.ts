/**
 * Hook for fetching forms available in a specific store.
 * Used by patient flow to show only forms that are actively assigned to the selected store.
 * Returns empty array if no active form assignments exist for the store.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { FormTemplate } from "@/types/anamnesis";

export interface FormTemplateWithMeta {
  schema: FormTemplate;
  id: string;
  title: string;
  organization_id: string | null;
  examination_type?: string;
}

export const useFormsByStore = (storeId?: string) => {
  const { supabase } = useSupabaseClient();

  return useQuery({
    queryKey: ["forms-by-store", storeId],
    queryFn: async (): Promise<FormTemplateWithMeta[]> => {
      if (!supabase || !storeId) return [];

      // First, get the store's organization_id
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('organization_id')
        .eq('id', storeId)
        .single();

      if (storeError || !store) {
        console.error("[useFormsByStore]: Error fetching store:", storeError);
        return [];
      }

      // Get active forms for this store
      const { data: storeFormsData, error: storeFormsError } = await supabase
        .from('store_forms')
        .select(`
          form_id,
          anamnes_forms!inner(
            id,
            title,
            examination_type,
            organization_id,
            schema
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (storeFormsError) {
        console.error("[useFormsByStore]: Error fetching store forms:", storeFormsError);
        throw new Error("Kunde inte hämta formulär: " + storeFormsError.message);
      }

      // If no active assignments exist for this store, return empty array
      // Don't fall back to all org forms - only show explicitly assigned forms
      if (!storeFormsData || storeFormsData.length === 0) {
        console.log("[useFormsByStore]: No active form assignments found for this store");
        return [];
      }

      // Return assigned forms
      return storeFormsData.map(item => {
        const form = item.anamnes_forms;
        return {
          schema: form.schema as unknown as FormTemplate,
          id: form.id,
          title: form.title,
          organization_id: form.organization_id,
          examination_type: form.examination_type,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!supabase && !!storeId,
    retry: 2,
  });
};