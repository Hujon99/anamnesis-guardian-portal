
/**
 * This component provides store selection functionality for anamnesis entries.
 * It displays a dropdown of available stores and handles store assignment with
 * robust error handling and loading states.
 */

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, RefreshCw, Store as StoreIcon } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";

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
  const [renderError, setRenderError] = useState<string | null>(null);
  const { 
    stores, 
    isLoading: isLoadingStores, 
    refetch: refetchStores,
    getStoreName 
  } = useStores();
  
  // Find the current store's name if a store ID is set
  const currentStoreName = storeId ? 
    getStoreName(storeId) || "Laddar butik..." : 
    "Välj butik";
  
  // Ensure stores is always an array, with improved defensive coding
  const safeStores = Array.isArray(stores) ? stores : [];
  
  // Handle store selection with improved error handling
  const handleStoreSelect = async (storeId: string | null) => {
    if (disabled) return;
    
    if (storeId === "clear") {
      storeId = null;
    }
    
    try {
      setIsAssigning(true);
      setRenderError(null);
      
      console.log(`StoreSelector: Handling store selection for entry ${entryId}, store ${storeId || 'null'}`);
      
      // Use the callback provided by parent component
      await onStoreAssigned(storeId);
      
    } catch (error) {
      console.error("Error in store assignment:", error);
      setRenderError(error instanceof Error ? error.message : "Unknown error occurred");
      
      toast({
        title: "Fel vid tilldelning",
        description: "Kunde inte tilldela butik. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
      setOpen(false);
    }
  };
  
  // Handle refresh stores button click with error handling
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRenderError(null);
    try {
      await refetchStores();
      toast({
        title: "Uppdaterad",
        description: `${safeStores.length} butiker laddades.`,
      });
    } catch (error) {
      console.error("Error refreshing stores:", error);
      setRenderError(error instanceof Error ? error.message : "Unknown error occurred");
      
      toast({
        title: "Kunde inte uppdatera",
        description: "Ett fel uppstod vid hämtning av butiker.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Fetch stores on component mount if they aren't already loaded
  useEffect(() => {
    if ((safeStores.length === 0 || !safeStores) && !isLoadingStores) {
      refetchStores().catch(err => {
        console.error("Failed to fetch stores on mount:", err);
        setRenderError("Failed to load stores. Please try refreshing.");
      });
    }
  }, [refetchStores, safeStores, isLoadingStores]);

  // Safety check before opening the popover
  const handleOpenChange = (newOpen: boolean) => {
    // If we're opening the popover, make sure we have stores data
    if (newOpen && safeStores.length === 0 && !isLoadingStores) {
      // Try to fetch stores if we don't have any yet
      refetchStores().catch(err => {
        console.error("Failed to fetch stores on open:", err);
        setRenderError("Failed to load stores. Please try refreshing.");
      });
    }
    setOpen(newOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
              <>
                <StoreIcon className="h-4 w-4 opacity-70" />
                <span className="truncate">{currentStoreName}</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white z-50" align="start">
        {renderError ? (
          <div className="p-4 text-sm text-destructive">
            <p className="mb-2">Det uppstod ett fel:</p>
            <p>{renderError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              className="mt-2 w-full"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Försök igen
            </Button>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Sök butik..." />
            <div className="flex items-center justify-between p-2 border-b">
              <div className="text-xs text-muted-foreground">
                {safeStores ? `${safeStores.length} butiker tillgängliga` : "Laddar butiker..."}
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
            
            {isLoadingStores ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Laddar butiker...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>Inga butiker hittades.</CommandEmpty>
                {safeStores && safeStores.length > 0 && (
                  <CommandGroup>
                    {safeStores.map((store) => (
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
                )}
              </>
            )}
            
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
        )}
      </PopoverContent>
    </Popover>
  );
}
