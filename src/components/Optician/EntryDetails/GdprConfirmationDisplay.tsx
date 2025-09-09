/**
 * GDPR Confirmation Display Component
 * Shows GDPR confirmation details for store-created forms in the entry details view.
 * Displays who provided the confirmation, when, what information was shared, and any notes.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface GdprConfirmation {
  id: string;
  confirmed_by_name: string;
  confirmed_at: string;
  info_type: 'full' | 'short';
  notes?: string;
}

interface GdprConfirmationDisplayProps {
  confirmation: GdprConfirmation | null;
  loading?: boolean;
}

export const GdprConfirmationDisplay: React.FC<GdprConfirmationDisplayProps> = ({
  confirmation,
  loading = false
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            GDPR-information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!confirmation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            GDPR-information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ingen GDPR-bekräftelse registrerad för detta formulär.
          </p>
        </CardContent>
      </Card>
    );
  }

  const infoTypeLabel = confirmation.info_type === 'full' ? 'Full text' : 'Kort text';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-primary" />
          GDPR-information
          <Badge variant="secondary" className="ml-auto">
            Bekräftad
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              Bekräftad av
            </div>
            <p className="text-sm font-medium">{confirmation.confirmed_by_name}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Tidpunkt
            </div>
            <p className="text-sm font-medium">
              {format(new Date(confirmation.confirmed_at), 'dd MMM yyyy HH:mm', { locale: sv })}
            </p>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-3 w-3" />
            Information som delades
          </div>
          <Badge variant="outline" className="text-xs">
            {infoTypeLabel}
          </Badge>
        </div>
        
        {confirmation.notes && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Anteckningar</div>
            <div className="text-sm p-3 bg-muted/50 rounded-md border-l-2 border-primary/20">
              {confirmation.notes}
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Patienten informerades muntligen om personuppgiftsbehandling enligt GDPR och bekräftade detta.
        </div>
      </CardContent>
    </Card>
  );
};