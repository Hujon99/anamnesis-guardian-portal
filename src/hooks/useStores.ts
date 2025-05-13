/**
 * This hook provides functionality for managing stores.
 * It includes querying store data, creating new stores, and updating existing stores.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { Store } from '@/types/anamnesis';
import { toast } from '@/components/ui/use-toast';

export function useStores() {
  const { organization } = useOrganization();
  const { supabase, isReady } = useSupabaseClient();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  
  // Query to fetch all stores for the organization
  const {
    data: stores = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['stores', organization?.id],
    queryFn: async () => {
      if (!organization?.id || !isReady) return [];
      
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('organization_id', organization.id)
          .order('name');
          
        if (error) throw error;
        return data as Store[];
      } catch (err) {
        console.error('Error fetching stores:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    enabled: !!organization?.id && isReady,
  });
  
  // Mutation to create a new store
  const createStoreMutation = useMutation({
    mutationFn: async (newStore: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }
      
      const { data, error } = await supabase
        .from('stores')
        .insert({
          ...newStore,
          organization_id: organization.id
        })
        .select()
        .single();
        
      if (error) throw error;
      return data as Store;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', organization?.id] });
      toast({
        title: "Butik skapad",
        description: "Butiken har skapats framgångsrikt",
      });
    },
    onError: (error) => {
      console.error('Error creating store:', error);
      toast({
        title: "Fel vid skapande av butik",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update an existing store
  const updateStoreMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Store> & { id: string }) => {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data as Store;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', organization?.id] });
      toast({
        title: "Butik uppdaterad",
        description: "Butiken har uppdaterats framgångsrikt",
      });
    },
    onError: (error) => {
      console.error('Error updating store:', error);
      toast({
        title: "Fel vid uppdatering av butik",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });
  
  // Function to find or create a store by name
  const findOrCreateStore = async (name: string) => {
    if (!organization?.id || !isReady) {
      throw new Error('No organization selected or Supabase client not ready');
    }
    
    try {
      // Try to find an existing store
      const { data: existingStores, error: findError } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', organization.id)
        .ilike('name', name)
        .limit(1);
        
      if (findError) throw findError;
      
      // If store exists, return it
      if (existingStores && existingStores.length > 0) {
        return existingStores[0] as Store;
      }
      
      // Otherwise create a new store
      const { data: newStore, error: createError } = await supabase
        .from('stores')
        .insert({
          name,
          organization_id: organization.id
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Refresh the stores list
      queryClient.invalidateQueries({ queryKey: ['stores', organization.id] });
      
      return newStore as Store;
    } catch (err) {
      console.error('Error finding or creating store:', err);
      throw err;
    }
  };
  
  return {
    stores,
    isLoading,
    error,
    refetch,
    createStore: createStoreMutation.mutateAsync,
    updateStore: updateStoreMutation.mutateAsync,
    findOrCreateStore
  };
}
