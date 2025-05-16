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
      
      if (cachedData) {
        const { stores, timestamp } = JSON.parse(cachedData);
        
        // Check if cache is still valid (within 24 hours)
        if (Date.now() - timestamp < STORE_CACHE_EXPIRY && Array.isArray(stores)) {
          console.log(`useStores: Loading ${stores.length} stores from local cache`);
          
          // Keep a local copy as a fallback
          setLocalStoresBackup(stores);
          
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
      console.log(`useStores: Successfully fetched ${safeData.length} stores:`, safeData);
      
      // Update local backup
      setLocalStoresBackup(safeData);
      
      // Save to localStorage for persistent cache
      try {
        localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
          stores: safeData,
          timestamp: Date.now()
        }));
        console.log(`useStores: Saved ${safeData.length} stores to local cache`);
      } catch (cacheError) {
        console.error('Failed to cache stores in localStorage:', cacheError);
      }
      
      // Update the storeMap cache when new data is fetched
      const newStoreMap = new Map<string, string>();
      safeData.forEach(store => {
        newStoreMap.set(store.id, store.name);
      });
      setStoreMapCache(newStoreMap);
      
      return safeData as Store[];
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // If fetching fails, return local backup
      if (localStoresBackup.length > 0) {
        console.log(`useStores: Falling back to ${localStoresBackup.length} locally backed up stores due to fetch error`);
        return localStoresBackup;
      }
      
      // If no local backup, try to use cached data
      const cachedData = localStorage.getItem(STORE_CACHE_KEY);
      if (cachedData) {
        try {
          const { stores } = JSON.parse(cachedData);
          if (Array.isArray(stores) && stores.length > 0) {
            console.log(`useStores: Falling back to ${stores.length} cached stores due to fetch error`);
            setLocalStoresBackup(stores);
            return stores as Store[];
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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
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
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('Failed to update store cache:', err);
      }
      
      // Update local backup
      setLocalStoresBackup(storesArray);
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
      return data as Store;
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
              timestamp: Date.now()
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
      return data as Store;
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
              timestamp: Date.now()
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
  
  // Function to find or create a store by name with improved caching
  const findOrCreateStore = async (name: string) => {
    if (!organization?.id || !isReady) {
      throw new Error('No organization selected or Supabase client not ready');
    }
    
    try {
      console.log(`useStores: Finding or creating store with name "${name}"`);
      
      // First check local cache/memory
      const existingStoreInMemory = stores.find(
        store => store.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existingStoreInMemory) {
        console.log(`useStores: Found existing store in memory: ${existingStoreInMemory.name}`);
        return existingStoreInMemory;
      }
      
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
        console.log(`useStores: Found existing store in database: ${existingStores[0].name}`);
        
        // Update our cache with this confirmed store
        queryClient.setQueryData(
          ['stores', organization.id],
          (oldData: Store[] = []) => {
            // Skip if store already exists in cache
            if (oldData.some(s => s.id === existingStores[0].id)) {
              return oldData;
            }
            
            // Add the store to our cache
            const updatedStores = [...oldData, existingStores[0]].sort((a, b) => 
              a.name.localeCompare(b.name, 'sv')
            );
            
            // Update localStorage
            try {
              localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
                stores: updatedStores,
                timestamp: Date.now()
              }));
            } catch (err) {
              console.error('Failed to update store cache:', err);
            }
            
            return updatedStores;
          }
        );
        
        return existingStores[0] as Store;
      }
      
      // Otherwise create a new store
      console.log(`useStores: Creating new store: ${name}`);
      const { data: newStore, error: createError } = await supabase
        .from('stores')
        .insert({
          name,
          organization_id: organization.id
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Update the query cache with the new store
      queryClient.setQueryData(
        ['stores', organization.id],
        (oldData: Store[] = []) => {
          const updatedStores = [...oldData, newStore as Store].sort((a, b) => 
            a.name.localeCompare(b.name, 'sv')
          );
          
          // Update localStorage
          try {
            localStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
              stores: updatedStores,
              timestamp: Date.now()
            }));
          } catch (err) {
            console.error('Failed to update store cache:', err);
          }
          
          return updatedStores;
        }
      );
      
      console.log(`useStores: Successfully created new store: ${name}`);
      return newStore as Store;
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
    forceRefreshStores, // New function to force refresh
    createStore: createStoreMutation?.mutateAsync,
    updateStore: updateStoreMutation?.mutateAsync,
    findOrCreateStore,
    getStoreName,
    getStoreMap,
    storeMap: storeMapCache
  };
}
