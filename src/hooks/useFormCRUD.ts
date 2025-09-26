/**
 * Hook for form CRUD operations in the Form Builder.
 * Provides create, read, update, delete functionality for forms
 * with proper organization-level permissions and validation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { toast } from "@/hooks/use-toast";
import { FormTemplate } from "@/types/anamnesis";

export interface CreateFormData {
  title: string;
  examination_type: string;
  schema: FormTemplate;
  is_template?: boolean;
  template_category?: string;
  created_from_template_id?: string;
}

export interface UpdateFormData {
  id: string;
  title?: string;
  examination_type?: string;
  schema?: FormTemplate;
  is_active?: boolean;
}

export const useFormCRUD = () => {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { supabase } = useSupabaseClient();
  const queryClient = useQueryClient();

  const createForm = useMutation({
    mutationFn: async (formData: CreateFormData) => {
      if (!supabase || !organization?.id) {
        throw new Error("Supabase client eller organisation saknas");
      }

      const { data, error } = await supabase
        .from('anamnes_forms')
        .insert({
          title: formData.title,
          examination_type: formData.examination_type as any,
          schema: formData.schema as any,
          organization_id: organization.id,
          is_template: formData.is_template || false,
          template_category: formData.template_category,
          created_from_template_id: formData.created_from_template_id,
          last_modified_by: user?.id,
          version: 1,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error("[useFormCRUD]: Create error:", error);
        throw new Error("Kunde inte skapa formulär: " + error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-forms"] });
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast({
        title: "Formulär skapat",
        description: "Det nya formuläret har skapats framgångsrikt",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel uppstod",
        description: error.message || "Kunde inte skapa formulär",
        variant: "destructive",
      });
    },
  });

  const updateForm = useMutation({
    mutationFn: async (formData: UpdateFormData) => {
      if (!supabase || !organization?.id) {
        throw new Error("Supabase client eller organisation saknas");
      }

      const updateData: any = {
        last_modified_by: user?.id
      };

      if (formData.title !== undefined) updateData.title = formData.title;
      if (formData.examination_type !== undefined) updateData.examination_type = formData.examination_type as any;
      if (formData.schema !== undefined) updateData.schema = formData.schema as any;
      if (formData.is_active !== undefined) updateData.is_active = formData.is_active;

      const { data, error } = await supabase
        .from('anamnes_forms')
        .update(updateData)
        .eq('id', formData.id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error("[useFormCRUD]: Update error:", error);
        throw new Error("Kunde inte uppdatera formulär: " + error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-forms"] });
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast({
        title: "Formulär uppdaterat",
        description: "Formuläret har uppdaterats framgångsrikt",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel uppstod",
        description: error.message || "Kunde inte uppdatera formulär",
        variant: "destructive",
      });
    },
  });

  const deleteForm = useMutation({
    mutationFn: async (formId: string) => {
      if (!supabase || !organization?.id) {
        throw new Error("Supabase client eller organisation saknas");
      }

      const { error } = await supabase
        .from('anamnes_forms')
        .delete()
        .eq('id', formId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error("[useFormCRUD]: Delete error:", error);
        throw new Error("Kunde inte ta bort formulär: " + error.message);
      }

      return formId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-forms"] });
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast({
        title: "Formulär borttaget",
        description: "Formuläret har tagits bort framgångsrikt",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel uppstod",
        description: error.message || "Kunde inte ta bort formulär",
        variant: "destructive",
      });
    },
  });

  return {
    createForm: createForm.mutate,
    updateForm: updateForm.mutate,
    deleteForm: deleteForm.mutate,
    isCreating: createForm.isPending,
    isUpdating: updateForm.isPending,
    isDeleting: deleteForm.isPending,
    isLoading: createForm.isPending || updateForm.isPending || deleteForm.isPending
  };
};