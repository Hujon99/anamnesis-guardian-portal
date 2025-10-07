
/**
 * This component renders a list of anamnesis entries with proper handling for empty state and item selection.
 * It now includes support for quick-assign functionality for both opticians and stores directly in the list view,
 * with robust error handling and persistent store data management.
 */

import { EmptyState } from "./EmptyState";
import { AnamnesisListItem } from "../AnamnesisListItem";
import { AnamnesisDetailModal } from "../AnamnesisDetailModal";
import { DrivingLicenseExamination } from "../DrivingLicense/DrivingLicenseExamination";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AnamnesesEntry } from "@/types/anamnesis";
import React, { useState, useEffect, useMemo } from "react";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";
import { useStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { logAccess } from "@/utils/auditLogClient";

interface EntriesListProps {
  entries: (AnamnesesEntry & {
    isExpired?: boolean;
    daysUntilExpiration?: number | null;
    storeName?: string | null;
    isBookingWithoutStore?: boolean;
  })[];
  onSelectEntry: (entry: AnamnesesEntry) => void;
  onEntryDeleted?: () => void;
  onEntryUpdated?: () => void;
  onEntryAssigned?: (entryId: string, opticianId: string | null) => Promise<void>;
  onStoreAssigned?: (entryId: string, storeId: string | null) => Promise<void>;
  onDrivingLicenseExamination?: (entry: AnamnesesEntry) => void;
  showQuickAssign?: boolean;
  status?: string;
}

export function EntriesList({
  entries,
  onSelectEntry,
  onEntryDeleted,
  onEntryUpdated,
  onEntryAssigned,
  onStoreAssigned,
  onDrivingLicenseExamination,
  showQuickAssign = true,
  status = "pending" // Default status to handle the empty state
}: EntriesListProps) {
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [drivingLicenseEntry, setDrivingLicenseEntry] = useState<AnamnesesEntry | null>(null);
  const [isDrivingLicenseOpen, setIsDrivingLicenseOpen] = useState(false);
  const { opticians } = useOpticians();
  const { stores, refetch: refetchStores, getStoreName, getStoreMap, forceRefreshStores } = useStores();
  const { has } = useAuth();
  const { supabase } = useSupabaseClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showStoreDataWarning, setShowStoreDataWarning] = useState(false);
  
  // Check if user is admin
  const isAdmin = has && has({ role: "org:admin" });
  
  // Create a map of optician IDs to names for quick lookup
  const opticianMap = useMemo(() => {
    const map = new Map<string, string>();
    opticians.forEach(optician => {
      if (optician.clerk_user_id) {
        map.set(optician.clerk_user_id, getOpticianDisplayName(optician));
      }
    });
    return map;
  }, [opticians]);
  
  // Get the store map
  const storeMap = useMemo(() => {
    return getStoreMap();
  }, [getStoreMap]);
  
  // Force fetch stores when component mounts
  useEffect(() => {
    refetchStores();
    
    // Show store data warning if we have entries with store IDs but no stores data
    const entriesWithStores = entries.filter(entry => entry.store_id).length;
    const hasStoreData = Array.isArray(stores) && stores.length > 0;
    
    if (entriesWithStores > 0 && !hasStoreData) {
      setShowStoreDataWarning(true);
    } else {
      setShowStoreDataWarning(false);
    }
  }, [refetchStores, entries, stores]);
  
  // Handler for manual refresh of store data
  const handleRefreshStores = async () => {
    setIsRefreshing(true);
    try {
      await forceRefreshStores();
      setShowStoreDataWarning(false);
      
      toast({
        title: "Butiksdata uppdaterad",
        description: `${stores?.length || 0} butiker hämtades framgångsrikt`,
      });
    } catch (error) {
      console.error("Error refreshing stores:", error);
      
      toast({
        title: "Fel vid uppdatering",
        description: "Kunde inte uppdatera butiksinformation. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Create a wrapper function for store assignment that uses the onStoreAssigned callback
  const handleStoreAssign = async (entryId: string, storeId: string | null): Promise<void> => {
    if (!entryId) {
      console.error("Missing entry ID for store assignment");
      toast({
        title: "Fel vid tilldelning",
        description: "Kunde inte tilldela butik: Saknar anamnes-ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      
      // Use the callback provided by the parent component
      if (onStoreAssigned) {
        await onStoreAssigned(entryId, storeId);
        
        // Always refresh store data after assignment to ensure UI is up-to-date
        await refetchStores();
        
        // Update UI state
        setShowStoreDataWarning(false);
      } else {
        console.error("No onStoreAssigned callback provided");
        toast({
          title: "Konfigurationsfel",
          description: "Kunde inte tilldela butik: Saknar callback-funktion",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleStoreAssign:", error);
      
      // Show a user-friendly error message
      toast({
        title: "Tilldelning misslyckades",
        description: "Ett fel uppstod vid tilldelning av butik. Försök igen.",
        variant: "destructive",
      });
    }
  };
  
  // Make sure we have a valid entries array to work with
  const safeEntries = Array.isArray(entries) ? entries : [];
  
  if (safeEntries.length === 0) {
    return <EmptyState status={status} />;
  }

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

  // Group entries by booking date category for visual separation
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const groupedEntries = safeEntries.reduce((groups, entry) => {
    const bookingDate = entry.booking_date ? new Date(entry.booking_date) : null;
    
    if (bookingDate && isSameDay(bookingDate, now)) {
      groups.today.push(entry);
    } else if (bookingDate && bookingDate > today) {
      groups.future.push(entry);
    } else if (bookingDate && bookingDate < today) {
      groups.past.push(entry);
    } else {
      groups.noDate.push(entry);
    }
    
    return groups;
  }, {
    today: [] as typeof safeEntries,
    future: [] as typeof safeEntries,
    past: [] as typeof safeEntries,
    noDate: [] as typeof safeEntries
  });

  const renderEntryGroup = (entries: typeof safeEntries, showSeparator = false) => (
    <>
      {showSeparator && entries.length > 0 && (
        <div className="border-t border-border/50 pt-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground px-2">
              Tidigare bokningar
            </span>
            <div className="h-px bg-border flex-1" />
          </div>
        </div>
      )}
      {entries.map((entry) => {
          // Lookup store name directly from our map
          const storeNameFromMap = entry.store_id ? getStoreName(entry.store_id) : null;
          
  // Set final store name, with fallbacks
          const storeName = storeNameFromMap || entry.storeName || null;
          
          const handleSelectEntry = async () => {
            await logAccess(supabase, {
              table: 'anamnes_entries',
              recordId: entry.id,
              purpose: 'detail_view',
              route: window.location.pathname
            });
            setSelectedEntry(entry);
            setIsDetailModalOpen(true);
          };

          const handleDrivingLicenseExamination = (entry: AnamnesesEntry) => {
            setDrivingLicenseEntry(entry);
            setIsDrivingLicenseOpen(true);
          };
          
        return (
          <AnamnesisListItem
            key={entry.id}
            entry={{
              ...entry,
              storeName: storeName
            }}
            onClick={handleSelectEntry}
            onDelete={onEntryDeleted}
            onEntryUpdated={onEntryUpdated}
            onAssign={onEntryAssigned}
            onStoreAssign={handleStoreAssign}
            onDrivingLicenseExamination={onDrivingLicenseExamination || handleDrivingLicenseExamination}
            showAssignmentIndicator={true}
            showQuickAssign={showQuickAssign && (isAdmin || true)}
            opticianName={entry.optician_id ? opticianMap.get(entry.optician_id) : null}
            storeName={storeName}
            storeMap={storeMap}
            isBookingWithoutStore={entry.isBookingWithoutStore}
          />
        );
      })}
    </>
  );

  return (
    <>
      {showStoreDataWarning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Butiksinformation saknas</p>
            <p className="text-xs">Vissa butiker kunde inte visas korrekt. Uppdatera för att visa fullständig information.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshStores}
            disabled={isRefreshing}
            className="bg-white"
          >
            {isRefreshing ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Uppdatera
          </Button>
        </div>
      )}
    
      <div className="space-y-4 mt-4">
        {/* Today's bookings */}
        {renderEntryGroup(groupedEntries.today)}
        
        {/* Future bookings */}
        {renderEntryGroup(groupedEntries.future)}
        
        {/* Entries without booking dates */}
        {renderEntryGroup(groupedEntries.noDate)}
        
        {/* Past bookings with separator */}
        {renderEntryGroup(groupedEntries.past, true)}
      </div>

      {selectedEntry && (
        <AnamnesisDetailModal
          entry={selectedEntry}
          isOpen={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          onEntryUpdated={() => {
            if (onEntryUpdated) onEntryUpdated();
          }}
        />
      )}

      {drivingLicenseEntry && (
        <Dialog open={isDrivingLicenseOpen} onOpenChange={setIsDrivingLicenseOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DrivingLicenseExamination
              entry={drivingLicenseEntry}
              onClose={() => {
                setDrivingLicenseEntry(null);
                setIsDrivingLicenseOpen(false);
                if (onEntryUpdated) onEntryUpdated();
              }}
              onUpdate={onEntryUpdated || (() => {})}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
