/**
 * This component provides a unified list view of all anamnesis entries
 * with filtering, searching, and sorting capabilities. It implements
 * Supabase's realtime functionality for live updates to entries.
 * Redesigned with improved filter layout and visual hierarchy.
 */

import { useState, useEffect, useCallback } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { AnamnesisDetailModal } from "./AnamnesisDetailModal";
import { DrivingLicenseExamination } from "./DrivingLicense/DrivingLicenseExamination";
import { CompactSearchAndFilter } from "./CompactSearchAndFilter";
import { ErrorState } from "./EntriesList/ErrorState";
import { LoadingState } from "./EntriesList/LoadingState";
import { EntriesSummary } from "./EntriesList/EntriesSummary";
import { EntriesList } from "./EntriesList/EntriesList";
import { TodayBookingsSection } from "./TodayBookingsSection";
import { useAnamnesisList } from "@/hooks/useAnamnesisList";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useStores } from "@/hooks/useStores";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useActiveStore } from "@/contexts/ActiveStoreContext";
import { useEntriesWithoutStore } from "@/hooks/useEntriesWithoutStore";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { assignOpticianToEntry, assignStoreToEntry } from "@/utils/entryMutationUtils";
import { toast } from "@/components/ui/use-toast";
import { NoStoreSelectedAlert } from "./NoStoreSelectedAlert";
import { DirectFormButton } from "./DirectFormButton";

interface AnamnesisListViewProps {
  showAdvancedFilters?: boolean;
  autoOpenDrivingLicenseExam?: string | null;
  onDrivingLicenseExamOpened?: () => void;
}

