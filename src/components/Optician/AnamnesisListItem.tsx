
/**
 * This component displays a single anamnesis entry in the list view.
 * It shows important information about the entry like status, creation date,
 * and patient information if available. Now includes quick assignment functionality 
 * for both opticians and stores directly from the list view.
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
import { QuickStoreAssignDropdown } from "./EntriesList/QuickStoreAssignDropdown";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPatientDisplayName } from "@/lib/utils";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";

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
  onStoreAssign?: (entryId: string, storeId: string | null) => Promise<void>;
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
  onStoreAssign,
  showAssignmentIndicator = false,
  showQuickAssign = false,
  opticianName,
  storeName,
  isBookingWithoutStore,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { supabase } = useSupabaseClient();
  
  // Get the appropriate store name - priority order: entry.storeName, storeName prop, entry.store_id
  // Entry.storeName comes from the enhanced entries in AnamnesisListView
  // storeName prop is a fallback passed from the parent
  const displayStoreName = entry.storeName || storeName || null;
  
  console.log(`AnamnesisListItem: Entry ${entry.id} store info:`, {
    entryStoreId: entry.store_id,
    entryStoreName: entry.storeName,
    propsStoreName: storeName,
    finalDisplayName: displayStoreName
  });
  
  // Final fallback to just show the ID if needed
  const finalDisplayStoreName = displayStoreName || (entry.store_id ? `ID: ${entry.store_id.substring(0, 8)}` : null);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from("anamnes_entries")
        .delete()
        .eq("id", entry.id);
        
      if (error) throw error;
      
      if (onDelete) onDelete();
      setIsDeleteDialogOpen(false);
      
      toast({
        title: "Anamnes borttagen",
        description: "Anamnesen har raderats permanent"
      });
    } catch (error) {
      console.error("Error deleting entry:", error);
      
      toast({
        title: "Fel vid borttagning",
        description: "Det gick inte att ta bort anamnesen",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
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

  const handleStoreAssign = async (storeId: string | null) => {
    if (onStoreAssign) {
      console.log(`AnamnesisListItem: Assigning store ${storeId} to entry ${entry.id}`);
      await onStoreAssign(entry.id, storeId);
    }
  };

  const hasBookingInfo = entry.is_magic_link || entry.booking_id || entry.booking_date || entry.store_id;
  
  // Use the patient display name helper
  const patientDisplayName = getPatientDisplayName(entry);

  // Helper to stop event propagation
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

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
                    onClick={stopPropagation}
                  >
                    <span className="sr-only">Öppna meny</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border shadow-md z-50">
                  <DropdownMenuItem
                    onClick={(e) => {
                      stopPropagation(e);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-destructive focus:text-destructive cursor-pointer"
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
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showAssignmentIndicator && (
                <div className="flex items-center gap-2">
                  {/* Store assignment UI */}
                  {showQuickAssign ? (
                    <div onClick={stopPropagation}>
                      {entry.store_id ? (
                        <QuickStoreAssignDropdown
                          entryId={entry.id}
                          currentStoreId={entry.store_id}
                          onAssign={handleStoreAssign}
                        >
                          <Badge variant="outline" className="flex items-center gap-1 py-0 h-6 bg-primary/5 hover:bg-primary/10 cursor-pointer">
                            <Store className="h-3 w-3 text-muted-foreground" />
                            <span className="max-w-[120px] truncate">{finalDisplayStoreName || "Välj butik"}</span>
                            <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
                          </Badge>
                        </QuickStoreAssignDropdown>
                      ) : (
                        <QuickStoreAssignDropdown
                          entryId={entry.id}
                          currentStoreId={null}
                          onAssign={handleStoreAssign}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            <Store className="h-3 w-3 mr-1" />
                            <span>Butik</span>
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </QuickStoreAssignDropdown>
                      )}
                    </div>
                  ) : entry.store_id && finalDisplayStoreName && (
                    <Badge variant="outline" className="flex items-center gap-1 py-0 h-6 bg-primary/5">
                      <Store className="h-3 w-3 text-muted-foreground" />
                      <span className="max-w-[120px] truncate">{finalDisplayStoreName}</span>
                    </Badge>
                  )}

                  {/* Optician assignment UI */}
                  {entry.optician_id ? (
                    <div onClick={stopPropagation}>
                      {showQuickAssign ? (
                        <QuickAssignDropdown
                          entryId={entry.id}
                          currentOpticianId={entry.optician_id}
                          onAssign={handleAssign}
                        >
                          <Badge variant="secondary" className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80">
                            <User className="h-3 w-3" />
                            <span>{opticianName || "Optiker"}</span>
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Badge>
                        </QuickAssignDropdown>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{opticianName || "Optiker"}</span>
                        </Badge>
                      )}
                    </div>
                  ) : (
                    showQuickAssign && (
                      <div onClick={stopPropagation}>
                        <QuickAssignDropdown
                          entryId={entry.id}
                          currentOpticianId={entry.optician_id}
                          onAssign={handleAssign}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            <User className="h-3 w-3 mr-1" />
                            <span>Optiker</span>
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
