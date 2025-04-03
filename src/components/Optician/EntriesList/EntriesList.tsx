
/**
 * This component renders a list of anamnesis entries.
 * It handles the display of the entries, empty state,
 * and selection of entries for detailed view.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { AnamnesisListItem } from "../AnamnesisListItem";
import { EmptyState } from "./EmptyState";
import { format, isBefore } from "date-fns";

interface EntriesListProps {
  entries: AnamnesesEntry[];
  statusFilter: string | null;
  onSelectEntry: (entry: AnamnesesEntry) => void;
}

export function EntriesList({
  entries,
  statusFilter,
  onSelectEntry
}: EntriesListProps) {
  if (entries.length === 0) {
    return <EmptyState status={statusFilter || "all"} />;
  }

  // Helper to determine if an entry is expired
  const isExpired = (entry: AnamnesesEntry) => {
    return entry.expires_at && isBefore(new Date(entry.expires_at), new Date());
  };

  // Calculate days until expiration
  const daysUntilExpiration = (entry: AnamnesesEntry) => {
    if (!entry.expires_at) return null;
    
    const expiryDate = new Date(entry.expires_at);
    const today = new Date();
    
    // If already expired
    if (isBefore(expiryDate, today)) {
      return -1;
    }
    
    // Calculate days difference
    const diffTime = Math.abs(expiryDate.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-2" role="list" aria-label="Anamnesis entries list">
      {entries.map((entry) => (
        <AnamnesisListItem
          key={entry.id}
          entry={entry}
          isExpired={isExpired(entry)}
          daysUntilExpiration={daysUntilExpiration(entry)}
          onClick={() => onSelectEntry(entry)}
        />
      ))}
    </div>
  );
}
