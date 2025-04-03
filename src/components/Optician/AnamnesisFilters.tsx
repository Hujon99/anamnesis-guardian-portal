
/**
 * This component provides filter controls for the anamnesis list view,
 * allowing users to filter by status, time period, and other criteria.
 * It orchestrates various smaller filter components to create a unified filtering experience.
 */

import { StatusFilter } from "./Filters/StatusFilter";
import { TimeFilter } from "./Filters/TimeFilter";
import { UnansweredFilter } from "./Filters/UnansweredFilter";
import { SortDirectionToggle } from "./Filters/SortDirectionToggle";
import { ResetFiltersButton } from "./Filters/ResetFiltersButton";

interface AnamnesisFiltersProps {
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  timeFilter: string | null;
  onTimeFilterChange: (value: string | null) => void;
  showOnlyUnanswered: boolean;
  onUnansweredFilterChange: (value: boolean) => void;
  sortDescending: boolean;
  onSortDirectionChange: (value: boolean) => void;
  onResetFilters: () => void;
}

export function AnamnesisFilters({
  statusFilter,
  onStatusFilterChange,
  timeFilter,
  onTimeFilterChange,
  showOnlyUnanswered,
  onUnansweredFilterChange,
  sortDescending,
  onSortDirectionChange,
  onResetFilters
}: AnamnesisFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center" aria-label="Filtrera anamneser">
      <StatusFilter 
        statusFilter={statusFilter} 
        onStatusFilterChange={onStatusFilterChange} 
      />
      
      <TimeFilter 
        timeFilter={timeFilter} 
        onTimeFilterChange={onTimeFilterChange} 
      />
      
      <UnansweredFilter 
        showOnlyUnanswered={showOnlyUnanswered} 
        onUnansweredFilterChange={onUnansweredFilterChange} 
      />
      
      <SortDirectionToggle 
        sortDescending={sortDescending} 
        onSortDirectionChange={onSortDirectionChange} 
      />
      
      <ResetFiltersButton onResetFilters={onResetFilters} />
    </div>
  );
}
