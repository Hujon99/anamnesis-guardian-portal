
/**
 * This component provides a dropdown menu for quickly assigning a store to an anamnesis entry.
 * It displays available stores and handles the assignment process with loading states, error handling,
 * and fallback mechanisms when store data is not available.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStores } from "@/hooks/useStores";
import { Store, RefreshCw, Loader2, Check, AlertCircle } from "lucide-react";
import { useOrganization } from "@clerk/clerk-react";
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
  const { stores, isLoading: isLoadingStores, refetch: refetchStores, forceRefreshStores, getStoreName } = useStores();
  const { organization } = useOrganization();
  const [assignmentError, setAssignmentError] = useState<Error | null>(null);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  
  // Retry counter for error handling
  const retryCount = useRef(0);
  const maxRetries = 2;
  
  // Check if there are no stores and show refresh button after a delay
  useEffect(() => {
    if (!isLoadingStores && stores.length === 0) {
      const timer = setTimeout(() => {
        setShowRefreshButton(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setShowRefreshButton(false);
    }
  }, [stores, isLoadingStores]);

  const handleAssign = async (storeId: string | null, e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      e.preventDefault();
      setIsAssigning(true);
      setAssignmentError(null);
      
      console.log(`QuickStoreAssignDropdown: Assigning store with ID: ${storeId || 'none'} to entry: ${entryId}`);
      
      // Track current retry attempt
      retryCount.current = 0;
      
      // Call the assign function with retry logic
      await attemptAssign(storeId);
      
      // Success case
      console.log(`QuickStoreAssignDropdown: Successfully assigned store ${storeId} to entry ${entryId}`);
      
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
  };
  
  // Helper function to attempt assignment with retries
  const attemptAssign = async (storeId: string | null): Promise<void> => {
    try {
      await onAssign(entryId, storeId);
      
      // After successful assignment, refresh store data
      await refetchStores();
      
    } catch (error: any) {
      console.error(`Assignment attempt ${retryCount.current + 1} failed:`, error);
      
      // Check if it's an auth error that might benefit from a retry
      const isAuthError = error?.code === "PGRST301" || 
                          error?.message?.includes("JWT") || 
                          error?.message?.includes("401");
                          
      if (isAuthError && retryCount.current < maxRetries) {
        retryCount.current += 1;
        console.log(`JWT error detected, retrying (attempt ${retryCount.current})`);
        
        // Show toast for retry
        toast({
          title: "Försöker igen",
          description: `Tilldelningsförsök ${retryCount.current} av ${maxRetries}`,
        });
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force refresh stores data and clear cache
        await forceRefreshStores();
        
        // Try again
        return attemptAssign(storeId);
      }
      
      // If we've reached max retries or it's not an auth error, fail
      throw error;
    }
  };

  // Sort stores alphabetically by name
  const sortedStores = [...stores].sort((a, b) => 
    a.name.localeCompare(b.name, 'sv')
  );
  
  console.log("QuickStoreAssignDropdown: Available stores", stores);
  console.log("QuickStoreAssignDropdown: currentStoreId", currentStoreId);
  
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
      const foundStore = stores.find(store => store.id === currentStoreId);
      if (foundStore) {
        currentStoreName = foundStore.name;
      }
    }
  }
  
  console.log(`QuickStoreAssignDropdown: Resolved current store name: "${currentStoreName}" for ID: ${currentStoreId}`);

  // Handle refresh button click
  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      await forceRefreshStores();
    } catch (error) {
      console.error("Error refreshing stores:", error);
      
      toast({
        title: "Fel vid uppdatering",
        description: "Kunde inte uppdatera butikslistan. Försök igen senare.",
        variant: "destructive",
      });
    }
  };

  // Add a click handler to the trigger to prevent event bubbling
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
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
                ) : (
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
