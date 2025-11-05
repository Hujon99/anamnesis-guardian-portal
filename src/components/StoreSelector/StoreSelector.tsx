/**
 * StoreSelector - Dropdown component for selecting the active store.
 * 
 * This component allows users to switch between stores in multi-store organizations.
 * It displays prominently in the navbar and shows the current store name with
 * a visual indicator. The selection is persisted across sessions via localStorage.
 * 
 * Features:
 * - Dropdown with all available stores
 * - Search functionality for organizations with many stores
 * - Visual indicator of currently selected store
 * - "All stores" option for admins (optional - disabled for now)
 * - Entry count per store (future enhancement)
 */

import React from 'react';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Store, Check, ChevronDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const StoreSelector: React.FC = () => {
  const { activeStore, setActiveStore, availableStores, hasMultipleStores, isLoading } = useActiveStore();
  const [open, setOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 animate-pulse">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Laddar butiker...</span>
      </div>
    );
  }

  // If only one store, show it without dropdown
  if (!hasMultipleStores && availableStores.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/20">
        <Building2 className="h-4 w-4 text-primary" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Butik</span>
          <span className="text-sm font-medium">{availableStores[0].name}</span>
        </div>
      </div>
    );
  }

  // If no stores available
  if (availableStores.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Ingen butik tillgänglig</span>
      </div>
    );
  }

  const handleSelectStore = (store: typeof availableStores[0]) => {
    setActiveStore(store);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Välj butik"
          className={cn(
            "justify-between min-w-[200px] h-auto py-2",
            activeStore && "border-primary/40 bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2 flex-1 text-left">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground">Aktiv butik</span>
              <span className="text-sm font-medium truncate">
                {activeStore ? activeStore.name : 'Välj butik'}
              </span>
            </div>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Sök butik..." />
          <CommandList>
            <CommandEmpty>Ingen butik hittades.</CommandEmpty>
            <CommandGroup heading="Butiker">
              {availableStores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={store.name}
                  onSelect={() => handleSelectStore(store)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Store className="h-4 w-4 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{store.name}</span>
                      {store.address && (
                        <span className="text-xs text-muted-foreground truncate">
                          {store.address}
                        </span>
                      )}
                    </div>
                  </div>
                  {activeStore?.id === store.id && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
