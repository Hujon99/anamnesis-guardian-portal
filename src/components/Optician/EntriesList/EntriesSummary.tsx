
/**
 * This component displays a summary of the current entries list,
 * showing the number of filtered entries, total entries count,
 * and the last update time.
 */

import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface EntriesSummaryProps {
  filteredCount: number;
  totalCount: number;
  statusFilter: string | null;
  isFetching: boolean;
  lastUpdated: Date | null;
}

export function EntriesSummary({
  filteredCount,
  totalCount,
  statusFilter,
  isFetching,
  lastUpdated
}: EntriesSummaryProps) {
  return (
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {isFetching ? (
            <span className="flex items-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Uppdaterar...
            </span>
          ) : (
            `${filteredCount} av ${totalCount} anamneser`
          )}
        </p>
        {statusFilter && (
          <Badge variant="outline" className="flex items-center gap-1">
            {statusFilter === "sent" ? "Skickade" : 
             statusFilter === "pending" ? "Att granska" : 
             statusFilter === "ready" ? "Klara" : 
             statusFilter === "journaled" ? "Journalförda" : 
             statusFilter === "reviewed" ? "Journalförda" : statusFilter}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {lastUpdated && 
         `Senast uppdaterad: ${lastUpdated.toLocaleTimeString('sv-SE')}`}
      </p>
    </div>
  );
}