export function AnamnesisListView({ 
  showAdvancedFilters = false,
  autoOpenDrivingLicenseExam,
  onDrivingLicenseExamOpened
}: AnamnesisListViewProps) {
  const {
    filteredEntries,
    entries,
    filters,
    updateFilter,
    resetFilters,
    isLoading,
    error,
    isFetching,
    handleRetry,
    refetch,
    dataLastUpdated
  } = useAnamnesisList();
  
  // State for selected entry
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const [drivingLicenseEntry, setDrivingLicenseEntry] = useState<AnamnesesEntry | null>(null);
  const [isDrivingLicenseOpen, setIsDrivingLicenseOpen] = useState(false);
  const [isAssigningStore, setIsAssigningStore] = useState(false);
  const [isAssigningOptician, setIsAssigningOptician] = useState(false);
  const [searchInAllStores, setSearchInAllStores] = useState(false);
  
  const isMobile = useIsMobile();
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();
  const { syncUsersWithToast } = useSyncClerkUsers();
  const { activeStore, hasMultipleStores } = useActiveStore();
  const { entriesWithoutStore, count: withoutStoreCount } = useEntriesWithoutStore();
  
  // Use the useStores hook with improved store handling
  const { 
    stores, 
    refetch: refetchStores, 
    isLoading: isLoadingStores,
    getStoreName,
    getStoreMap 
  } = useStores();
  
  // Prefetch and warm up the stores cache immediately when component mounts
  useEffect(() => {
    const prefetchStores = async () => {
      await refetchStores();
    };
    
    prefetchStores();
    
    // Also sync Clerk users with Supabase on component mount
    syncUsersWithToast();
  }, [refetchStores, syncUsersWithToast]);

  // Manual refresh handler that refetches both entries and stores
  const handleManualRefresh = useCallback(() => {
    refetch();
    refetchStores();
  }, [refetch, refetchStores]);

  // Handle optician assignment - Move the hook outside the callback
  const handleEntryAssigned = useCallback(async (entryId: string, opticianId: string | null): Promise<void> => {
    if (!entryId) {
      console.error("Missing entry ID for optician assignment");
      toast({
        title: "Fel vid tilldelning",
        description: "Kunde inte tilldela optiker: Saknar anamnes-ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsAssigningOptician(true);
      
      // Use the utility function directly
      await assignOpticianToEntry(supabase, entryId, opticianId);
      
      // Refresh data after successful assignment
      await refetch();
      
      toast({
        title: "Optiker tilldelad",
        description: opticianId 
          ? "Anamnes har tilldelats till optiker" 
          : "Optikertilldelning har tagits bort",
      });
      
    } catch (error) {
      console.error("Error assigning optician:", error);
      toast({
        title: "Fel vid tilldelning av optiker",
        description: error instanceof Error 
          ? error.message
          : "Det gick inte att tilldela optiker till anamnesen",
        variant: "destructive",
      });
    } finally {
      setIsAssigningOptician(false);
    }
  }, [refetch, supabase]);

  // Handle store assignment - with better error handling
  const handleStoreAssigned = useCallback(async (entryId: string, storeId: string | null): Promise<void> => {
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
      setIsAssigningStore(true);
      
      // Use the utility function directly
      await assignStoreToEntry(supabase, entryId, storeId);
      
      // Important: Always refetch both entries and stores after store assignment
      await Promise.all([refetch(), refetchStores()]);
      
      // Display success toast
      toast({
        title: "Butik tilldelad",
        description: storeId 
          ? "Anamnes har kopplats till butik" 
          : "Butikskoppling har tagits bort",
      });
      
    } catch (error) {
      console.error("Error in handleStoreAssigned:", error);
      toast({
        title: "Fel vid tilldelning av butik",
        description: "Det gick inte att tilldela butiken. Försök igen senare.",
        variant: "destructive",
      });
    } finally {
      setIsAssigningStore(false);
    }
  }, [refetch, refetchStores, supabase]);

  // Handler for driving license examination
  const handleDrivingLicenseExamination = (entry: AnamnesesEntry) => {
    setDrivingLicenseEntry(entry);
    setIsDrivingLicenseOpen(true);
  };
  
  // Handle auto-opening driving license examination from navigation
  useEffect(() => {
    if (autoOpenDrivingLicenseExam && entries.length > 0) {
      // Find the entry with the matching ID
      const targetEntry = entries.find(entry => entry.id === autoOpenDrivingLicenseExam);
      
      if (targetEntry) {
        handleDrivingLicenseExamination(targetEntry);
        
        // Notify parent that the examination has been opened
        if (onDrivingLicenseExamOpened) {
          onDrivingLicenseExamOpened();
        }
      }
    }
  }, [autoOpenDrivingLicenseExam, entries, onDrivingLicenseExamOpened]);

  // Helper function to get expiration info
  function getEntryExpirationInfo(entry: AnamnesesEntry) {
    if (!entry.auto_deletion_timestamp) return { isExpired: false, daysUntilExpiration: null };
    
    // Only show deletion messages for entries that will actually be auto-deleted
    const deletionEligibleStatuses = ['journaled', 'ready', 'reviewed'];
    if (!deletionEligibleStatuses.includes(entry.status)) {
      return { isExpired: false, daysUntilExpiration: null };
    }
    
    // For bookings, only show deletion message if booking date has passed
    if (entry.booking_date) {
      const now = new Date();
      const bookingDate = new Date(entry.booking_date);
      if (bookingDate > now) {
        return { isExpired: false, daysUntilExpiration: null };
      }
    }
    
    const now = new Date();
    const expirationDate = new Date(entry.auto_deletion_timestamp);
    const isExpired = expirationDate < now;
    
    if (isExpired) return { isExpired: true, daysUntilExpiration: null };
    
    const diffTime = Math.abs(expirationDate.getTime() - now.getTime());
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { isExpired, daysUntilExpiration };
  }
  
  // Get the store map for lookup
  const storeMap = getStoreMap();
  
  // Apply additional filtering based on searchInAllStores flag
  const finalFilteredEntries = searchInAllStores 
    ? entries.filter(entry => {
        // When searching in all stores, apply all filters except store filter
        // Search filter
        if (filters.searchQuery) {
          const searchLower = filters.searchQuery.toLowerCase();
          const matchesPatientIdentifier = entry.patient_identifier?.toLowerCase().includes(searchLower);
          const matchesFirstName = entry.first_name?.toLowerCase().includes(searchLower);
          const matchesBookingId = entry.booking_id?.toLowerCase().includes(searchLower);
          const matchesCreatedByName = entry.created_by_name?.toLowerCase().includes(searchLower);
          
          if (!matchesPatientIdentifier && !matchesFirstName && !matchesBookingId && !matchesCreatedByName) {
            return false;
          }
        }
        
        // Status filter
        if (filters.statusFilter && entry.status !== filters.statusFilter) {
          return false;
        }
        
        // Examination type filter
        if (filters.examinationTypeFilter) {
          const entryType = entry.examination_type?.toLowerCase();
          const filterType = filters.examinationTypeFilter.toLowerCase();
          if (entryType !== filterType) {
            return false;
          }
        }
        
        return true;
      })
    : filteredEntries;
  
  // Enhance entries with store information
  const enhancedEntries = finalFilteredEntries.map(entry => {
    // Get store name using our reliable getStoreName function
    const storeName = entry.store_id ? getStoreName(entry.store_id) : null;
    
    // Check if this is a booking without a store assigned
    const isBookingWithoutStore = (entry.is_magic_link || entry.booking_id || entry.booking_date) && !entry.store_id;
    
    return {
      ...entry,
      ...getEntryExpirationInfo(entry),
      storeName,
      isBookingWithoutStore
    };
  });

  // Separate today's bookings from other entries
  const now = new Date();
  const todayBookings = enhancedEntries.filter(entry => {
    if (!entry.booking_date) return false;
    const bookingDate = new Date(entry.booking_date);
    return bookingDate.getDate() === now.getDate() &&
           bookingDate.getMonth() === now.getMonth() &&
           bookingDate.getFullYear() === now.getFullYear();
  });

  const otherEntries = enhancedEntries.filter(entry => {
    if (!entry.booking_date) return true;
    const bookingDate = new Date(entry.booking_date);
    return !(bookingDate.getDate() === now.getDate() &&
             bookingDate.getMonth() === now.getMonth() &&
             bookingDate.getFullYear() === now.getFullYear());
  });

  // Force refresh when we first view the component
  useEffect(() => {
    handleManualRefresh();
  }, [handleManualRefresh]);

  if ((isLoading && !entries.length)) {
    return <LoadingState />;
  }

  if (error && !isFetching) {
    return <ErrorState errorMessage={error.message} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      {/* No Store Selected Alert */}
      {!activeStore && hasMultipleStores && <NoStoreSelectedAlert />}

      {/* Compact Search and Filter Section - Sticky */}
      <CompactSearchAndFilter
        searchQuery={filters.searchQuery}
        onSearchChange={(value) => updateFilter("searchQuery", value)}
        examinationTypeFilter={filters.examinationTypeFilter}
        onExaminationTypeChange={(value) => updateFilter("examinationTypeFilter", value)}
        onRefresh={handleManualRefresh}
        isRefreshing={isFetching || isLoadingStores}
        searchInAllStores={searchInAllStores}
        onSearchInAllStoresChange={setSearchInAllStores}
        hasSearchResults={filteredEntries.length > 0}
      >
        <DirectFormButton />
      </CompactSearchAndFilter>
      {/* Tabs for Active Store vs Without Store */}
      <Tabs defaultValue="active" className="w-full">
        {withoutStoreCount > 0 && (
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="active">
              {activeStore ? activeStore.name : "Aktuella undersökningar"}
            </TabsTrigger>
            <TabsTrigger value="without-store">
              Utan butik
              <Badge variant="secondary" className="ml-2">
                {withoutStoreCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="active" className="space-y-6">
          <div data-tour="stats-cards">
            <EntriesSummary
              filteredCount={enhancedEntries.length}
              totalCount={entries.length}
              statusFilter={filters.statusFilter}
              isFetching={isFetching || isLoadingStores}
              lastUpdated={dataLastUpdated}
              todayBookingsCount={todayBookings.length}
            />
          </div>
          
          {/* Today's Bookings Section */}
          {todayBookings.length > 0 && filters.timeFilter !== "today_bookings" && (
            <TodayBookingsSection
              todayBookings={todayBookings}
              onSelectEntry={setSelectedEntry}
              onEntryDeleted={refetch}
              onEntryAssigned={handleEntryAssigned}
              onStoreAssigned={handleStoreAssigned}
              onDrivingLicenseExamination={handleDrivingLicenseExamination}
            />
          )}
          
          {/* Other Entries */}
          {(filters.timeFilter !== "today_bookings" ? otherEntries : enhancedEntries).length > 0 && (
            <div data-tour="entries-list">
              {todayBookings.length > 0 && filters.timeFilter !== "today_bookings" && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px bg-muted flex-1"></div>
                  <span className="text-sm text-muted-foreground px-3">Övriga anamnesdformulär</span>
                  <div className="h-px bg-muted flex-1"></div>
                </div>
              )}
              
              <EntriesList
                entries={filters.timeFilter === "today_bookings" ? enhancedEntries : otherEntries}
                onSelectEntry={setSelectedEntry}
                onEntryDeleted={refetch}
                onEntryAssigned={handleEntryAssigned}
                onStoreAssigned={handleStoreAssigned}
                onDrivingLicenseExamination={handleDrivingLicenseExamination}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="without-store" className="space-y-6">
          <EntriesSummary
            filteredCount={entriesWithoutStore.length}
            totalCount={entriesWithoutStore.length}
            statusFilter="all"
            isFetching={isFetching}
            lastUpdated={dataLastUpdated}
            todayBookingsCount={0}
          />
          
          {entriesWithoutStore.length > 0 ? (
            <EntriesList
              entries={entriesWithoutStore.map(entry => ({
                ...entry,
                ...getEntryExpirationInfo(entry),
                storeName: null,
                isBookingWithoutStore: false
              }))}
              onSelectEntry={setSelectedEntry}
              onEntryDeleted={refetch}
              onEntryAssigned={handleEntryAssigned}
              onStoreAssigned={handleStoreAssigned}
              onDrivingLicenseExamination={handleDrivingLicenseExamination}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Inga undersökningar utan butikstillhörighet.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {selectedEntry && (
        <AnamnesisDetailModal
          entry={selectedEntry}
          isOpen={!!selectedEntry}
          onOpenChange={(open) => {
            if (!open) setSelectedEntry(null);
          }}
          onEntryUpdated={() => {
            // Ensure we refresh both stores and entries when entry is updated
            refetch();
            refetchStores();
            setSelectedEntry(null);
          }}
        />
      )}
      
      {/* Driving License Examination Dialog */}
      {drivingLicenseEntry && (
        <Dialog open={isDrivingLicenseOpen} onOpenChange={setIsDrivingLicenseOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DrivingLicenseExamination
              entry={drivingLicenseEntry}
              onClose={() => {
                setIsDrivingLicenseOpen(false);
                setDrivingLicenseEntry(null);
                refetch(); // Refresh the entries list
              }}
              onUpdate={() => {
                refetch(); // Refresh when examination is updated
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
