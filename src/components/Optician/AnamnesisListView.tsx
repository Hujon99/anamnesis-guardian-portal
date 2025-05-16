/**
 * This component provides a unified list view of all anamnesis entries
 * with filtering, searching, and sorting capabilities. It implements
 * Supabase's realtime functionality for live updates to entries.
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
import { useAnamnesisList } from "@/hooks/useAnamnesisList";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useStores } from "@/hooks/useStores";
import { useOrganization } from "@clerk/clerk-react";
import { AdvancedFilters } from "./AdvancedFilters";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { useEntryMutations } from "@/hooks/useEntryMutations"; 
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

  // Handle optician assignment - Using useCallback to create stable function reference
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
      console.log(`AnamnesisListView: Assigning optician ${opticianId || 'null'} to entry ${entryId}`);
      
      // Create an instance of mutations for this specific entry
      const mutations = useEntryMutations(entryId);
      await mutations.assignOptician(opticianId);
      
      // Refresh data after successful assignment
      await refetch();
      
    } catch (error) {
      console.error("Error assigning optician:", error);
      // Error toast is already handled by the mutations hook
    }
  }, [refetch]);

  // Handle store assignment - Now with better error handling
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
      console.log(`AnamnesisListView: Creating new mutations instance for entry ${entryId} to assign store ${storeId || 'null'}`);
      
      // Correctly create the mutations instance for this specific call
      const entryMutations = useEntryMutations(entryId);
      
      // Use the robust assignStore method from the hook
      await entryMutations.assignStore(storeId);
      
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
    }
  }, [refetch, refetchStores]);

  // Helper function to get expiration info
  function getEntryExpirationInfo(entry: AnamnesesEntry) {
    if (!entry.auto_deletion_timestamp) return { isExpired: false, daysUntilExpiration: null };
    
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
    
    // Log store name resolution for debugging
    console.log(`AnamnesisListView: Entry ${entry.id} has store_id ${entry.store_id}, mapped to name: ${storeName}`);
    
    // Check if this is a booking without a store assigned
    const isBookingWithoutStore = (entry.is_magic_link || entry.booking_id || entry.booking_date) && !entry.store_id;
    
    return {
      ...entry,
      ...getEntryExpirationInfo(entry),
      storeName,
      isBookingWithoutStore
    };
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
      <Card className="mb-6 p-4 bg-surface_light rounded-2xl shadow-sm">
        <div className={`${isMobile ? 'space-y-4' : 'md:flex md:items-center md:gap-4'}`}>
          <div className={`${isMobile ? 'w-full' : 'flex-1 max-w-md'}`}>
            <SearchInput
              searchQuery={filters.searchQuery}
              onSearchChange={(value) => updateFilter("searchQuery", value)}
              onRefresh={handleManualRefresh}
              isRefreshing={isFetching || isLoadingStores}
            />
          </div>
          
          <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
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
          </div>
        </div>
        
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <AdvancedFilters 
              storeFilter={storeFilter}
              onStoreFilterChange={setStoreFilter}
              opticianFilter={opticianFilter}
              onOpticianFilterChange={setOpticianFilter}
              assignmentFilter={assignmentFilter}
              onAssignmentFilterChange={setAssignmentFilter}
            />
          </div>
        )}
      </Card>
      
      <div>
        <EntriesSummary
          filteredCount={enhancedEntries.length}
          totalCount={entries.length}
          statusFilter={filters.statusFilter}
          isFetching={isFetching || isLoadingStores}
          lastUpdated={dataLastUpdated}
        />
        
        <EntriesList
          entries={enhancedEntries}
          onSelectEntry={setSelectedEntry}
          onEntryDeleted={refetch}
          onEntryAssigned={handleEntryAssigned}
          onStoreAssigned={handleStoreAssigned}
        />
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
