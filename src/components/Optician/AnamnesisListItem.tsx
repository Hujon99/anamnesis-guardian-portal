
/**
 * This component renders a single anamnesis entry in the list view,
 * showing status, expiration info, and other key details in a compact format.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date-utils";
import { EntryStatusBadge } from "./EntriesList/EntryStatusBadge";
import { EntryStatusIcon } from "./EntriesList/EntryStatusIcon";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, Check } from "lucide-react";

interface AnamnesisListItemProps {
  entry: AnamnesesEntry;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  onClick: () => void;
}

export function AnamnesisListItem({ 
  entry, 
  isExpired,
  daysUntilExpiration,
  onClick 
}: AnamnesisListItemProps) {
  const hasAnswers = entry.answers && Object.keys(entry.answers as Record<string, any>).length > 0;
  
  // Get expiration badge content
  const getExpirationBadge = () => {
    if (isExpired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Utgången
        </Badge>
      );
    }
    
    if (daysUntilExpiration === null) return null;
    
    if (daysUntilExpiration <= 2) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Går ut om {daysUntilExpiration} {daysUntilExpiration === 1 ? 'dag' : 'dagar'}
        </Badge>
      );
    }
    
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <Check className="h-3 w-3" />
        {daysUntilExpiration} dagar kvar
      </Badge>
    );
  };
  
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow border-l-4 hover:scale-[1.01] focus-within:ring-2 focus-within:ring-ring"
      style={{ 
        borderLeftColor: entry.status === 'sent' ? '#d1d5db' : 
                         entry.status === 'pending' ? '#fdba74' : 
                         entry.status === 'ready' ? '#86efac' : '#d1d5db' 
      }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Visa detaljer för anamnes ${entry.patient_email || `#${entry.id.substring(0, 8)}`}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
          e.preventDefault();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <EntryStatusIcon status={entry.status || ""} />
              <p className="font-medium">{entry.patient_email || `Anamnes #${entry.id.substring(0, 8)}`}</p>
              {!hasAnswers && entry.status === 'sent' && (
                <Badge variant="outline" className="text-xs">Ej besvarad</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {entry.sent_at 
                  ? `Skickad: ${formatDate(entry.sent_at)}` 
                  : `Skapad: ${formatDate(entry.created_at || "")}`}
              </p>
              <EntryStatusBadge status={entry.status || ""} isExpired={isExpired} />
              {getExpirationBadge()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
