
/**
 * This component provides store selection functionality for anamnesis entries.
 * It displays a dropdown of available stores and handles store assignment with
 * robust error handling and loading states.
 */

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStores } from "@/hooks/useStores";
import { useEntryMutations } from "@/hooks/useEntryMutations";

interface StoreSelectorProps {
  entryId: string;
  storeId: string | null;
  onStoreAssigned: (storeId: string | null) => Promise<void>;
  disabled?: boolean;
}

export function StoreSelector({ entryId, storeId, onStoreAssigned, disabled = false }: StoreSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { stores, isLoading: isLoadingStores, refetch: refetchStores } = useStores();
  
  // Find the current store's name if a store ID is set
  const currentStoreName = storeId ? 
    stores.find(store => store.id === storeId)?.name || "Laddar butik..." : 
    "Välj butik";
  
  // Handle store selection
  const handleStoreSelect = async (storeId: string | null) => {
    if (disabled) return;
    
    if (storeId === "clear") {
      storeId = null;
    }
    
    try {
      setIsAssigning(true);
      
      console.log(`StoreSelector: Handling store selection for entry ${entryId}, store ${storeId || 'null'}`);
      
      // Use the callback provided by parent component
      await onStoreAssigned(storeId);
      
    } catch (error) {
      console.error("Error in store assignment:", error);
      // Error is already handled by the parent component
    } finally {
      setIsAssigning(false);
      setOpen(false);
    }
  };
  
  // Handle refresh stores button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchStores();
    } catch (error) {
      console.error("Error refreshing stores:", error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Fetch stores on component mount if they aren't already loaded
  useEffect(() => {
    if (stores.length === 0) {
      refetchStores();
    }
  }, [refetchStores, stores.length]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isAssigning}
          className="w-full justify-between overflow-hidden"
        >
          <div className="flex items-center gap-2 truncate">
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Tilldelar...</span>
              </>
            ) : (
              <span className="truncate">{currentStoreName}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Sök butik..." />
          <div className="flex items-center justify-between p-2 border-b">
            <div className="text-xs text-muted-foreground">
              {stores.length} butiker tillgängliga
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="sr-only">Uppdatera</span>
            </Button>
          </div>
          <CommandEmpty>Inga butiker hittades.</CommandEmpty>
          <CommandGroup>
            {stores.map((store) => (
              <CommandItem
                key={store.id}
                value={store.id}
                onSelect={() => handleStoreSelect(store.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    storeId === store.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {store.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <div className="p-1 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground hover:text-foreground"
              onClick={() => handleStoreSelect("clear")}
              disabled={storeId === null}
            >
              Rensa tilldelning
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
