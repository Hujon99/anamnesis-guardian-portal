/**
 * This hook fetches the form template for anamesis entries based on the organization ID.
 * It prioritizes organization-specific templates, falling back to the global standard template
 * when no organization-specific template exists.
 * Returns both the template schema and metadata like the form ID.
 * Enhanced with improved SQL safety and error handling.
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
        console.log("[useFormTemplate]: Fetching template for org:", organization?.id || "No org ID");
        
        if (!supabase) {
          console.error("[useFormTemplate]: Supabase client not initialized");
          return null;
        }
        
        // Start with initial query for anamnes_forms
        let query = supabase
          .from('anamnes_forms')
          .select("*");

        // Apply proper filtering - safely handling organization ID
        if (organization?.id) {
          // First get organization-specific template if it exists
          const { data: orgTemplate, error: orgError } = await supabase
            .from('anamnes_forms')
            .select("*")
            .eq('organization_id', organization.id)
            .maybeSingle();
            
          if (orgError) {
            console.error("[useFormTemplate]: Error fetching org template:", orgError);
          }
          
          // If we found an org-specific template, return it directly
          if (orgTemplate) {
            console.log("[useFormTemplate]: Using organization-specific template");
            const formData = orgTemplate as unknown as AnamnesForm;
            
            return {
              schema: formData.schema,
              id: formData.id,
              title: formData.title,
              organization_id: formData.organization_id
            };
          }
          
          // Otherwise, fetch the default template
          console.log("[useFormTemplate]: No org template found, using default");
          const { data: defaultTemplate, error: defaultError } = await supabase
            .from('anamnes_forms')
            .select("*")
            .is('organization_id', null)
            .maybeSingle();
            
          if (defaultError) {
            console.error("[useFormTemplate]: Error fetching default template:", defaultError);
            throw new Error("Kunde inte hämta formulärmallen: " + defaultError.message);
          }
          
          if (!defaultTemplate) {
            console.log("[useFormTemplate]: No default template found");
            return null;
          }
          
          const formData = defaultTemplate as unknown as AnamnesForm;
          
          return {
            schema: formData.schema,
            id: formData.id,
            title: formData.title,
            organization_id: formData.organization_id
          };
        } else {
          // No organization ID, just get the default template
          const { data, error } = await supabase
            .from('anamnes_forms')
            .select("*")
            .is('organization_id', null)
            .maybeSingle();
            
          if (error) {
            console.error("[useFormTemplate]: Error fetching default template:", error);
            throw new Error("Kunde inte hämta formulärmallen: " + error.message);
          }
          
          if (!data) {
            console.log("[useFormTemplate]: No default template found");
            return null;
          }
          
          // Type assertion to handle the schema property - AFTER we've checked that data exists
          const formData = data as unknown as AnamnesForm;
          
          console.log("[useFormTemplate]: Default template found:", 
            formData.id, 
            "organization:", 
            formData.organization_id || "default"
          );
          
          return {
            schema: formData.schema,
            id: formData.id,
            title: formData.title,
            organization_id: formData.organization_id
          };
        }
      } catch (err: any) {
        console.error("[useFormTemplate]: Error:", err);
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
    enabled: !!supabase, // Only run when supabase client is available
    retry: 2, // Limit retries to prevent loops
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
  });
};
