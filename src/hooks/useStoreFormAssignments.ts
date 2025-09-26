/**
 * Hook for managing store-form assignments in an organization.
 * Handles fetching, creating, updating, and deleting assignments between stores and forms.
 * Used by admins to control which forms are available in which stores.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { toast } from "@/components/ui/use-toast";

export interface StoreFormAssignment {
  id: string;
  store_id: string;
  form_id: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  store?: {
    id: string;
    name: string;
  };
  form?: {
    id: string;
    title: string;
    examination_type?: string;
  };
}

export const useStoreFormAssignments = (organizationId?: string) => {
  const { supabase } = useSupabaseClient();
  const queryClient = useQueryClient();

  // Fetch all store-form assignments for an organization
  const {
    data: assignments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["store-form-assignments", organizationId],
    queryFn: async (): Promise<StoreFormAssignment[]> => {
      if (!supabase || !organizationId) return [];

      const { data, error } = await supabase
        .from('store_forms')
        .select(`
          *,
          store:stores(id, name),
          form:anamnes_forms(id, title, examination_type)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[useStoreFormAssignments]: Error fetching assignments:", error);
        throw new Error("Kunde inte hämta formulärtilldelningar: " + error.message);
      }

      return data as StoreFormAssignment[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!supabase && !!organizationId,
  });

  // Create or update store-form assignment
  const assignmentMutation = useMutation({
    mutationFn: async ({ storeId, formId, isActive }: { 
      storeId: string; 
      formId: string; 
      isActive: boolean; 
    }) => {
      if (!supabase || !organizationId) {
        throw new Error("Supabase client eller organisation saknas");
      }

      const { data, error } = await supabase
        .from('store_forms')
        .upsert({
          store_id: storeId,
          form_id: formId,
          organization_id: organizationId,
          is_active: isActive,
        }, {
          onConflict: 'store_id,form_id'
        })
        .select()
        .single();

      if (error) {
        console.error("[useStoreFormAssignments]: Error updating assignment:", error);
        throw new Error("Kunde inte uppdatera formulärtilldelning: " + error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-form-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["forms-by-store"] });
      toast({
        title: "Uppdaterat",
        description: "Formulärtilldelningen har uppdaterats",
      });
    },
    onError: (error: any) => {
      console.error("[useStoreFormAssignments]: Mutation error:", error);
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Kunde inte uppdatera formulärtilldelningen",
        variant: "destructive",
      });
    },
  });

  // Bulk update assignments for a store
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ storeId, formIds, isActive }: {
      storeId: string;
      formIds: string[];
      isActive: boolean;
    }) => {
      if (!supabase || !organizationId) {
        throw new Error("Supabase client eller organisation saknas");
      }

      const assignments = formIds.map(formId => ({
        store_id: storeId,
        form_id: formId,
        organization_id: organizationId,
        is_active: isActive,
      }));

      const { error } = await supabase
        .from('store_forms')
        .upsert(assignments, {
          onConflict: 'store_id,form_id'
        });

      if (error) {
        console.error("[useStoreFormAssignments]: Error bulk updating:", error);
        throw new Error("Kunde inte uppdatera formulärtilldelningar: " + error.message);
      }
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["store-form-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["forms-by-store"] });
      toast({
        title: "Uppdaterat",
        description: `Formulär har ${isActive ? 'aktiverats' : 'inaktiverats'} för butiken`,
      });
    },
    onError: (error: any) => {
      console.error("[useStoreFormAssignments]: Bulk update error:", error);
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Kunde inte uppdatera formulärtilldelningarna",
        variant: "destructive",
      });
    },
  });

  return {
    assignments,
    isLoading,
    error,
    refetch,
    updateAssignment: assignmentMutation.mutate,
    bulkUpdateAssignments: bulkUpdateMutation.mutate,
    isUpdating: assignmentMutation.isPending || bulkUpdateMutation.isPending,
  };
};