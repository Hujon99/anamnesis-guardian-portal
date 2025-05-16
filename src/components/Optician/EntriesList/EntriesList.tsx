
/**
 * This component renders a list of anamnesis entries with proper handling for empty state and item selection.
 * It now includes support for quick-assign functionality for both opticians and stores directly in the list view,
 * with robust error handling and persistent store data management.
 */

import { EmptyState } from "./EmptyState";
import { AnamnesisListItem } from "../AnamnesisListItem";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";
import { useStores } from "@/hooks/useStores";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface EntriesListProps {
  entries: (AnamnesesEntry & {
    isExpired?: boolean;
    daysUntilExpiration?: number | null;
    storeName?: string | null;
    isBookingWithoutStore?: boolean;
  })[];
  onSelectEntry: (entry: AnamnesesEntry) => void;
  onEntryDeleted?: () => void;
  onEntryAssigned?: (entryId: string, opticianId: string | null) => Promise<void>;
  onStoreAssigned?: (entryId: string, storeId: string | null) => Promise<void>;
  showQuickAssign?: boolean;
  status?: string;
}

export function EntriesList({
  entries,
  onSelectEntry,
  onEntryDeleted,
  onEntryAssigned,
  onStoreAssigned,
  showQuickAssign = true,
  status = "pending" // Default status to handle the empty state
}: EntriesListProps) {
  const { opticians } = useOpticians();
  const { stores, refetch: refetchStores, getStoreName, getStoreMap, forceRefreshStores } = useStores();
  const { has } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showStoreDataWarning, setShowStoreDataWarning] = useState(false);
  
  // Check if user is admin
  const isAdmin = has && has({ role: "org:admin" });
  
  // Create a map of optician IDs to names for quick lookup
  const opticianMap = useMemo(() => {
    const map = new Map<string, string>();
    opticians.forEach(optician => {
      if (optician.clerk_user_id) {
        map.set(optician.clerk_user_id, getOpticianDisplayName(optician));
      }
    });
    return map;
  }, [opticians]);
  
  // Get the store map
  const storeMap = useMemo(() => {
    const map = getStoreMap();
    console.log(`EntriesList: Using store map with ${map.size} entries:`, [...map.entries()]);
    return map;
  }, [getStoreMap, stores]);
  
  // Force fetch stores when component mounts
  useEffect(() => {
    console.log("EntriesList: Initial load - fetching stores");
    refetchStores();
    
    // Show store data warning if we have entries with store IDs but no stores data
    const entriesWithStores = entries.filter(entry => entry.store_id).length;
    const hasStoreData = stores.length > 0;
    
    if (entriesWithStores > 0 && !hasStoreData) {
      console.log("EntriesList: Found entries with store IDs but no store data");
      setShowStoreDataWarning(true);
    } else {
      setShowStoreDataWarning(false);
    }
  }, [refetchStores, entries, stores]);
  
  // Handler for manual refresh of store data
  const handleRefreshStores = async () => {
    setIsRefreshing(true);
    try {
      await forceRefreshStores();
      setShowStoreDataWarning(false);
      
      toast({
        title: "Butiksdata uppdaterad",
        description: `${stores.length} butiker hämtades framgångsrikt`,
      });
    } catch (error) {
      console.error("Error refreshing stores:", error);
      
      toast({
        title: "Fel vid uppdatering",
        description: "Kunde inte uppdatera butiksinformation. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle store assignment with retry logic and improved error handling
  const handleStoreAssign = async (entryId: string, storeId: string | null): Promise<void> => {
    if (!onStoreAssigned) {
      toast({
        title: "Kan inte tilldela butik",
        description: "En funktion för att tilldela butik saknas.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log(`EntriesList: Assigning store ${storeId || 'null'} to entry ${entryId}`);
      await onStoreAssigned(entryId, storeId);
      
      // Refresh store data after assignment
      await refetchStores();
      
      // Update UI state
      setShowStoreDataWarning(false);
      
      // Show success message
      toast({
        title: "Butik tilldelad",
        description: storeId 
          ? "Anamnes har kopplats till butik" 
          : "Butikskoppling har tagits bort",
      });
    } catch (error) {
      console.error("Error assigning store:", error);
      
      // Check if it's a JWT error
      const isAuthError = error instanceof Error && (
        error.message.includes("JWT") || 
        error.message.includes("401") ||
        error.message.includes("PGRST301")
      );
      
      if (isAuthError) {
        toast({
          title: "Sessionsproblem",
          description: "Din session har gått ut. Klicka på 'Uppdatera' för att förnya",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshStores}
              className="bg-white"
            >
              Uppdatera
            </Button>
          ),
        });
      } else {
        toast({
          title: "Fel vid tilldelning av butik",
          description: "Det gick inte att koppla anamnes till butik",
          variant: "destructive",
        });
      }
    }
  };
  
  if (entries.length === 0) {
    return <EmptyState status={status} />;
  }

  return (
    <>
      {showStoreDataWarning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Butiksinformation saknas</p>
            <p className="text-xs">Vissa butiker kunde inte visas korrekt. Uppdatera för att visa fullständig information.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshStores}
            disabled={isRefreshing}
            className="bg-white"
          >
            {isRefreshing ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Uppdatera
          </Button>
        </div>
      )}
    
      <div className="space-y-4 mt-4">
        {entries.map((entry) => {
          // Lookup store name directly from our map
          const storeNameFromMap = entry.store_id ? getStoreName(entry.store_id) : null;
          
          // Log the store name resolution process for debugging
          console.log(`EntriesList: Entry ${entry.id} - Store ID: ${entry.store_id || 'none'}, Store Name: ${storeNameFromMap || 'not found'}`);
          
          // Set final store name, with fallbacks
          const storeName = storeNameFromMap || entry.storeName || null;
          
          return (
            <AnamnesisListItem
              key={entry.id}
              entry={{
                ...entry,
                storeName: storeName
              }}
              onClick={() => onSelectEntry(entry)}
              onDelete={onEntryDeleted}
              onAssign={onEntryAssigned}
              onStoreAssign={handleStoreAssign}
              showAssignmentIndicator={true}
              showQuickAssign={showQuickAssign && (isAdmin || true)}
              opticianName={entry.optician_id ? opticianMap.get(entry.optician_id) : null}
              storeName={storeName}
              storeMap={storeMap}
              isBookingWithoutStore={entry.isBookingWithoutStore}
            />
          );
        })}
      </div>
    </>
  );
}
