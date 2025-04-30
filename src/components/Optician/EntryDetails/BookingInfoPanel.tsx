
/**
 * This component displays booking information for magic link entries
 * within the entry details modal. It shows booking date, store ID,
 * and other booking-related metadata when available.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { formatDate } from "@/lib/date-utils";
import { CalendarIcon, MapPinIcon, TicketIcon, UserIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface BookingInfoPanelProps {
  entry: AnamnesesEntry;
}

export function BookingInfoPanel({ entry }: BookingInfoPanelProps) {
  // Check if this is a magic link entry with booking information
  const hasMagicLinkData = entry.is_magic_link || 
    entry.booking_id || 
    entry.store_id || 
    entry.first_name || 
    entry.booking_date;

  if (!hasMagicLinkData) {
    return null;
  }

  return (
    <div className="mb-4 space-y-3">
      <h3 className="font-medium text-sm">Bokningsinformation</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entry.first_name && (
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{entry.first_name}</span>
          </div>
        )}
        
        {entry.booking_id && (
          <div className="flex items-center gap-2">
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">ID: {entry.booking_id}</span>
          </div>
        )}
        
        {entry.booking_date && (
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatDate(entry.booking_date)}</span>
          </div>
        )}
        
        {entry.store_id && (
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Butik: {entry.store_id}</span>
          </div>
        )}
      </div>
      
      {entry.is_magic_link && (
        <Alert variant="info" className="bg-blue-50 text-xs">
          <AlertTitle className="text-xs">Magic Link</AlertTitle>
          <AlertDescription className="text-xs">
            Detta är ett formulär som skapats via Magic Link-funktion.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
