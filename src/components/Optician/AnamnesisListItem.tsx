
/**
 * This component renders a single anamnesis entry in the list view,
 * showing status, expiration info, and other key details in a compact format.
 * It also provides quick actions like deletion directly from the list view.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { formatDate } from "@/lib/date-utils";
import { EntryStatusBadge } from "./EntriesList/EntryStatusBadge";
import { EntryStatusIcon } from "./EntriesList/EntryStatusIcon";
import { Badge } from "@/components/ui/badge";
import { Trash2, CalendarIcon, MapPinIcon } from "lucide-react";
import { Clock, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnamnesCard } from "./EntriesList/AnamnesCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";

interface AnamnesisListItemProps {
  entry: AnamnesesEntry;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  onClick: () => void;
  onDelete?: () => void;
}

export function AnamnesisListItem({ 
  entry, 
  isExpired,
  daysUntilExpiration,
  onClick,
  onDelete 
}: AnamnesisListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { supabase } = useSupabaseClient();
  const hasAnswers = entry.answers && Object.keys(entry.answers as Record<string, any>).length > 0;
  const hasMagicLinkData = entry.is_magic_link || entry.booking_date || entry.store_id;
  
  // Map entry status to card status
  const getCardStatus = () => {
    if (isExpired) return "expiring";
    return entry.status as "sent" | "pending" | "ready" | "reviewed" | "expiring";
  };
  
  // Choose the appropriate display name based on available data
  const getDisplayName = () => {
    if (entry.first_name) {
      // If we have a first name from magic link, use it
      return `Anamnes för ${entry.first_name}`;
    } else if (entry.patient_identifier) {
      // If we have a patient identifier, use it
      return entry.patient_identifier;
    } else {
      // Fall back to the ID if nothing else is available
      return `Anamnes #${entry.id.substring(0, 8)}`;
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('anamnes_entries')
        .delete()
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: "Anamnes borttagen",
        description: "Anamnesen har tagits bort",
      });

      onDelete?.();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Ett fel uppstod",
        description: "Kunde inte ta bort anamnesen",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

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
    <>
      <AnamnesCard status={getCardStatus()} onClick={onClick}>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <EntryStatusIcon status={entry.status || ""} />
              <p className="font-medium">{getDisplayName()}</p>
              {!hasAnswers && entry.status === 'sent' && (
                <Badge variant="outline" className="text-xs">Ej besvarad</Badge>
              )}
              {entry.is_magic_link && (
                <Badge variant="secondary" className="text-xs">Magic Link</Badge>
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
            
            {/* Display booking information when available */}
            {hasMagicLinkData && (
              <div className="flex flex-wrap gap-3 mt-1">
                {entry.booking_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{formatDate(entry.booking_date)}</span>
                  </div>
                )}
                {entry.store_id && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPinIcon className="h-3 w-3" />
                    <span>Butik: {entry.store_id}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="opacity-60 hover:opacity-100 hover:bg-destructive/10 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            aria-label="Ta bort anamnes"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </AnamnesCard>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer permanent ta bort anamnesen. Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Tar bort..." : "Ta bort"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
