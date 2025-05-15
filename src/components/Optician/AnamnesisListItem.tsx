
/**
 * This component displays a single anamnesis entry in the list view.
 * It shows important information about the entry like status, creation date,
 * and patient information if available.
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, MoreVertical, Trash2, User, Store, AlertTriangle } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
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
import { EntryStatusBadge } from "./EntriesList/EntryStatusBadge";
import { EntryStatusIcon } from "./EntriesList/EntryStatusIcon";
import { QuickAssignDropdown } from "./EntriesList/QuickAssignDropdown";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { getPatientDisplayName } from "@/lib/utils";
import { useStores } from "@/hooks/useStores";

interface AnamnesisListItemProps {
  entry: AnamnesesEntry & {
    isExpired?: boolean;
    daysUntilExpiration?: number | null;
    storeName?: string | null;
    isBookingWithoutStore?: boolean;
  };
  onClick?: () => void;
  onDelete?: () => void;
  onAssign?: (entryId: string, opticianId: string | null) => Promise<void>;
  showAssignmentIndicator?: boolean;
  showQuickAssign?: boolean;
  opticianName?: string | null;
  storeName?: string | null;
  isBookingWithoutStore?: boolean;
}

export const AnamnesisListItem: React.FC<AnamnesisListItemProps> = ({
  entry,
  onClick,
  onDelete,
  onAssign,
  showAssignmentIndicator = false,
  showQuickAssign = false,
  opticianName,
  storeName,
  isBookingWithoutStore,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { deleteEntry, isDeleting } = useEntryMutations(entry.id);
  const { stores } = useStores();
  
  // Get the appropriate store name - try all possible sources
  let displayStoreName = entry.storeName || storeName || null;
  
  // If we still don't have a name but have a store_id, look it up from the stores data
  if (!displayStoreName && entry.store_id && stores.length > 0) {
    const storeFromHook = stores.find(store => store.id === entry.store_id);
    if (storeFromHook) {
      displayStoreName = storeFromHook.name;
    }
  }
  
  // Final fallback to just show the ID if needed
  const finalDisplayStoreName = displayStoreName || entry.store_id;

  const handleDelete = async () => {
    await deleteEntry(entry.id);
    if (onDelete) onDelete();
    setIsDeleteDialogOpen(false);
  };

  const formattedDate = entry.created_at
    ? formatDistanceToNow(new Date(entry.created_at), {
        addSuffix: true,
        locale: sv,
      })
    : "";

  const handleAssign = async (opticianId: string | null) => {
    if (onAssign) {
      await onAssign(entry.id, opticianId);
    }
  };

  const hasBookingInfo = entry.is_magic_link || entry.booking_id || entry.booking_date || entry.store_id;
  
  // Use the patient display name helper
  const patientDisplayName = getPatientDisplayName(entry);

  return (
    <>
      <Card
        onClick={onClick}
        className={`cursor-pointer hover:shadow-md transition-shadow ${
          entry.isExpired ? "opacity-50" : ""
        }`}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <EntryStatusIcon status={entry.status || "sent"} />
              <div>
                <CardTitle className="text-base">
                  {patientDisplayName}
                </CardTitle>
                <CardDescription className="text-xs">
                  Skapad {formattedDate}
                </CardDescription>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Store needs attention indicator */}
              {isBookingWithoutStore && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Bokning utan butik tilldelad</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <EntryStatusBadge
                status={entry.status || "sent"}
              />
              
              {/* Delete button dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="sr-only">Öppna meny</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Ta bort
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-2 px-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              {entry.daysUntilExpiration !== null && (
                <p className="text-xs text-muted-foreground">
                  Gallras om {entry.daysUntilExpiration} dagar
                </p>
              )}
              
              {/* Display booking info and store info */}
              {hasBookingInfo && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {entry.booking_id && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-sm">
                      Bokning: {entry.booking_id}
                    </span>
                  )}
                  
                  {/* Display store name or ID if available, with improved styling */}
                  {entry.store_id && (
                    <div className="flex items-center gap-1">
                      <Store className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="py-0 h-5 bg-primary/5 hover:bg-primary/10">
                        {finalDisplayStoreName}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showAssignmentIndicator && (
                <div className="flex items-center gap-1">
                  {entry.optician_id ? (
                    <div className="flex items-center">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{opticianName || "Ingen optiker"}</span>
                      </Badge>
                    </div>
                  ) : (
                    showQuickAssign && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <QuickAssignDropdown
                          entryId={entry.id}
                          currentOpticianId={entry.optician_id}
                          onAssign={handleAssign}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            <User className="h-3 w-3 mr-1" />
                            <span>Tilldela</span>
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </QuickAssignDropdown>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer permanent radera anamnesformuläret. Denna handling
              kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => e.stopPropagation()}
              disabled={isDeleting}
            >
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/80"
            >
              {isDeleting ? "Raderar..." : "Ta bort"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
