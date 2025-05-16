
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
  const { has } = useAuth();
  
  // Check if user is admin
  const isAdmin = has && has({ role: "org:admin" });
  
  // Create a map of optician IDs to names for quick lookup
  // Important: Map using clerk_user_id instead of database id since entry.optician_id contains Clerk User IDs
  const opticianMap = new Map<string, string>();
  opticians.forEach(optician => {
    if (optician.clerk_user_id) {
      opticianMap.set(optician.clerk_user_id, getOpticianDisplayName(optician));
    }
  });
  
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
      {entries.map((entry) => (
        <AnamnesisListItem
          key={entry.id}
          entry={entry}
          onClick={() => onSelectEntry(entry)}
          onDelete={onEntryDeleted}
          onAssign={onEntryAssigned}
          onStoreAssign={handleStoreAssign}
          showAssignmentIndicator={true}
          showQuickAssign={showQuickAssign && (isAdmin || true)}
          opticianName={entry.optician_id ? opticianMap.get(entry.optician_id) : null}
          storeName={entry.storeName}
          isBookingWithoutStore={entry.isBookingWithoutStore}
        />
      ))}
    </div>
  );
}
