/**
 * This hook provides functionality for managing stores with enhanced caching and error recovery.
 * It includes robust fetching for store data, persistent caching, and automatic recovery mechanisms.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { Store } from '@/types/anamnesis';
import { toast } from '@/components/ui/use-toast';

// Local storage key for store cache
const STORE_CACHE_KEY = 'binokel_store_cache';
const STORE_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export function useStores() {
  const { organization } = useOrganization();
  const { supabase, isReady, refreshClient } = useSupabaseClient();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [storeMapCache, setStoreMapCache] = useState<Map<string, string>>(new Map());
  const lastRefreshRef = useRef<number>(0);
  const loadingFromCacheRef = useRef<boolean>(false);
  const storeCacheInitializedRef = useRef<boolean>(false);
  
  // Initialize with empty array to prevent undefined
  const [localStoresBackup, setLocalStoresBackup] = useState<Store[]>([]);
  
  // Load cached stores from localStorage on initial mount
  useEffect(() => {
    try {
      if (storeCacheInitializedRef.current) return;
      storeCacheInitializedRef.current = true;
      
      loadingFromCacheRef.current = true;
      const cachedData = localStorage.getItem(STORE_CACHE_KEY);
      
      if (cachedData && organization?.id) {
        const { stores, timestamp, organizationId } = JSON.parse(cachedData);
        
        // Check if cache is still valid and for the same organization
        if (Date.now() - timestamp < STORE_CACHE_EXPIRY && 
            Array.isArray(stores) && 
            organizationId === organization.id) {
          console.log(`useStores: Loading ${stores.length} stores from local cache for org ${organization.id}`);
          
          // Keep a local copy as a fallback
          setLocalStoresBackup(stores as Store[]);
          
          // Update store map from cache
          const newStoreMap = new Map<string, string>();
          stores.forEach((store: Store) => {
            newStoreMap.set(store.id, store.name);
          });
          setStoreMapCache(newStoreMap);
          
          // Seed react-query cache
          queryClient.setQueryData(['stores', organization?.id], stores);
        }
      }
    } catch (err) {
      console.error('Error loading stores from cache:', err);
    } finally {
      loadingFromCacheRef.current = false;
    }
  }, [organization?.id, queryClient]);
  
  // Function to handle refreshing on token errors with improved logging
  const fetchStoresWithRetry = useCallback(async (retryCount = 0) => {
    if (!organization?.id || !isReady) {
      // Return local backup if we can't fetch
      return localStoresBackup;
    }
    
    const maxRetries = 2;
    
    try {
      console.log(`useStores: Fetching stores for organization ${organization.id}, attempt ${retryCount + 1}`);
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');
        
      if (error) {
        // Check if it's an auth error that might benefit from a token refresh
        const isAuthError = error.code === "PGRST301" || 
                          error.message?.includes("JWT") || 
                          error.message?.includes("401");
                          
        if (isAuthError && retryCount < maxRetries) {
          console.log(`JWT error detected (${error.code}): ${error.message}`);
          console.log(`Refreshing token and retrying (attempt ${retryCount + 1})`);
          
          // Wait a bit and retry after refreshing the client
          await new Promise(resolve => setTimeout(resolve, 1000));
          await refreshClient(true);
          return fetchStoresWithRetry(retryCount + 1);
        }
        
        throw error;
      }
      
      // Ensure we always have an array
      const safeData = Array.isArray(data) ? data : [];
      
      // Update last successful fetch time
      lastRefreshRef.current = Date.now();
      console.log(`useStores: Successfully fetched ${safeData.length} stores for org ${organization.id}:`, safeData);
      
      // FIX: Explicitly cast the data to Store[] with proper type handling for metadata
      const typedStoreData: Store[] = safeData.map(store => ({
        ...store,
        // Ensure metadata is properly handled
        metadata: store.metadata
      })) as Store[];
      
      // Update local backup
      setLocalStoresBackup(typedStoreData);
      
      // Save to localStorage for persistent cache with organization context
      try {
        localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
          stores: typedStoreData,
          timestamp: Date.now(),
          organizationId: organization.id
        }));
        console.log(`useStores: Saved ${typedStoreData.length} stores to local cache for org ${organization.id}`);
      } catch (cacheError) {
        console.error('Failed to cache stores in localStorage:', cacheError);
      }
      
      // Update the storeMap cache when new data is fetched
      const newStoreMap = new Map<string, string>();
      typedStoreData.forEach(store => {
        if (store && store.id && store.name) {
          newStoreMap.set(store.id, store.name);
        }
      });
      setStoreMapCache(newStoreMap);
      
      return typedStoreData;
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // If fetching fails, return local backup only if it's for the same organization
      if (localStoresBackup.length > 0) {
        console.log(`useStores: Falling back to ${localStoresBackup.length} locally backed up stores due to fetch error`);
        return localStoresBackup;
      }
      
      // If no local backup, try to use cached data for the same organization
      const cachedData = localStorage.getItem(STORE_CACHE_KEY);
      if (cachedData) {
        try {
          const { stores, organizationId } = JSON.parse(cachedData);
          if (Array.isArray(stores) && stores.length > 0 && organizationId === organization.id) {
            console.log(`useStores: Falling back to ${stores.length} cached stores for org ${organization.id} due to fetch error`);
            // FIX: Explicitly cast the cached data to Store[] with proper type handling
            const typedStores = stores.map((store: any) => ({
              ...store,
              metadata: store.metadata
            })) as Store[];
            
            setLocalStoresBackup(typedStores);
            return typedStores;
          }
        } catch (cacheErr) {
          console.error('Error reading from store cache:', cacheErr);
        }
      }
      
      // Last resort - return empty array instead of undefined
      return [];
    }
  }, [organization?.id, isReady, supabase, refreshClient, localStoresBackup]);
  
  // Query to fetch all stores for the organization with optimized settings
  const {
    data: stores = [],
    isLoading,
    refetch,
    isFetching,
    isError,
    isSuccess
  } = useQuery({
    queryKey: ['stores', organization?.id],
    queryFn: () => fetchStoresWithRetry(),
    enabled: !!organization?.id && isReady,
    staleTime: 15 * 60 * 1000, // Consider data fresh for 15 minutes - improved performance
    gcTime: 30 * 60 * 1000,   // Keep cached data for 30 minutes
    retry: 2,                 // Retry failed queries twice
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
    initialData: localStoresBackup,
  });

  // Generate a store map each time the stores change, with improved logging
  useEffect(() => {
    // Always ensure stores is an array to prevent "undefined is not iterable"
    const storesArray = Array.isArray(stores) ? stores : [];
    
    if (storesArray.length > 0 && !loadingFromCacheRef.current) {
      const newStoreMap = new Map<string, string>();
      storesArray.forEach(store => {
        if (store && store.id && store.name) {
          newStoreMap.set(store.id, store.name);
        }
      });
      console.log(`useStores: Generated map with ${newStoreMap.size} store entries`);
      setStoreMapCache(newStoreMap);
      
      // Update the localStorage cache whenever we get new data
      try {
        localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
          stores: storesArray,
          timestamp: Date.now(),
          organizationId: organization.id
        }));
      } catch (err) {
        console.error('Failed to update store cache:', err);
      }
      
      // Update local backup - cast safely to Store[]
      setLocalStoresBackup(storesArray as Store[]);
    }
  }, [stores]);
  
  // Create a getter function for store names to ensure consistent lookup
  const getStoreName = useCallback((storeId: string | null | undefined): string | null => {
    if (!storeId) return null;
    
    // First try our in-memory map for the fastest lookup
    const name = storeMapCache.get(storeId);
    
    // If not found in memory, try the stores array as fallback
    if (!name && stores) {
      // Always ensure stores is an array to prevent "undefined is not iterable"
      const storesArray = Array.isArray(stores) ? stores : [];
      const storeFromArray = storesArray.find(s => s.id === storeId);
      if (storeFromArray) {
        console.log(`useStores: Store ${storeId} not in map but found in array: ${storeFromArray.name}`);
        return storeFromArray.name;
      }
    }
    
    // Try local backup
    if (!name && localStoresBackup.length > 0) {
      const storeFromBackup = localStoresBackup.find(s => s.id === storeId);
      if (storeFromBackup) {
        console.log(`useStores: Store ${storeId} found in local backup: ${storeFromBackup.name}`);
        return storeFromBackup.name;
      }
    }
    
    // Last resort: try to get from localStorage cache
    if (!name) {
      try {
        const cachedData = localStorage.getItem(STORE_CACHE_KEY);
        if (cachedData) {
          const { stores: cachedStores } = JSON.parse(cachedData);
          if (Array.isArray(cachedStores)) {
            const storeFromCache = cachedStores.find((s: Store) => s.id === storeId);
            if (storeFromCache) {
              console.log(`useStores: Store ${storeId} found in localStorage cache: ${storeFromCache.name}`);
              return storeFromCache.name;
            }
          }
        }
      } catch (err) {
        console.error('Error reading from store cache:', err);
      }
    }
    
    return name || null;
  }, [storeMapCache, stores, localStoresBackup]);
  
  // Add a function to get the full store map
  const getStoreMap = useCallback((): Map<string, string> => {
    return storeMapCache;
  }, [storeMapCache]);
  
  // Force refresh function that clears cache and fetches fresh data
  const forceRefreshStores = useCallback(async () => {
    console.log('useStores: Force refreshing stores data');
    
    try {
      // Only force token refresh if it's been at least 30 seconds since last refresh
      const shouldRefreshToken = Date.now() - lastRefreshRef.current > 30000;
      
      if (shouldRefreshToken) {
        await refreshClient(true);
        console.log('useStores: Refreshed auth token');
      }
      
      // Clear the query cache for stores
      queryClient.removeQueries({ queryKey: ['stores', organization?.id] });
      
      // Fetch fresh data
      const result = await refetch();
      
      if (result.isSuccess) {
        const fetchedStores = result.data || [];
        
        toast({
          title: "Butiker uppdaterade",
          description: `${fetchedStores.length} butiker har hämtats framgångsrikt`,
        });
        
        return fetchedStores;
      }
      
      // If refetch wasn't successful, return local backup
      return localStoresBackup;
    } catch (err) {
      console.error('Error during force refresh of stores:', err);
      
      toast({
        title: "Kunde inte uppdatera butikslistan",
        description: err instanceof Error ? err.message : "Ett fel uppstod",
        variant: "destructive",
      });
      
      // Return local backup in case of error
      return localStoresBackup;
    }
  }, [organization?.id, queryClient, refetch, refreshClient, localStoresBackup]);
  
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
      return data as unknown as Store;
    },
    onSuccess: (newStore) => {
      // Update the query cache with the new store
      queryClient.setQueryData(
        ['stores', organization?.id],
        (oldData: Store[] = []) => {
          // Add and sort
          const updatedStores = [...oldData, newStore].sort((a, b) => 
            a.name.localeCompare(b.name, 'sv')
          );
          
          // Update localStorage cache
          try {
            localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
              stores: updatedStores,
              timestamp: Date.now(),
              organizationId: organization.id
            }));
          } catch (err) {
            console.error('Failed to update store cache after creation:', err);
          }
          
          return updatedStores;
        }
      );
      
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
      return data as unknown as Store;
    },
    onSuccess: (updatedStore) => {
      // Update the query cache with the updated store
      queryClient.setQueryData(
        ['stores', organization?.id],
        (oldData: Store[] = []) => {
          const updatedStores = oldData.map(store => 
            store.id === updatedStore.id ? updatedStore : store
          );
          
          // Update localStorage cache
          try {
            localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
              stores: updatedStores,
              timestamp: Date.now(),
              organizationId: organization.id
            }));
          } catch (err) {
            console.error('Failed to update store cache after update:', err);
          }
          
          return updatedStores;
        }
      );
      
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
  
  // Function to find or create a store by name with improved caching and organization validation
  const findOrCreateStore = async (name: string) => {
    if (!organization?.id || !isReady) {
      throw new Error('No organization selected or Supabase client not ready');
    }
    
    try {
      console.log(`useStores: Finding or creating store with name "${name}" for org ${organization.id}`);
      
      // First check local cache/memory for the current organization
      const existingStoreInMemory = stores.find(
        store => store.name.toLowerCase() === name.toLowerCase() && store.organization_id === organization.id
      );
      
      if (existingStoreInMemory) {
        console.log(`useStores: Found existing store in memory: ${existingStoreInMemory.name} for org ${organization.id}`);
        return existingStoreInMemory;
      }
      
      // Try to find an existing store in the current organization
      const { data: existingStores, error: findError } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', organization.id)
        .ilike('name', name)
        .limit(1);
        
      if (findError) throw findError;
      
      // If store exists, return it
      if (existingStores && existingStores.length > 0) {
        console.log(`useStores: Found existing store in database: ${existingStores[0].name} for org ${organization.id}`);
        
        // Cast to ensure type compatibility
        const existingStore = existingStores[0] as unknown as Store;
        
        // Update our cache with this confirmed store
        queryClient.setQueryData(
          ['stores', organization.id],
          (oldData: Store[] = []) => {
            // Skip if store already exists in cache
            if (oldData.some(s => s.id === existingStore.id)) {
              return oldData;
            }
            
            // Add the store to our cache
            const updatedStores = [...oldData, existingStore].sort((a, b) => 
              a.name.localeCompare(b.name, 'sv')
            );
            
            // Update localStorage with organization context
            try {
              localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
                stores: updatedStores,
                timestamp: Date.now(),
                organizationId: organization.id
              }));
            } catch (err) {
              console.error('Failed to update store cache:', err);
            }
            
            return updatedStores;
          }
        );
        
        return existingStore;
      }
      
      // Otherwise create a new store in the current organization
      console.log(`useStores: Creating new store: ${name} for org ${organization.id}`);
      const { data: newStore, error: createError } = await supabase
        .from('stores')
        .insert({
          name,
          organization_id: organization.id
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Cast the new store to ensure type compatibility
      const typedNewStore = newStore as unknown as Store;
      
      // Update the query cache with the new store
      queryClient.setQueryData(
        ['stores', organization.id],
        (oldData: Store[] = []) => {
          const updatedStores = [...oldData, typedNewStore].sort((a, b) => 
            a.name.localeCompare(b.name, 'sv')
          );
          
          // Update localStorage with organization context
          try {
            localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
              stores: updatedStores,
              timestamp: Date.now(),
              organizationId: organization.id
            }));
          } catch (err) {
            console.error('Failed to update store cache:', err);
          }
          
          return updatedStores;
        }
      );
      
      console.log(`useStores: Successfully created new store: ${name} for org ${organization.id}`);
      return typedNewStore;
    } catch (err) {
      console.error('Error finding or creating store:', err);
      throw err;
    }
  };
  
  return {
    // Always ensure stores is an array to prevent "undefined is not iterable"
    stores: Array.isArray(stores) ? stores : [],
    isLoading,
    isFetching,
    error,
    isSuccess,
    refetch,
    forceRefreshStores, 
    createStore: createStoreMutation?.mutateAsync,
    updateStore: updateStoreMutation?.mutateAsync,
    findOrCreateStore,
    getStoreName,
    getStoreMap,
    storeMap: storeMapCache
  };
}
