
/**
 * This component provides a unified list view of all anamnesis entries
 * with filtering, searching, and sorting capabilities. It implements
 * Supabase's realtime functionality for live updates to entries.
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
import { useAnamnesisList } from "@/hooks/useAnamnesisList";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";

export function AnamnesisListView() {
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
  const isMobile = useIsMobile();

  // Manual refresh handler with debug console log
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered in AnamnesisListView");
    refetch();
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
      </Card>
      
      <div>
        <EntriesSummary
          filteredCount={filteredEntries.length}
          totalCount={entries.length}
          statusFilter={filters.statusFilter}
          isFetching={isFetching}
          lastUpdated={dataLastUpdated}
        />
        
        <EntriesList
          entries={filteredEntries.map(entry => ({
            ...entry,
            ...getEntryExpirationInfo(entry)
          }))}
          onSelectEntry={setSelectedEntry}
          onEntryDeleted={refetch}
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
