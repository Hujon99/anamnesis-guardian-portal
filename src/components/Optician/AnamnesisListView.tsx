
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

  if ((isLoading && !entries.length)) {
    return <LoadingState />;
  }

  if (error && !isFetching) {
    return <ErrorState errorMessage={error.message} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-4">
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row justify-between'} gap-4 mb-6`}>
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
            onResetFilters={resetFilters}
          />
        </div>
      </div>
      
      <div>
        <EntriesSummary
          filteredCount={filteredEntries.length}
          totalCount={entries.length}
          statusFilter={filters.statusFilter}
          isFetching={isFetching}
          lastUpdated={dataLastUpdated}
        />
        
        <EntriesList
          entries={filteredEntries}
          statusFilter={filters.statusFilter}
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
