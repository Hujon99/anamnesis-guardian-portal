/**
 * Component that displays today's bookings in a separate section with visual emphasis.
 * This helps opticians quickly identify which customers with today's appointments
 * have submitted their anamnesis forms.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { AnamnesisListItem } from "./AnamnesisListItem";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TodayBookingsSectionProps {
  todayBookings: AnamnesesEntry[];
  onSelectEntry: (entry: AnamnesesEntry) => void;
  onEntryDeleted: () => void;
  onEntryAssigned: (entryId: string, opticianId: string | null) => Promise<void>;
  onStoreAssigned: (entryId: string, storeId: string | null) => Promise<void>;
}

export function TodayBookingsSection({
  todayBookings,
  onSelectEntry,
  onEntryDeleted,
  onEntryAssigned,
  onStoreAssigned
}: TodayBookingsSectionProps) {
  const submittedCount = todayBookings.filter(entry => 
    entry.answers && Object.keys(entry.answers as Record<string, any>).length > 0
  ).length;

  if (todayBookings.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Dagens bokningar</h3>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Users className="h-3 w-3 mr-1" />
            {todayBookings.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Inskickade:</span>
          <Badge 
            variant={submittedCount === todayBookings.length ? "default" : "outline"}
            className={submittedCount === todayBookings.length ? "bg-green-100 text-green-800 border-green-200" : ""}
          >
            {submittedCount}/{todayBookings.length}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-3">
        {todayBookings.map((entry) => (
          <div key={entry.id} className="relative">
            <AnamnesisListItem
              entry={entry}
              onClick={() => onSelectEntry(entry)}
              onDelete={onEntryDeleted}
              onAssign={onEntryAssigned}
              onStoreAssign={onStoreAssigned}
              showQuickAssign={true}
            />
            {/* Visual indicator for today's booking */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full"></div>
          </div>
        ))}
      </div>
    </Card>
  );
}