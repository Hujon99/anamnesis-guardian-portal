
/**
 * This component renders a single anamnesis entry in the list view,
 * showing status, expiration info, and other key details in a compact format.
 * It also provides immediate actions like deletion without opening the full modal.
 */

import { useState } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date-utils";
import { EntryStatusBadge } from "./EntriesList/EntryStatusBadge";
import { EntryStatusIcon } from "./EntriesList/EntryStatusIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, Check, Trash2, Loader2 } from "lucide-react";
import { useDeleteAnamnesisEntry } from "@/hooks/useDeleteAnamnesisEntry";
import { DeleteAnamnesisConfirmation } from "./EntryDetails/DeleteAnamnesisConfirmation";

interface AnamnesisListItemProps {
  entry: AnamnesesEntry;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  onClick: () => void;
  onDeleted?: () => void;
}

export function AnamnesisListItem({ 
  entry, 
  isExpired,
  daysUntilExpiration,
  onClick,
  onDeleted
}: AnamnesisListItemProps) {
  const hasAnswers = entry.answers && Object.keys(entry.answers as Record<string, any>).length > 0;
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Use the delete hook
  const { deleteEntry, isDeleting } = useDeleteAnamnesisEntry(() => {
    console.log("List item deletion completed, refreshing list");
    if (onDeleted) {
      onDeleted();
    }
  });
  
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
  
  // Delete confirmation handler
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the card detail
    setShowDeleteConfirmation(true);
  };
  
  const handleConfirmDelete = () => {
    console.log("Delete confirmation accepted, proceeding with deletion of entry:", entry.id);
    deleteEntry(entry.id);
    setShowDeleteConfirmation(false);
  };
  
  const handleCancelDelete = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent opening the card detail
    setShowDeleteConfirmation(false);
  };
  
  return (
    <>
      <Card 
        className="cursor-pointer transition-all hover:shadow border-l-4 hover:scale-[1.01] focus-within:ring-2 focus-within:ring-ring relative group"
        style={{ 
          borderLeftColor: entry.status === 'sent' ? '#d1d5db' : 
                        entry.status === 'pending' ? '#fdba74' : 
                        entry.status === 'ready' ? '#86efac' : '#d1d5db' 
        }}
        onClick={onClick}
        tabIndex={0}
        role="button"
        aria-label={`Visa detaljer för anamnes ${entry.patient_identifier || `#${entry.id.substring(0, 8)}`}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick();
            e.preventDefault();
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <EntryStatusIcon status={entry.status || ""} />
                <p className="font-medium">{entry.patient_identifier || `Anamnes #${entry.id.substring(0, 8)}`}</p>
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
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-8 w-8 flex items-center justify-center text-destructive hover:bg-destructive/10"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                title="Ta bort anamnes"
                aria-label="Ta bort anamnes"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showDeleteConfirmation && (
        <DeleteAnamnesisConfirmation
          isOpen={showDeleteConfirmation}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          patientName={entry.patient_identifier || `Anamnes #${entry.id.substring(0, 8)}`}
        />
      )}
    </>
  );
}
