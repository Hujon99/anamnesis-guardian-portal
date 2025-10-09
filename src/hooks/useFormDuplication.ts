/**
 * Hook for duplicating forms from templates.
 * Performs deep cloning while preserving all question IDs to ensure
 * conditional logic references remain intact across duplications.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { toast } from "@/hooks/use-toast";
import { FormTemplate, FormSection, FormQuestion } from "@/types/anamnesis";
import { FormTemplateData } from "./useFormTemplates";

export interface DuplicateFormData {
  templateId: string;
  newTitle: string;
  examinationType?: string;
  templateCategory?: string;
}

export const useFormDuplication = () => {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { supabase } = useSupabaseClient();
  const queryClient = useQueryClient();

  const cloneFormSchema = (schema: FormTemplate): FormTemplate => {
    // Deep clone to preserve all IDs and structure - this ensures conditional logic works
    return JSON.parse(JSON.stringify(schema));
  };

  const duplicateForm = useMutation({
    mutationFn: async (duplicateData: DuplicateFormData) => {
      if (!supabase || !organization?.id) {
        throw new Error("Supabase client eller organisation saknas");
      }

      // First, fetch the template
      const { data: template, error: fetchError } = await supabase
        .from('anamnes_forms')
        .select("*")
        .eq('id', duplicateData.templateId)
        .single();

      if (fetchError) {
        console.error("[useFormDuplication]: Fetch template error:", fetchError);
        throw new Error("Kunde inte hämta mall: " + fetchError.message);
      }

      if (!template) {
        throw new Error("Mall hittades inte");
      }

      // Clone the schema preserving all IDs
      const clonedSchema = cloneFormSchema(template.schema as unknown as FormTemplate);

      // Create the new form
      const { data: newForm, error: createError } = await supabase
        .from('anamnes_forms')
        .insert({
          title: duplicateData.newTitle,
          examination_type: (duplicateData.examinationType || template.examination_type) as any,
          schema: clonedSchema as any,
          organization_id: organization.id,
          is_template: false,
          template_category: duplicateData.templateCategory,
          created_from_template_id: duplicateData.templateId,
          last_modified_by: user?.id,
          version: 1,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error("[useFormDuplication]: Create error:", createError);
        throw new Error("Kunde inte skapa formulär från mall: " + createError.message);
      }

      return newForm;
    },
    onSuccess: (newForm) => {
      queryClient.invalidateQueries({ queryKey: ["organization-forms"] });
      toast({
        title: "Formulär duplicerat",
        description: `"${newForm.title}" har skapats från mallen`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel uppstod",
        description: error.message || "Kunde inte duplicera formulär",
        variant: "destructive",
      });
    },
  });

  const duplicateAsTemplate = useMutation({
    mutationFn: async (data: { formId: string; newTitle: string; category: string }) => {
      if (!supabase || !organization?.id) {
        throw new Error("Supabase client eller organisation saknas");
      }

      // Fetch the source form
      const { data: sourceForm, error: fetchError } = await supabase
        .from('anamnes_forms')
        .select("*")
        .eq('id', data.formId)
        .eq('organization_id', organization.id)
        .single();

      if (fetchError || !sourceForm) {
        throw new Error("Kunde inte hämta källformulär");
      }

      // Create template
      const { data: template, error: createError } = await supabase
        .from('anamnes_forms')
        .insert({
          title: data.newTitle,
          examination_type: sourceForm.examination_type as any,
          schema: cloneFormSchema(sourceForm.schema as unknown as FormTemplate) as any,
          organization_id: organization.id,
          is_template: true,
          template_category: data.category,
          created_from_template_id: sourceForm.created_from_template_id,
          last_modified_by: user?.id,
          version: 1,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        throw new Error("Kunde inte skapa mall: " + createError.message);
      }

      return template;
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast({
        title: "Mall skapad",
        description: `"${template.title}" har skapats som mall`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel uppstod",
        description: error.message || "Kunde inte skapa mall",
        variant: "destructive",
      });
    },
  });

  return {
    duplicateForm: duplicateForm.mutate,
    duplicateAsTemplate: duplicateAsTemplate.mutate,
    isDuplicating: duplicateForm.isPending,
    isCreatingTemplate: duplicateAsTemplate.isPending,
    isLoading: duplicateForm.isPending || duplicateAsTemplate.isPending
  };
};
