
/**
 * This component renders a list of anamnesis entries with proper handling for empty state and item selection.
 * It now includes support for quick-assign functionality directly in the list view.
 */

import { EmptyState } from "./EmptyState";
import { AnamnesisListItem } from "../AnamnesisListItem";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useAuth } from "@clerk/clerk-react";

interface EntriesListProps {
  entries: (AnamnesesEntry & {
    isExpired?: boolean;
    daysUntilExpiration?: number | null;
    storeName?: string | null;
  })[];
  onSelectEntry: (entry: AnamnesesEntry) => void;
  onEntryDeleted?: () => void;
  onEntryAssigned?: (entryId: string, opticianId: string | null) => void;
  showQuickAssign?: boolean;
  status?: string;
}

export function EntriesList({
  entries,
  onSelectEntry,
  onEntryDeleted,
  onEntryAssigned,
  showQuickAssign = true,
  status = "pending" // Default status to handle the empty state
}: EntriesListProps) {
  const { opticians } = useOpticians();
  const { has } = useAuth();
  
  // Check if user is admin
  const isAdmin = has && has({ role: "org:admin" });
  
  // Create a map of optician IDs to names for quick lookup
  const opticianMap = new Map<string, string>();
  opticians.forEach(optician => {
    opticianMap.set(optician.id, getOpticianDisplayName(optician));
  });
  
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
          showAssignmentIndicator={true}
          showQuickAssign={showQuickAssign && (isAdmin || true)}
          opticianName={entry.optician_id ? opticianMap.get(entry.optician_id) : null}
        />
      ))}
    </div>
  );
}
