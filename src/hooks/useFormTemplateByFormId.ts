/**
 * This hook fetches a specific form template by its form ID.
 * Used for backward compatibility with existing form_id based links
 * and for cases where we need to fetch a specific form regardless of organization.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { AnamnesForm, FormTemplate } from "@/types/anamnesis";

export interface FormTemplateWithMeta {
  schema: FormTemplate;
  id: string;
  title: string;
  organization_id: string | null;
  examination_type?: string;
}

export const useFormTemplateByFormId = (formId?: string) => {
  const { supabase } = useSupabaseClient();
  
  return useQuery({
    queryKey: ["form-template-by-id", formId],
    queryFn: async (): Promise<FormTemplateWithMeta | null> => {
      try {
        if (!supabase) {
          console.error("[useFormTemplateByFormId]: Supabase client not initialized");
          return null;
        }

        if (!formId) {
          console.error("[useFormTemplateByFormId]: No form ID provided");
          return null;
        }
        
        const { data: formData, error } = await supabase
          .from('anamnes_forms')
          .select("*")
          .eq('id', formId)
          .single();
          
        if (error) {
          console.error("[useFormTemplateByFormId]: Error fetching form:", error);
          throw new Error("Kunde inte hämta formulärmallen: " + error.message);
        }
        
        if (!formData) {
          console.log("[useFormTemplateByFormId]: No form found with ID:", formId);
          return null;
        }
        
        const form = formData as unknown as AnamnesForm;
        
        return {
          schema: form.schema,
          id: form.id,
          title: form.title,
          organization_id: form.organization_id,
          examination_type: (form as any).examination_type,
        };
      } catch (err: any) {
        console.error("[useFormTemplateByFormId]: Error:", err);
        toast({
          title: "Ett fel uppstod",
          description: "Kunde inte hämta formulärmallen",
          variant: "destructive",
        });
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled: !!supabase && !!formId, // Only run when supabase client and formId are available
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000),
  });
};