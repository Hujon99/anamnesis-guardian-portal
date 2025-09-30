/**
 * Hook for fetching forms available in a specific store.
 * Used by patient flow to show only forms that are actively assigned to the selected store.
 * Returns empty array if no active form assignments exist for the store.
 * 
 * Uses an edge function as a fallback to bypass potential RLS issues with anon users.
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
        // Use edge function for reliable data access
        console.log("[useFormsByStore]: Calling get-store-forms edge function");
        
        const { data, error } = await supabase.functions.invoke('get-store-forms', {
          body: { storeId }
        });

        if (error) {
          console.error("[useFormsByStore]: Edge function error:", error);
          throw new Error(`Kunde inte hämta formulär: ${error.message}`);
        }

        if (!data) {
          console.log("[useFormsByStore]: No data returned from edge function");
          return [];
        }

        console.log("[useFormsByStore]: Edge function returned", data.length, "forms");

        // Transform data to expected format
        const result: FormTemplateWithMeta[] = data.map((form: any) => ({
          schema: form.schema as FormTemplate,
          id: form.id,
          title: form.title,
          organization_id: form.organization_id,
          examination_type: form.examination_type,
        }));

        return result;

      } catch (error) {
        console.error("[useFormsByStore]: Unexpected error:", error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // Shorter cache time for critical data
    gcTime: 5 * 60 * 1000,
    enabled: !!supabase && !!storeId,
    retry: 3, // More retries for critical functionality
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });
};