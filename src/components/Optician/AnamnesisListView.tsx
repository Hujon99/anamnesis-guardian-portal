/**
 * This component provides a unified list view of all anamnesis entries
 * with filtering, searching, and sorting capabilities. It implements
 * Supabase's realtime functionality for live updates to entries.
 */

import { useState, useEffect } from "react";
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
import { Store } from "@/types/anamnesis";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { AdvancedFilters } from "./AdvancedFilters";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";

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
  
  // Fetch stores for enhancing display
  const { data: stores = [] } = useQuery({
    queryKey: ["stores", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', organization.id);
        
      if (error) throw error;
      return data as Store[];
    },
    enabled: !!organization?.id
  });
  
  // Create a map of store IDs to store names for quick lookup
  const storeMap = new Map<string, string>();
  
  useEffect(() => {
    // Build store map when stores data changes
    stores.forEach(store => {
      storeMap.set(store.id, store.name);
    });
    
    // Sync Clerk users with Supabase on component mount
    syncUsersWithToast();
  }, [stores, syncUsersWithToast]);

  // Manual refresh handler with debug console log
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered in AnamnesisListView");
    refetch();
  };

  // Handle optician assignment - Updated to return a Promise
  const handleEntryAssigned = async (entryId: string, opticianId: string | null): Promise<void> => {
    console.log(`Entry ${entryId} assigned to optician ${opticianId || 'none'}`);
    await refetch();
  };

  const getEntryExpirationInfo = (entry: AnamnesesEntry) => {
    if (!entry.auto_deletion_timestamp) return { isExpired: false, daysUntilExpiration: null };
    
    const now = new Date();
    const expirationDate = new Date(entry.auto_deletion_timestamp);
    const isExpired = expirationDate < now;
    
    if (isExpired) return { isExpired: true, daysUntilExpiration: null };
    
    const diffTime = Math.abs(expirationDate.getTime() - now.getTime());
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { isExpired, daysUntilExpiration };
  };
  
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
  
  // Enhance entries with store information
  const enhancedEntries = advancedFilteredEntries.map(entry => {
    // Get store name if available
    const storeName = entry.store_id ? storeMap.get(entry.store_id) || null : null;
    
    // Check if this is a booking without a store assigned
    const isBookingWithoutStore = (entry.is_magic_link || entry.booking_id || entry.booking_date) && !entry.store_id;
    
    return {
      ...entry,
      ...getEntryExpirationInfo(entry),
      storeName,
      isBookingWithoutStore
    };
  });

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
              isRefreshing={isFetching}
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
          isFetching={isFetching}
          lastUpdated={dataLastUpdated}
        />
        
        <EntriesList
          entries={enhancedEntries}
          onSelectEntry={setSelectedEntry}
          onEntryDeleted={refetch}
          onEntryAssigned={handleEntryAssigned}
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
            refetch();
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}
