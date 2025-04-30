
/**
 * This component provides a filter for booking-related entries.
 * It allows users to filter anamnesis entries that were created through magic links.
 */

import { useState } from "react";
import { Check, TicketIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BookingFilterProps {
  showOnlyBookings: boolean;
  onBookingFilterChange: (value: boolean) => void;
}

export function BookingFilter({
  showOnlyBookings,
  onBookingFilterChange,
}: BookingFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={showOnlyBookings ? "border-primary" : ""}
        >
          <TicketIcon className="h-4 w-4 mr-2" />
          Bokningar
          {showOnlyBookings && (
            <Badge variant="secondary" className="ml-2">
              Filter på
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Bokningsfilter</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showOnlyBookings}
          onCheckedChange={(checked) => {
            onBookingFilterChange(checked);
            setOpen(false);
          }}
        >
          <div className="flex items-center">
            <span className="mr-2">Visa endast bokningar</span>
            {showOnlyBookings && <Check className="h-4 w-4 ml-auto" />}
          </div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
