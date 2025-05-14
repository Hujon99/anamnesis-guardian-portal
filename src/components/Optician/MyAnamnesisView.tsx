/**
 * This component provides a personal view of anamnesis entries assigned to the current optician.
 * It displays personal statistics and a filtered list of entries.
 */

import { useState } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { AnamnesisDetailModal } from "./AnamnesisDetailModal";
import { AnamnesisFilters } from "./AnamnesisFilters";
import { ErrorState } from "./EntriesList/ErrorState";
import { LoadingState } from "./EntriesList/LoadingState";
import { SearchInput } from "./EntriesList/SearchInput";
import { EntriesSummary } from "./EntriesList/EntriesSummary";
import { EntriesList } from "./EntriesList/EntriesList";
import { useCurrentOpticianEntries } from "@/hooks/useCurrentOpticianEntries";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Store } from "@/types/anamnesis";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { OpticianStatsCards } from "./OpticianStatsCards";

export function MyAnamnesisView() {
  const {
    myFilteredEntries,
    myEntries,
    filters,
    updateFilter,
    resetFilters,
    isLoading,
    error,
    isFetching,
    refetch,
    dataLastUpdated,
    stats,
    isOpticianIdLoaded
  } = useCurrentOpticianEntries();
  
  // State for selected entry
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const isMobile = useIsMobile();
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();
  const { refreshClient } = useSupabaseClient();
  
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
  stores.forEach(store => {
    storeMap.set(store.id, store.name);
  });

  // Manual refresh handler
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered in MyAnamnesisView");
    refetch?.();
  };

  // Add handleRetry function for error state
  const handleRetry = async () => {
    await refreshClient(true);
    refetch?.();
  };

  // Handle entry assignment - Updated to return a Promise
  const handleEntryAssigned = async (entryId: string, opticianId: string | null): Promise<void> => {
    console.log(`Entry ${entryId} assigned to optician ${opticianId || 'none'}`);
    await refetch?.();
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
  
  // Enhance entries with store information
  const enhancedEntries = myFilteredEntries.map(entry => {
    // Get store name if available
    const storeName = entry.store_id ? storeMap.get(entry.store_id) || null : null;
    return {
      ...entry,
      ...getEntryExpirationInfo(entry),
      storeName
    };
  });

  if (!isOpticianIdLoaded) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-2">Du är inte registrerad som optiker</h2>
          <p className="text-muted-foreground">
            Kontakta systemadministratören om du anser att detta är fel.
          </p>
        </div>
      </div>
    );
  }

  if ((isLoading && !myEntries.length)) {
    return <LoadingState />;
  }

  if (error && !isFetching) {
    return <ErrorState errorMessage={error.message} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      <OpticianStatsCards stats={stats} />
      
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
      </Card>
      
      <div>
        <EntriesSummary
          filteredCount={enhancedEntries.length}
          totalCount={myEntries.length}
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
            refetch?.();
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}
