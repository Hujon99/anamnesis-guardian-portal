
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

  // Automatically fetch data when component mounts once
  useEffect(() => {
    // Small delay to ensure auth context is ready
    const timer = setTimeout(() => {
      refetch();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [refetch]);

  if ((isLoading && !entries.length)) {
    return <LoadingState />;
  }

  if (error && !isFetching) {
    return <ErrorState errorMessage={error.message} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 mb-6">
        <SearchInput
          searchQuery={filters.searchQuery}
          onSearchChange={(value) => updateFilter("searchQuery", value)}
          onRefresh={refetch}
          isRefreshing={isFetching}
        />
        
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
