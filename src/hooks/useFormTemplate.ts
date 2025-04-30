
/**
 * This hook fetches the form template for anamesis entries based on the organization ID.
 * It prioritizes organization-specific templates, falling back to the global standard template
 * when no organization-specific template exists.
 * Returns both the template schema and metadata like the form ID.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { useOrganization } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";
import { AnamnesForm, FormTemplate } from "@/types/anamnesis";

export interface FormTemplateWithMeta {
  schema: FormTemplate;
  id: string;
  title: string;
  organization_id: string | null;
}

export const useFormTemplate = () => {
  const { organization } = useOrganization();
  const { supabase } = useSupabaseClient();
  
  return useQuery({
    queryKey: ["form-template", organization?.id],
    queryFn: async (): Promise<FormTemplateWithMeta | null> => {
      try {
        // Get organization-specific template or fall back to global template
        // Using type assertion since 'anamnes_forms' isn't in the generated types yet
        const { data, error } = await supabase
          .from('anamnes_forms' as any)
          .select("*")
          .or(`organization_id.eq.${organization?.id},organization_id.is.null`)
          .order("organization_id", { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching form template:", error);
          throw new Error("Kunde inte hämta formulärmallen");
        }
        
        if (!data) {
          return null;
        }
        
        // Type assertion to handle the schema property
        const formData = data as unknown as AnamnesForm;
        
        return {
          schema: formData.schema,
          id: formData.id,
          title: formData.title,
          organization_id: formData.organization_id
        };
      } catch (err) {
        console.error("Error in useFormTemplate:", err);
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
    enabled: !!supabase && !!organization?.id,
  });
};
