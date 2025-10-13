/**
 * Hook for managing form templates in the system.
 * Handles fetching available templates for duplication and provides
 * filtering by category. Used by the Form Builder's template selector.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { toast } from "@/hooks/use-toast";
import { FormTemplate } from "@/types/anamnesis";

export interface FormTemplateData {
  id: string;
  title: string;
  examination_type: string;
  schema: FormTemplate;
  organization_id: string | null;
  is_template: boolean;
  template_category: string | null;
  created_at: string;
}

export const useFormTemplates = () => {
  const { organization } = useOrganization();
  const { supabase } = useSupabaseClient();
  
  return useQuery({
    queryKey: ["form-templates", organization?.id],
    queryFn: async (): Promise<FormTemplateData[]> => {
      try {
        if (!supabase) {
          console.error("[useFormTemplates]: Supabase client not initialized");
          return [];
        }
        
        // Fetch from the `anamnes_forms` table, including schema
        const { data: templates, error } = await supabase
          .from('anamnes_forms')
          .select("*")
          .eq('is_template', true)
          .or(`organization_id.is.null,organization_id.eq.${organization?.id || 'null'}`)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("[useFormTemplates]: Error fetching templates:", error);
          throw new Error("Kunde inte hämta formulärmallar: " + error.message);
        }
        
        return templates?.map(template => ({
          ...template,
          schema: template.schema as unknown as FormTemplate
        })) || [];
        
      } catch (err: any) {
        console.error("[useFormTemplates]: Error:", err);
        toast({
          title: "Ett fel uppstod",
          description: "Kunde inte hämta formulärmallar",
          variant: "destructive",
        });
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!supabase,
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000),
  });
};