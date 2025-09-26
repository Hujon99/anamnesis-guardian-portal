/**
 * Hook for fetching forms available in a specific store.
 * Used by patient flow to show only forms that are active for the selected store.
 * Also provides fallback to all organization forms if no specific assignments exist.
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
        // Fallback: return all forms for the organization
        const { data: allForms, error: allFormsError } = await supabase
          .from('anamnes_forms')
          .select('*')
          .eq('organization_id', store.organization_id);

        if (allFormsError) {
          throw new Error("Kunde inte hämta formulär: " + allFormsError.message);
        }

        return (allForms || []).map(form => ({
          schema: form.schema as FormTemplate,
          id: form.id,
          title: form.title,
          organization_id: form.organization_id,
          examination_type: form.examination_type,
        }));
      }

      // If no specific assignments exist, fall back to all organization forms
      if (!storeFormsData || storeFormsData.length === 0) {
        console.log("[useFormsByStore]: No assignments found, using all org forms");
        const { data: allForms, error: allFormsError } = await supabase
          .from('anamnes_forms')
          .select('*')
          .eq('organization_id', store.organization_id);

        if (allFormsError) {
          throw new Error("Kunde inte hämta formulär: " + allFormsError.message);
        }

        return (allForms || []).map(form => ({
          schema: form.schema as FormTemplate,
          id: form.id,
          title: form.title,
          organization_id: form.organization_id,
          examination_type: form.examination_type,
        }));
      }

      // Return assigned forms
      return storeFormsData.map(item => {
        const form = item.anamnes_forms;
        return {
          schema: form.schema as FormTemplate,
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