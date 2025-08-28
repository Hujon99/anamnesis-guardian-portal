/**
 * This hook fetches all available forms for an organization, returning them as examination type options.
 * Used by components that need to present multiple form choices to users, like the DirectFormButton
 * examination type selector. Returns both organization-specific and default forms.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { useOrganization } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";
import { ExaminationType, EXAMINATION_TYPE_OPTIONS } from "@/types/examinationType";

export interface OrganizationForm {
  id: string;
  title: string;
  examination_type: string;
  organization_id: string | null;
  icon: string;
  description: string;
}

interface DatabaseForm {
  id: string;
  title: string;
  examination_type: string;
  organization_id: string | null;
  created_at: string;
}

export const useOrganizationForms = () => {
  const { organization } = useOrganization();
  const { supabase } = useSupabaseClient();
  
  return useQuery({
    queryKey: ["organization-forms", organization?.id],
    queryFn: async (): Promise<OrganizationForm[]> => {
      try {
        if (!supabase) {
          console.error("[useOrganizationForms]: Supabase client not initialized");
          return [];
        }
        
        let allForms: DatabaseForm[] = [];
        
        if (organization?.id) {
          // First, get organization-specific forms
          const { data: orgForms, error: orgError } = await supabase
            .from('anamnes_forms')
            .select("id, title, examination_type, organization_id, created_at")
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false });
            
          if (orgError) {
            console.error("[useOrganizationForms]: Error fetching org forms:", orgError);
          } else if (orgForms) {
            allForms = [...allForms, ...orgForms];
          }
          
          // Get default forms for examination types not covered by org forms
          const orgExaminationTypes = orgForms?.map(f => f.examination_type) || [];
          
          if (orgExaminationTypes.length < EXAMINATION_TYPE_OPTIONS.length) {
            const { data: defaultForms, error: defaultError } = await supabase
              .from('anamnes_forms')
              .select("id, title, examination_type, organization_id, created_at")
              .is('organization_id', null)
              .order('created_at', { ascending: false });
              
            if (defaultError) {
              console.error("[useOrganizationForms]: Error fetching default forms:", defaultError);
            } else if (defaultForms) {
              // Only include default forms for types not already covered by org forms
              const uniqueDefaultForms = defaultForms.filter(form => 
                !orgExaminationTypes.includes(form.examination_type)
              );
              allForms = [...allForms, ...uniqueDefaultForms];
            }
          }
        } else {
          // No organization, just get default forms
          const { data: defaultForms, error: defaultError } = await supabase
            .from('anamnes_forms')
            .select("id, title, examination_type, organization_id, created_at")
            .is('organization_id', null)
            .order('created_at', { ascending: false });
            
          if (defaultError) {
            console.error("[useOrganizationForms]: Error fetching default forms:", defaultError);
            throw new Error("Kunde inte hämta formulär: " + defaultError.message);
          }
          
          if (defaultForms) {
            allForms = defaultForms;
          }
        }
        
        // Convert to OrganizationForm format with icons and descriptions
        const organizationForms: OrganizationForm[] = allForms.map(form => {
          const typeOption = EXAMINATION_TYPE_OPTIONS.find(opt => 
            opt.type.toLowerCase() === form.examination_type.toLowerCase()
          ) || EXAMINATION_TYPE_OPTIONS[0]; // fallback to first option
          
          return {
            id: form.id,
            title: form.title,
            examination_type: form.examination_type,
            organization_id: form.organization_id,
            icon: typeOption.icon,
            description: typeOption.description
          };
        });
        
        // Remove duplicates by examination_type (prefer org-specific over default)
        const uniqueForms = organizationForms.reduce((acc, form) => {
          const existing = acc.find(f => f.examination_type === form.examination_type);
          if (!existing) {
            acc.push(form);
          } else if (form.organization_id && !existing.organization_id) {
            // Replace default with org-specific
            const index = acc.indexOf(existing);
            acc[index] = form;
          }
          return acc;
        }, [] as OrganizationForm[]);
        
        return uniqueForms.sort((a, b) => a.title.localeCompare(b.title));
        
      } catch (err: any) {
        console.error("[useOrganizationForms]: Error:", err);
        toast({
          title: "Ett fel uppstod",
          description: "Kunde inte hämta tillgängliga formulär",
          variant: "destructive",
        });
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled: !!supabase, // Only run when supabase client is available
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000),
  });
};