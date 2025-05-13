
/**
 * This component renders a single anamnesis list item with detailed information,
 * status indicators, and assignment indicators.
 */

import { useState } from "react";
import { AnamnesCard } from "./EntriesList/AnamnesCard";
import { EntryStatusBadge } from "./EntriesList/EntryStatusBadge";
import { EntryStatusIcon } from "./EntriesList/EntryStatusIcon";
import { formatDate } from "@/lib/date-utils";
import { AnamnesesEntry } from "@/types/anamnesis";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Store as StoreIcon, Trash2, User } from "lucide-react";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnamnesisListItemProps {
  entry: AnamnesesEntry & {
    isExpired?: boolean;
    daysUntilExpiration?: number | null;
    storeName?: string | null;
  };
  onClick: () => void;
  onDelete?: () => void;
  showAssignmentIndicator?: boolean; 
}

// Helper function to get proper patient display name
const getPatientDisplayName = (entry: AnamnesesEntry): string => {
  // First priority: patient_identifier if it looks like a name
  if (entry.patient_identifier && entry.patient_identifier.length > 1 && 
      !entry.patient_identifier.match(/^[0-9]+$/) && // Not just numbers
      entry.patient_identifier !== "undefined" && 
      entry.patient_identifier !== "null") {
    return entry.patient_identifier;
  }
  
  // Second priority: first_name if available
  if (entry.first_name && 
      entry.first_name.length > 0 && 
      entry.first_name !== "undefined" && 
      entry.first_name !== "null") {
    return entry.first_name;
  }
  
  // Third priority: Use both if available and different
  if (entry.first_name && entry.patient_identifier && 
      entry.first_name !== entry.patient_identifier &&
      entry.first_name.length > 0 &&
      entry.first_name !== "undefined" && 
      entry.first_name !== "null") {
    return `${entry.first_name} (${entry.patient_identifier})`;
  }
  
  // Fallback
  return "Okänd patient";
};

export function AnamnesisListItem({
  entry,
  onClick,
  onDelete,
  showAssignmentIndicator = true,
}: AnamnesisListItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { deleteEntry, isDeleting } = useEntryMutations(entry.id);

  const handleDelete = async () => {
    try {
      await deleteEntry(entry.id);
      toast({
        title: "Anamnes borttagen",
        description: "Anamnesen har tagits bort från systemet",
      });
      if (onDelete) onDelete();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Fel vid borttagning",
        description: "Kunde inte ta bort anamnesen. Försök igen senare.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  // Get the appropriate patient display name
  const patientName = getPatientDisplayName(entry);

  return (
    <>
      <AnamnesCard
        status={entry.status as any}
        onClick={onClick}
        className="relative overflow-visible"
        data-testid="anamnesis-card"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-3">
            <EntryStatusIcon status={entry.status} />
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <h3 className="text-base font-medium">
                  {patientName}
                </h3>
                <div className="flex flex-wrap gap-1 items-center">
                  <EntryStatusBadge status={entry.status} />
                  
                  {entry.is_magic_link && (
                    <Badge variant="outline" className="bg-gray-100 text-xs">
                      Direktlänk
                    </Badge>
                  )}
                  
                  {entry.booking_id && (
                    <Badge variant="outline" className="bg-gray-100 text-xs">
                      Bokning
                    </Badge>
                  )}

                  {/* Assignment status indicator */}
                  {showAssignmentIndicator && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant={entry.optician_id ? "default" : "outline"} 
                            className={entry.optician_id ? "bg-accent-1 text-xs" : "bg-gray-100 text-xs"}
                          >
                            <User className="h-3 w-3 mr-1" />
                            {entry.optician_id ? "Tilldelad" : "Ej tilldelad"}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {entry.optician_id 
                            ? "Anamnesen är tilldelad en optiker" 
                            : "Anamnesen är inte tilldelad någon optiker"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {/* Store indicator if available */}
                  {entry.storeName && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="bg-gray-100 text-xs">
                            <StoreIcon className="h-3 w-3 mr-1" />
                            {entry.storeName}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Butik: {entry.storeName}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {entry.sent_at
                  ? `Skickad ${formatDate(entry.sent_at)}`
                  : "Datum saknas"}
              </p>
            </div>
          </div>

          {/* Delete button */}
          {(entry.status === "sent" || entry.status === "pending") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteClick}
              className="h-8 w-8 rounded-full"
              aria-label="Ta bort"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </div>
      </AnamnesCard>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer permanent ta bort anamnesen från systemet.
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tar bort...
                </>
              ) : (
                "Ta bort"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
