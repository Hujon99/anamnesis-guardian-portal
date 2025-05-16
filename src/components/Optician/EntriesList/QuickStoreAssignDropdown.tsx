
/**
 * This component provides a dropdown menu for quickly assigning a store to an anamnesis entry.
 * It displays available stores and handles the assignment process with loading states.
 */

import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStores } from "@/hooks/useStores";
import { Store, Loader2, Check } from "lucide-react";
import { useOrganization } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";

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
  const { stores, isLoading: isLoadingStores, refetch: refetchStores } = useStores();
  const { organization } = useOrganization();
  
  // Force refetch stores when component mounts or organization changes
  useEffect(() => {
    console.log("QuickStoreAssignDropdown: Fetching stores");
    refetchStores();
  }, [organization?.id, refetchStores]);

  const handleAssign = async (storeId: string | null, e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      e.preventDefault();
      setIsAssigning(true);
      console.log(`Assigning store with ID: ${storeId} to entry: ${entryId}`);
      await onAssign(entryId, storeId);
    } catch (error) {
      console.error("Error assigning store:", error);
      
      toast({
        title: "Fel vid tilldelning av butik",
        description: "Det gick inte att tilldela butiken",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
      setIsOpen(false);
    }
  };

  // Sort stores alphabetically by name
  const sortedStores = [...stores].sort((a, b) => 
    a.name.localeCompare(b.name, 'sv')
  );
  
  console.log("QuickStoreAssignDropdown: Available stores", stores);
  
  // Find current store name - first try the storeMap, then fall back to stores array
  let currentStoreName = "Ingen butik tilldelad";
  
  if (currentStoreId) {
    if (storeMap && storeMap.has(currentStoreId)) {
      currentStoreName = storeMap.get(currentStoreId) || currentStoreName;
    } else {
      const currentStore = stores.find(store => store.id === currentStoreId);
      if (currentStore) {
        currentStoreName = currentStore.name;
      }
    }
  }

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
      <DropdownMenuContent align="end" className="w-56 bg-white border shadow-md z-50">
        {isAssigning && (
          <div className="flex items-center justify-center p-2">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Tilldelar...</span>
          </div>
        )}
        
        {!isAssigning && (
          <>
            {isLoadingStores ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Laddar butiker...</span>
              </div>
            ) : (
              <>
                <div className="px-2 py-1.5 text-sm font-semibold">
                  Välj butik
                </div>
                {sortedStores.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Inga butiker tillgängliga
                  </div>
                ) : (
                  <>
                    {sortedStores.map((store) => (
                      <DropdownMenuItem
                        key={store.id}
                        onClick={(e) => handleAssign(store.id, e)}
                        className={
                          currentStoreId === store.id
                            ? "bg-muted font-medium cursor-pointer"
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
                  </>
                )}
                
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
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
