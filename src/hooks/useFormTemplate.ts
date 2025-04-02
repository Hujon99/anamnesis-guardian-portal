
/**
 * This hook fetches the form template for anamesis entries based on the organization ID.
 * It prioritizes organization-specific templates, falling back to the global standard template
 * when no organization-specific template exists.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { useOrganization } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";

export interface FormQuestion {
  id: string;
  label: string;
  type: "text" | "radio" | "select" | "checkbox";
  options?: string[];
  show_if?: {
    question: string;
    equals: string;
  };
}

export interface FormTemplate {
  title: string;
  questions: FormQuestion[];
}

export const useFormTemplate = () => {
  const { organization } = useOrganization();
  const { supabase } = useSupabaseClient();
  
  return useQuery({
    queryKey: ["form-template", organization?.id],
    queryFn: async (): Promise<FormTemplate | null> => {
      try {
        // Get organization-specific template or fall back to global template
        const { data, error } = await supabase
          .from("anamnes_forms")
          .select("*")
          .or(`organization_id.eq.${organization?.id},organization_id.is.null`)
          .order("organization_id", { ascending: false })
          .limit(1)
          .single();
          
        if (error) {
          console.error("Error fetching form template:", error);
          throw new Error("Kunde inte hämta formulärmallen");
        }
        
        if (!data) {
          return null;
        }
        
        return data.schema as FormTemplate;
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
    enabled: !!supabase,
  });
};
