
/**
 * This component renders a list of anamnesis entries with proper handling for empty state and item selection.
 * It now includes support for quick-assign functionality for both opticians and stores directly in the list view.
 */

import { EmptyState } from "./EmptyState";
import { AnamnesisListItem } from "../AnamnesisListItem";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";
import { useStores } from "@/hooks/useStores";
import { useEffect, useMemo } from "react";

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
  const { stores, refetch: refetchStores, getStoreName, getStoreMap } = useStores();
  const { has } = useAuth();
  
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
  }, [refetchStores]);
  
  // Handle store assignment - now simply passes through the provided callback
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
      console.log(`EntriesList: Assigning store ${storeId} to entry ${entryId}`);
      await onStoreAssigned(entryId, storeId);
      
      // Refresh store data after assignment
      await refetchStores();
      
      // Show success message
      toast({
        title: "Butik tilldelad",
        description: storeId 
          ? "Anamnes har kopplats till butik" 
          : "Butikskoppling har tagits bort",
      });
    } catch (error) {
      console.error("Error assigning store:", error);
      
      toast({
        title: "Fel vid tilldelning av butik",
        description: "Det gick inte att koppla anamnes till butik",
        variant: "destructive",
      });
    }
  };
  
  if (entries.length === 0) {
    return <EmptyState status={status} />;
  }

  return (
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
  );
}
