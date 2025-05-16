
/**
 * This component provides a dropdown menu for quickly assigning a store to an anamnesis entry.
 * It displays available stores and handles the assignment process with loading states, error handling,
 * and fallback mechanisms when store data is not available.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStores } from "@/hooks/useStores";
import { Store, RefreshCw, Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

interface QuickStoreAssignDropdownProps {
  entryId: string;
  currentStoreId: string | null | undefined;
  onAssign: (entryId: string, storeId: string | null) => Promise<void>;
  children: React.ReactNode;
  storeMap?: Map<string, string>; // Optional map of store IDs to names
}

export function QuickStoreAssignDropdown({
  entryId,
  currentStoreId,
  onAssign,
  children,
  storeMap,
}: QuickStoreAssignDropdownProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { stores = [], isLoading: isLoadingStores, refetch: refetchStores, forceRefreshStores, getStoreName } = useStores();
  const [assignmentError, setAssignmentError] = useState<Error | null>(null);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Ensure we have a valid array of stores to work with
  const safeStores = Array.isArray(stores) ? stores : [];
  
  // Pre-fetch stores and prepare data when component mounts
  useEffect(() => {
    console.log("QuickStoreAssignDropdown: Component mounted, preparing data");
    
    const preloadStores = async () => {
      if (safeStores.length === 0 && !isLoadingStores && !dataLoaded) {
        try {
          console.log("QuickStoreAssignDropdown: Pre-loading store data");
          await refetchStores();
          setDataLoaded(true);
          console.log(`QuickStoreAssignDropdown: Pre-load complete, received ${safeStores.length} stores`);
        } catch (err) {
          console.error("QuickStoreAssignDropdown: Failed to prefetch stores:", err);
          // Show refresh button after a delay if we fail to load
          setTimeout(() => {
            setShowRefreshButton(true);
          }, 500);
        }
      } else if (safeStores.length > 0 && !dataLoaded) {
        // Mark as loaded if we already have data
        setDataLoaded(true);
        console.log(`QuickStoreAssignDropdown: Data already available, ${safeStores.length} stores`);
      }
    };
    
    preloadStores();
  }, [refetchStores, safeStores.length, isLoadingStores, dataLoaded]);
  
  // Check if there are no stores and show refresh button after a delay
  useEffect(() => {
    if (!isLoadingStores && safeStores.length === 0) {
      const timer = setTimeout(() => {
        setShowRefreshButton(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setShowRefreshButton(false);
    }
  }, [safeStores, isLoadingStores]);

  const handleAssign = useCallback(async (storeId: string | null, e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      e.preventDefault();
      setIsAssigning(true);
      setAssignmentError(null);
      
      console.log(`QuickStoreAssignDropdown: Assigning store with ID: ${storeId || 'none'} to entry: ${entryId}`);
      
      if (!entryId) {
        throw new Error("Missing entry ID for store assignment");
      }
      
      // Call the assign function provided as prop
      await onAssign(entryId, storeId);
      
      // Success case
      console.log(`QuickStoreAssignDropdown: Successfully assigned store ${storeId} to entry ${entryId}`);
      
      // After successful assignment, refresh store data
      await refetchStores();
      
      toast({
        title: storeId ? "Butik tilldelad" : "Butiksval borttaget",
        description: storeId 
          ? "Anamnesen har kopplats till butiken" 
          : "Butikskoppling har tagits bort",
      });
    } catch (error) {
      console.error("Error assigning store:", error);
      setAssignmentError(error instanceof Error ? error : new Error("Unknown error"));
      
      toast({
        title: "Fel vid tilldelning av butik",
        description: "Det gick inte att tilldela butiken. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
      setIsOpen(false);
    }
  }, [entryId, onAssign, refetchStores]);

  // Handle refresh button click with enhanced error handling
  const handleRefresh = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      console.log("QuickStoreAssignDropdown: Refreshing store data");
      await forceRefreshStores();
      
      // Check if we got data after refresh
      const refreshedStores = Array.isArray(stores) ? stores : [];
      console.log(`QuickStoreAssignDropdown: Refresh complete, received ${refreshedStores.length} stores`);
      
      setDataLoaded(true);
      
      toast({
        title: "Butiksdata uppdaterad",
        description: "Butikslistan har uppdaterats.",
      });
    } catch (error) {
      console.error("Error refreshing stores:", error);
      
      toast({
        title: "Fel vid uppdatering",
        description: "Kunde inte uppdatera butikslistan. Försök igen senare.",
        variant: "destructive",
      });
    }
  }, [stores, forceRefreshStores]);

  // Pre-fetch data when dropdown opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      console.log("QuickStoreAssignDropdown: Dropdown opening");
      
      if (safeStores.length === 0 && !isLoadingStores) {
        console.log("QuickStoreAssignDropdown: No stores available, fetching on open");
        refetchStores().catch(err => {
          console.error("Failed to fetch stores on open:", err);
        });
      }
    }
    setIsOpen(open);
  }, [safeStores.length, isLoadingStores, refetchStores]);

  // Sort stores alphabetically by name
  const sortedStores = [...safeStores].sort((a, b) => 
    a.name.localeCompare(b.name, 'sv')
  );
  
  // Find current store name using multiple methods for redundancy
  let currentStoreName = "Ingen butik tilldelad";
  
  if (currentStoreId) {
    // First try direct lookup via useStores hook
    const storeName = getStoreName(currentStoreId);
    if (storeName) {
      currentStoreName = storeName;
    } 
    // Try fallback to storeMap from props
    else if (storeMap && storeMap.has(currentStoreId)) {
      currentStoreName = storeMap.get(currentStoreId) || currentStoreName;
    }
    // Try fallback to stores array
    else {
      const foundStore = safeStores.find(store => store.id === currentStoreId);
      if (foundStore) {
        currentStoreName = foundStore.name;
      }
    }
  }

  // Add a click handler to the trigger to prevent event bubbling
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // Debug logging
  useEffect(() => {
    console.log(`QuickStoreAssignDropdown: Current state - isLoading: ${isLoadingStores}, dataLoaded: ${dataLoaded}, stores: ${safeStores.length}`);
  }, [isLoadingStores, dataLoaded, safeStores.length]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild disabled={isAssigning} onClick={handleTriggerClick}>
        <div onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }} className="cursor-pointer">
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white border shadow-lg z-50">
        {isAssigning && (
          <div className="flex items-center justify-center p-3">
            <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
            <span>Tilldelar butik...</span>
          </div>
        )}
        
        {!isAssigning && (
          <>
            {isLoadingStores ? (
              <div className="flex items-center justify-center p-3">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                <span>Laddar butiker...</span>
              </div>
            ) : (
              <>
                <div className="px-2 py-2 text-sm font-semibold border-b border-border">
                  Välj butik
                </div>
                
                {sortedStores.length === 0 ? (
                  <div className="p-3 space-y-4">
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      <span>Inga butiker tillgängliga</span>
                    </div>
                    
                    {showRefreshButton && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={handleRefresh}
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Uppdatera butikslistan
                      </Button>
                    )}
                  </div>
                ) : dataLoaded ? (
                  <div className="max-h-[300px] overflow-y-auto py-1">
                    {sortedStores.map((store) => (
                      <DropdownMenuItem
                        key={store.id}
                        onClick={(e) => handleAssign(store.id, e as React.MouseEvent)}
                        className={
                          currentStoreId === store.id
                            ? "bg-muted/50 font-medium cursor-pointer"
                            : "cursor-pointer"
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <Store className="mr-2 h-4 w-4" />
                            <span>{store.name}</span>
                          </div>
                          {currentStoreId === store.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    
                    {currentStoreId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleAssign(null, e)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          Ta bort butiksval
                        </DropdownMenuItem>
                      </>
                    )}
                  </div>
                ) : (
                  // Explicit loading state when we know data should be available but isn't loaded yet
                  <div className="p-4 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm">Förbereder butiksdata...</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
        
        {assignmentError && (
          <div className="px-2 py-2 text-xs text-destructive border-t border-border">
            {assignmentError.message || "Ett fel uppstod. Försök igen."}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
