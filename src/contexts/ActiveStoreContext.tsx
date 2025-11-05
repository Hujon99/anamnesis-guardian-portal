/**
 * ActiveStoreContext - Manages the currently active store for the logged-in user.
 * 
 * This context provides a way to track which store a user is currently working with,
 * which is essential for multi-store organizations. The selected store is persisted
 * in the database (users.preferred_store_id) with localStorage as fallback.
 * 
 * Key features:
 * - Persists active store selection in database (preferred_store_id column)
 * - Falls back to localStorage for resilience
 * - Automatically loads user's preferred store on mount
 * - Validates that the selected store still exists and is active
 * - Provides helper to check if user has multiple stores
 * - Auto-selects single store for single-store organizations
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStores } from '@/hooks/useStores';
import { useSafeAuth } from '@/hooks/useSafeAuth';
import { useSafeOrganization } from '@/hooks/useSafeOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Store {
  id: string;
  name: string;
  organization_id: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface ActiveStoreContextType {
  activeStore: Store | null;
  setActiveStore: (store: Store | null) => void;
  isLoading: boolean;
  hasMultipleStores: boolean;
  availableStores: Store[];
}

const ActiveStoreContext = createContext<ActiveStoreContextType | undefined>(undefined);

export const ActiveStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userId } = useSafeAuth();
  const { organization } = useSafeOrganization();
  const { stores, isLoading: storesLoading } = useStores();
  
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Generate localStorage key based on org + user
  const getStorageKey = () => {
    if (!organization?.id || !userId) return null;
    return `binokel_active_store_${organization.id}_${userId}`;
  };

  // Load active store from database (with localStorage fallback) on mount
  useEffect(() => {
    if (!userId || !organization?.id || stores.length === 0 || isInitialized) return;

    const loadPreferredStore = async () => {
      try {
        // First, try to load from database
        const { data: userData, error } = await supabase
          .from('users')
          .select('preferred_store_id')
          .eq('clerk_user_id', userId)
          .single();

        let savedStoreId: string | null = null;

        if (!error && userData?.preferred_store_id) {
          savedStoreId = userData.preferred_store_id;
        } else {
          // Fallback to localStorage if database fails or no value
          const storageKey = getStorageKey();
          if (storageKey) {
            savedStoreId = localStorage.getItem(storageKey);
          }
        }

        if (savedStoreId) {
          // Validate that the saved store still exists
          const savedStore = stores.find(s => s.id === savedStoreId);
          if (savedStore) {
            setActiveStoreState(savedStore);
            setIsInitialized(true);
            return;
          }
        }

        // If no saved store or it doesn't exist, auto-select first available store
        if (stores.length > 0) {
          setActiveStoreState(stores[0]);
          // Save to database
          await supabase
            .from('users')
            .update({ preferred_store_id: stores[0].id })
            .eq('clerk_user_id', userId);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading preferred store:', error);
        setIsInitialized(true);
      }
    };

    loadPreferredStore();
  }, [userId, organization?.id, stores, isInitialized]);

  // Update active store and persist to database (with localStorage fallback)
  const setActiveStore = async (store: Store | null) => {
    setActiveStoreState(store);
    
    if (!userId) return;

    try {
      // Save to database
      await supabase
        .from('users')
        .update({ preferred_store_id: store?.id || null })
        .eq('clerk_user_id', userId);

      // Also save to localStorage as fallback
      const storageKey = getStorageKey();
      if (storageKey) {
        if (store) {
          localStorage.setItem(storageKey, store.id);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('Error saving preferred store:', error);
    }
  };

  // Validate active store still exists in available stores
  useEffect(() => {
    if (!activeStore || stores.length === 0 || !isInitialized) return;

    const storeStillExists = stores.find(s => s.id === activeStore.id);
    if (!storeStillExists) {
      // Store was removed, clear selection
      setActiveStore(null);
    }
  }, [stores, activeStore, isInitialized]);

  // Multi-tab synchronization via localStorage events
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey || !isInitialized) return;

    const handleStorageChange = (e: StorageEvent) => {
      // Only react to changes in our specific localStorage key
      if (e.key !== storageKey) return;
      
      const newStoreId = e.newValue;
      
      // If store was cleared in another tab
      if (!newStoreId) {
        setActiveStoreState(null);
        toast.info('Butiksvalet rensades i en annan flik');
        return;
      }

      // Find the new store and update
      const newStore = stores.find(s => s.id === newStoreId);
      if (newStore && newStore.id !== activeStore?.id) {
        setActiveStoreState(newStore);
        toast.info(`Bytte till ${newStore.name} (synkroniserat från annan flik)`);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [stores, activeStore, isInitialized, getStorageKey]);

  const hasMultipleStores = stores.length > 1;
  const isLoading = storesLoading || !isInitialized;

  return (
    <ActiveStoreContext.Provider
      value={{
        activeStore,
        setActiveStore,
        isLoading,
        hasMultipleStores,
        availableStores: stores,
      }}
    >
      {children}
    </ActiveStoreContext.Provider>
  );
};

export const useActiveStore = () => {
  const context = useContext(ActiveStoreContext);
  if (context === undefined) {
    throw new Error('useActiveStore must be used within an ActiveStoreProvider');
  }
  return context;
};
