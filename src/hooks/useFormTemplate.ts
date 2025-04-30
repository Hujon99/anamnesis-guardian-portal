
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
        console.log("[useFormTemplate]: Fetching template for org:", organization?.id || "No org ID");
        
        if (!supabase) {
          console.error("[useFormTemplate]: Supabase client not initialized");
          return null;
        }
        
        // Get organization-specific template or fall back to global template
        const query = supabase
          .from('anamnes_forms')
          .select("*");
          
        // Apply filters properly without string interpolation
        if (organization?.id) {
          // Use .or() with proper parameter syntax
          query.or(`organization_id.eq.${organization.id},organization_id.is.null`);
        } else {
          query.filter('organization_id', 'is', null);
        }
        
        // Order and limit
        const { data, error } = await query
          .order("organization_id", { ascending: false }) // Organization-specific first, then null (default)
          .limit(1)
          .maybeSingle();
          
        if (error) {
          console.error("[useFormTemplate]: Error fetching form template:", error);
          throw new Error("Kunde inte hämta formulärmallen: " + error.message);
        }
        
        if (!data) {
          console.log("[useFormTemplate]: No template found");
          return null;
        }
        
        // Type assertion to handle the schema property - AFTER we've checked that data exists
        const formData = data as unknown as AnamnesForm;
        
        console.log("[useFormTemplate]: Template found:", 
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
