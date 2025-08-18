
/**
 * This component displays a summary of the current entries list,
 * showing the number of filtered entries, total entries count,
 * and the last update time.
 */

import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Calendar } from "lucide-react";

interface EntriesSummaryProps {
  filteredCount: number;
  totalCount: number;
  statusFilter: string | null;
  isFetching: boolean;
  lastUpdated: Date | null;
  todayBookingsCount?: number;
}

export function EntriesSummary({ 
  filteredCount, 
  totalCount, 
  statusFilter, 
  isFetching, 
  lastUpdated,
  todayBookingsCount = 0
}: EntriesSummaryProps) {
  return (
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            {isFetching ? (
              <span className="flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Uppdaterar...
              </span>
            ) : (
              `Visar ${filteredCount} av ${totalCount} anamneser`
            )}
          </span>
        </div>
        
        {todayBookingsCount > 0 && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">
              {todayBookingsCount} bokningar idag
            </span>
          </div>
        )}
        
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
