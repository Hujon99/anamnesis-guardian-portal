
/**
 * This component displays booking information for magic link entries
 * within the entry details modal. It shows booking date, store ID,
 * and other booking-related metadata when available.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { formatDate } from "@/lib/date-utils";
import { CalendarIcon, MapPinIcon, TicketIcon, UserIcon, Store } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BookingInfoPanelProps {
  entry: AnamnesesEntry;
  onAssignStore?: (storeId: string | null) => Promise<void>;
}

export function BookingInfoPanel({ entry, onAssignStore }: BookingInfoPanelProps) {
  // Check if this is a magic link entry with booking information
  const hasMagicLinkData = entry.is_magic_link || 
    entry.booking_id || 
    entry.store_id || 
    entry.first_name || 
    entry.booking_date;

  const { stores } = useStores();
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Find store name if a store ID is present
  const storeName = entry.store_id 
    ? stores.find(store => store.id === entry.store_id)?.name || "Okänd butik"
    : null;

  if (!hasMagicLinkData) {
    return null;
  }

  // Handle store assignment
  const handleAssignStore = async () => {
    if (!onAssignStore) return;
    
    try {
      setIsAssigning(true);
      // Open the Assignments tab or show a store picker would go here
      // For now we'll just call the callback function
      await onAssignStore(null); // This will be called in the parent component to show a proper UI
    } catch (error) {
      console.error("Error assigning store:", error);
    } finally {
      setIsAssigning(false);
    }
  };

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
        
        {/* Store information with icon and badge */}
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          
          {entry.store_id && storeName ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-primary/5 hover:bg-primary/10">
                    {storeName}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Butiks-ID: {entry.store_id}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ingen butik tilldelad</span>
              {onAssignStore && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-2 text-xs" 
                  onClick={handleAssignStore}
                  disabled={isAssigning}
                >
                  <MapPinIcon className="h-3 w-3 mr-1" />
                  Tilldela
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {entry.is_magic_link && (
        <Alert variant="default" className="bg-blue-50 text-xs">
          <AlertTitle className="text-xs">Magic Link</AlertTitle>
          <AlertDescription className="text-xs">
            Detta är ett formulär som skapats via Magic Link-funktion.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
