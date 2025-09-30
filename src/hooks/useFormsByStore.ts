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
      console.log("[useFormsByStore]: Starting query for storeId:", storeId);
      
      if (!supabase || !storeId) {
        console.log("[useFormsByStore]: Missing supabase or storeId");
        return [];
      }

      try {
        // Strategy 1: Get active store form assignments
        console.log("[useFormsByStore]: Fetching store_forms for storeId:", storeId);
        const { data: storeFormsData, error: storeFormsError } = await supabase
          .from('store_forms')
          .select('form_id, is_active')
          .eq('store_id', storeId)
          .eq('is_active', true);

        console.log("[useFormsByStore]: store_forms query result:", {
          data: storeFormsData,
          error: storeFormsError,
          count: storeFormsData?.length || 0
        });

        if (storeFormsError) {
          console.error("[useFormsByStore]: Error fetching store forms:", storeFormsError);
          throw new Error("Kunde inte hämta formulär: " + storeFormsError.message);
        }

        // If no active assignments exist for this store, return empty array
        if (!storeFormsData || storeFormsData.length === 0) {
          console.log("[useFormsByStore]: No active form assignments found for this store");
          return [];
        }

        // Strategy 2: Fetch the actual form data separately
        const formIds = storeFormsData.map(sf => sf.form_id);
        console.log("[useFormsByStore]: Fetching forms for formIds:", formIds);

        const { data: formsData, error: formsError } = await supabase
          .from('anamnes_forms')
          .select('id, title, examination_type, organization_id, schema')
          .in('id', formIds);

        console.log("[useFormsByStore]: anamnes_forms query result:", {
          data: formsData,
          error: formsError,
          count: formsData?.length || 0
        });

        if (formsError) {
          console.error("[useFormsByStore]: Error fetching forms:", formsError);
          throw new Error("Kunde inte hämta formulärdata: " + formsError.message);
        }

        if (!formsData || formsData.length === 0) {
          console.warn("[useFormsByStore]: Forms exist in store_forms but couldn't fetch form details");
          return [];
        }

        // Return assigned forms
        const result = formsData.map(form => ({
          schema: form.schema as unknown as FormTemplate,
          id: form.id,
          title: form.title,
          organization_id: form.organization_id,
          examination_type: form.examination_type,
        }));

        console.log("[useFormsByStore]: Returning", result.length, "forms");
        return result;

      } catch (error) {
        console.error("[useFormsByStore]: Unexpected error:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!supabase && !!storeId,
    retry: 2,
  });
};