/**
 * QuickStoreSwitcher - Fast store switching component for Navbar.
 * 
 * This component displays a dropdown with recently used stores for quick access.
 * It tracks store usage history in localStorage and shows the 3 most recent stores.
 * Designed for users who frequently switch between specific stores.
 * 
 * Features:
 * - Shows last 3 used stores for quick access
 * - Compact dropdown design for navbar
 * - Automatic history tracking via localStorage
 * - Visual indicator for currently active store
 */

import React, { useEffect, useState } from 'react';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Store, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSafeOrganization } from '@/hooks/useSafeOrganization';

const MAX_RECENT_STORES = 3;

interface StoreHistory {
  id: string;
  name: string;
  lastUsed: number;
}

export const QuickStoreSwitcher: React.FC = () => {
  const { activeStore, setActiveStore, availableStores, hasMultipleStores } = useActiveStore();
  const { organization } = useSafeOrganization();
  const [recentStores, setRecentStores] = useState<StoreHistory[]>([]);

  // Get storage key for recent stores
  const getStorageKey = () => {
    if (!organization?.id) return null;
    return `recentStores_${organization.id}`;
  };

  // Load recent stores from localStorage
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const history: StoreHistory[] = JSON.parse(stored);
        // Filter to only include stores that still exist
        const validHistory = history.filter(h => 
          availableStores.some(s => s.id === h.id)
        );
        setRecentStores(validHistory.slice(0, MAX_RECENT_STORES));
      }
    } catch (error) {
      console.error('Error loading recent stores:', error);
    }
  }, [organization?.id, availableStores]);

  // Update recent stores when active store changes
  useEffect(() => {
    if (!activeStore) return;
    
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      let history: StoreHistory[] = stored ? JSON.parse(stored) : [];

      // Remove existing entry for this store
      history = history.filter(h => h.id !== activeStore.id);

      // Add to front of list
      history.unshift({
        id: activeStore.id,
        name: activeStore.name,
        lastUsed: Date.now()
      });

      // Keep only the most recent stores
      history = history.slice(0, MAX_RECENT_STORES);

      localStorage.setItem(storageKey, JSON.stringify(history));
      setRecentStores(history);
    } catch (error) {
      console.error('Error saving recent stores:', error);
    }
  }, [activeStore, organization?.id]);

  // Don't show if only one store or no stores
  if (!hasMultipleStores || availableStores.length === 0) {
    return null;
  }

  // Don't show if no recent stores yet
  if (recentStores.length === 0) {
    return null;
  }

  const handleSelectStore = (storeId: string) => {
    const store = availableStores.find(s => s.id === storeId);
    if (store) {
      setActiveStore(store);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 text-muted-foreground hover:text-foreground"
          aria-label="Senaste butiker"
        >
          <Clock className="h-4 w-4" />
          <span className="hidden md:inline text-xs">Senaste</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-[240px] bg-background border shadow-lg z-50"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Senast använda butiker
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recentStores.map((store) => {
          const isActive = activeStore?.id === store.id;
          return (
            <DropdownMenuItem
              key={store.id}
              onClick={() => handleSelectStore(store.id)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isActive && "bg-primary/10"
              )}
            >
              <Store className={cn(
                "h-4 w-4 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "flex-1 truncate text-sm",
                isActive && "font-medium text-primary"
              )}>
                {store.name}
              </span>
              {isActive && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
