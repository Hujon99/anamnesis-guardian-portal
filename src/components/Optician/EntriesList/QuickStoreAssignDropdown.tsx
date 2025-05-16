
/**
 * This component provides a dropdown menu for quickly assigning a store to an anamnesis entry.
 * It displays available stores and handles the assignment process with loading states.
 */

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStores } from "@/hooks/useStores";
import { Store } from "lucide-react";
import { useOrganization } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

interface QuickStoreAssignDropdownProps {
  entryId: string;
  currentStoreId: string | null | undefined;
  onAssign: (entryId: string, storeId: string | null) => Promise<void>;
  children: React.ReactNode;
}

export function QuickStoreAssignDropdown({
  entryId,
  currentStoreId,
  onAssign,
  children,
}: QuickStoreAssignDropdownProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { stores, isLoading: isLoadingStores } = useStores();
  const { organization } = useOrganization();

  const handleAssign = async (storeId: string | null, e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      e.preventDefault();
      setIsAssigning(true);
      await onAssign(entryId, storeId);
    } catch (error) {
      console.error("Error assigning store:", error);
    } finally {
      setIsAssigning(false);
      setIsOpen(false);
    }
  };

  // Sort stores alphabetically by name
  const sortedStores = [...stores].sort((a, b) => 
    a.name.localeCompare(b.name, 'sv')
  );

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
                        <Store className="mr-2 h-4 w-4" />
                        {store.name}
                        {currentStoreId === store.id && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            (Nuvarande)
                          </span>
                        )}
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
