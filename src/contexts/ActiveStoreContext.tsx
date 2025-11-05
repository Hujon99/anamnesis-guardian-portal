/**
 * ActiveStoreContext - Manages the currently active store for the logged-in user.
 * 
 * This context provides a way to track which store a user is currently working with,
 * which is essential for multi-store organizations. The selected store is persisted
 * in localStorage and automatically restored on subsequent visits.
 * 
 * Key features:
 * - Persists active store selection in localStorage (org + user specific)
 * - Automatically loads user's last selected store on mount
 * - Validates that the selected store still exists and is active
 * - Provides helper to check if user has multiple stores
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStores } from '@/hooks/useStores';
import { useSafeAuth } from '@/hooks/useSafeAuth';
import { useSafeOrganization } from '@/hooks/useSafeOrganization';

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

  // Load active store from localStorage on mount
  useEffect(() => {
    if (!userId || !organization?.id || stores.length === 0 || isInitialized) return;

    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      const savedStoreId = localStorage.getItem(storageKey);
      
      if (savedStoreId) {
        // Validate that the saved store still exists
        const savedStore = stores.find(s => s.id === savedStoreId);
        if (savedStore) {
          setActiveStoreState(savedStore);
          setIsInitialized(true);
          return;
        }
      }

      // If no saved store or it doesn't exist, auto-select if only one store
      if (stores.length === 1) {
        setActiveStoreState(stores[0]);
        localStorage.setItem(storageKey, stores[0].id);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading active store from localStorage:', error);
      setIsInitialized(true);
    }
  }, [userId, organization?.id, stores, isInitialized]);

  // Update active store and persist to localStorage
  const setActiveStore = (store: Store | null) => {
    setActiveStoreState(store);
    
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      if (store) {
        localStorage.setItem(storageKey, store.id);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('Error saving active store to localStorage:', error);
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
