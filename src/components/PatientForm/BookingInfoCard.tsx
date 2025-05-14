
/**
 * This component displays the booking information for magic link entries.
 * It shows booking details like date, first name, and store information.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, UserIcon, Store } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";

interface BookingInfoCardProps {
  firstName?: string | null;
  bookingId?: string | null;
  bookingDate?: string | null;
  storeId?: string | null;
  storeName?: string | null;
}

const BookingInfoCard: React.FC<BookingInfoCardProps> = ({
  firstName,
  bookingId,
  bookingDate,
  storeId,
  storeName
}) => {
  // Don't render anything if there's no booking information
  if (!firstName && !bookingId && !bookingDate && !storeId) {
    return null;
  }

  const formattedDate = bookingDate ? formatDate(bookingDate) : null;

  return (
    <Card className="mb-4 bg-muted/30 border-muted">
      <CardContent className="pt-4 pb-3">
        <h3 className="text-sm font-medium mb-2">Bokningsinformation</h3>
        
        <div className="space-y-2 text-sm">
          {bookingId && (
            <div>
              <p className="font-medium">Boknings-ID: {bookingId}</p>
            </div>
          )}
          
          {firstName && (
            <div className="flex items-start space-x-2">
              <UserIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p>Förnamn: {firstName}</p>
              </div>
            </div>
          )}
          
          {formattedDate && (
            <div className="flex items-start space-x-2">
              <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p>Bokningsdatum: {formattedDate}</p>
              </div>
            </div>
          )}
          
          {/* Store information with proper icon and name when available */}
          {storeId && (
            <div className="flex items-start space-x-2">
              <Store className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex flex-col">
                {storeName ? (
                  <Badge variant="outline" className="bg-primary/5 w-fit">
                    {storeName}
                  </Badge>
                ) : (
                  <p>Butiks-ID: {storeId}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingInfoCard;
