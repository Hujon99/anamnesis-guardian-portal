
/**
 * This component renders a list of anamnesis entries.
 * It handles the display of the entries, empty state,
 * and selection of entries for detailed view.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { AnamnesisListItem } from "../AnamnesisListItem";
import { EmptyState } from "./EmptyState";

interface EntriesListProps {
  entries: (AnamnesesEntry & {
    isExpired: boolean;
    daysUntilExpiration: number | null;
  })[];
  onSelectEntry: (entry: AnamnesesEntry) => void;
  onEntryDeleted?: () => void;
}

export function EntriesList({
  entries,
  onSelectEntry,
  onEntryDeleted
}: EntriesListProps) {
  if (entries.length === 0) {
    return <EmptyState status="all" />;
  }

  return (
    <div className="space-y-3" role="list" aria-label="Anamnesis entries list">
      {entries.map((entry) => (
        <AnamnesisListItem
          key={entry.id}
          entry={entry}
          isExpired={entry.isExpired}
          daysUntilExpiration={entry.daysUntilExpiration}
          onClick={() => onSelectEntry(entry)}
          onDelete={onEntryDeleted}
        />
      ))}
    </div>
  );
}
