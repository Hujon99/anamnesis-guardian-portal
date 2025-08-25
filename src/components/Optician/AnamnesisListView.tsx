/**
 * This component provides a unified list view of all anamnesis entries
 * with filtering, searching, and sorting capabilities. It implements
 * Supabase's realtime functionality for live updates to entries.
 * Redesigned with improved filter layout and visual hierarchy.
 */

import { useState, useEffect, useCallback } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { AnamnesisDetailModal } from "./AnamnesisDetailModal";
import { AnamnesisFilters } from "./AnamnesisFilters";
import { ErrorState } from "./EntriesList/ErrorState";
import { LoadingState } from "./EntriesList/LoadingState";
import { SearchInput } from "./EntriesList/SearchInput";
import { EntriesSummary } from "./EntriesList/EntriesSummary";
import { EntriesList } from "./EntriesList/EntriesList";
import { TodayBookingsSection } from "./TodayBookingsSection";
import { useAnamnesisList } from "@/hooks/useAnamnesisList";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useStores } from "@/hooks/useStores";
import { useOrganization } from "@clerk/clerk-react";
import { AdvancedFilters } from "./AdvancedFilters";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { assignOpticianToEntry, assignStoreToEntry } from "@/utils/entryMutationUtils"; 
import { toast } from "@/components/ui/use-toast";

interface AnamnesisListViewProps {
  showAdvancedFilters?: boolean;
}

export function AnamnesisListView({ showAdvancedFilters = false }: AnamnesisListViewProps) {
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
  
  // State for selected entry and advanced filters
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [opticianFilter, setOpticianFilter] = useState<string | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [isAssigningStore, setIsAssigningStore] = useState(false);
  const [isAssigningOptician, setIsAssigningOptician] = useState(false);
  
  const isMobile = useIsMobile();
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();
  const { syncUsersWithToast } = useSyncClerkUsers();
  
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
      console.log("AnamnesisListView: Initial prefetch of stores");
      await refetchStores();
    };
    
    prefetchStores();
    
    // Also sync Clerk users with Supabase on component mount
    syncUsersWithToast();
  }, [refetchStores, syncUsersWithToast]);

  // Manual refresh handler that refetches both entries and stores
  const handleManualRefresh = useCallback(() => {
    console.log("Manual refresh triggered in AnamnesisListView");
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
      console.log(`AnamnesisListView: Assigning optician ${opticianId || 'null'} to entry ${entryId}`);
      
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
      console.log(`AnamnesisListView: Assigning store ${storeId || 'null'} to entry ${entryId}`);
      
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
  
  // Apply additional filters (store, optician, assignment)
  const advancedFilteredEntries = filteredEntries.filter(entry => {
    // Filter by store
    if (storeFilter && entry.store_id !== storeFilter) {
      return false;
    }
    
    // Filter by optician
    if (opticianFilter && entry.optician_id !== opticianFilter) {
      return false;
    }
    
    // Filter by assignment status
    if (assignmentFilter === 'assigned' && !entry.optician_id) {
      return false;
    }
    
    if (assignmentFilter === 'unassigned' && entry.optician_id) {
      return false;
    }
    
    return true;
  });
  
  // Get the store map for lookup
  const storeMap = getStoreMap();
  
  // Enhance entries with store information
  const enhancedEntries = advancedFilteredEntries.map(entry => {
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
      {/* Search Section */}
      <Card className="p-6 bg-white rounded-2xl shadow-sm border border-muted/30">
        <SearchInput
          searchQuery={filters.searchQuery}
          onSearchChange={(value) => updateFilter("searchQuery", value)}
          onRefresh={handleManualRefresh}
          isRefreshing={isFetching || isLoadingStores}
        />
      </Card>

      {/* Filters Section */}
      <AnamnesisFilters
        statusFilter={filters.statusFilter}
        onStatusFilterChange={(value) => updateFilter("statusFilter", value)}
        timeFilter={filters.timeFilter}
        onTimeFilterChange={(value) => updateFilter("timeFilter", value)}
        showOnlyUnanswered={filters.showOnlyUnanswered}
        onUnansweredFilterChange={(value) => updateFilter("showOnlyUnanswered", value)}
        sortDescending={filters.sortDescending}
        onSortDirectionChange={(value) => updateFilter("sortDescending", value)}
        showOnlyBookings={filters.showOnlyBookings}
        onBookingFilterChange={(value) => updateFilter("showOnlyBookings", value)}
        onResetFilters={resetFilters}
      />
      
      {/* Advanced Filters Section */}
      {showAdvancedFilters && (
        <AdvancedFilters 
          storeFilter={storeFilter}
          onStoreFilterChange={setStoreFilter}
          opticianFilter={opticianFilter}
          onOpticianFilterChange={setOpticianFilter}
          assignmentFilter={assignmentFilter}
          onAssignmentFilterChange={setAssignmentFilter}
        />
      )}
      
      {/* Results Section */}
      <div className="space-y-6">
        <EntriesSummary
          filteredCount={enhancedEntries.length}
          totalCount={entries.length}
          statusFilter={filters.statusFilter}
          isFetching={isFetching || isLoadingStores}
          lastUpdated={dataLastUpdated}
          todayBookingsCount={todayBookings.length}
        />
        
        {/* Today's Bookings Section */}
        {todayBookings.length > 0 && filters.timeFilter !== "today_bookings" && (
          <TodayBookingsSection
            todayBookings={todayBookings}
            onSelectEntry={setSelectedEntry}
            onEntryDeleted={refetch}
            onEntryAssigned={handleEntryAssigned}
            onStoreAssigned={handleStoreAssigned}
          />
        )}
        
        {/* Other Entries */}
        {(filters.timeFilter !== "today_bookings" ? otherEntries : enhancedEntries).length > 0 && (
          <div>
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
            />
          </div>
        )}
      </div>
      
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
    </div>
  );
}
