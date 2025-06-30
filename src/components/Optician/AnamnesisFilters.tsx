
/**
 * This component provides filter controls for the anamnesis list view,
 * allowing users to filter by status, time period, and other criteria.
 * Redesigned with unified components for better UX and visual consistency.
 */

import { UnifiedStatusFilter } from "./Filters/UnifiedStatusFilter";
import { UnifiedTimeFilter } from "./Filters/UnifiedTimeFilter";
import { UnifiedToggleFilter } from "./Filters/UnifiedToggleFilter";
import { SortDirectionToggle } from "./Filters/SortDirectionToggle";
import { BookingFilter } from "./Filters/BookingFilter";
import { FilterGroup } from "./Filters/FilterGroup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterX, MessageSquareX, TicketIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnamnesisFiltersProps {
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  timeFilter: string | null;
  onTimeFilterChange: (value: string | null) => void;
  showOnlyUnanswered: boolean;
  onUnansweredFilterChange: (value: boolean) => void;
  sortDescending: boolean;
  onSortDirectionChange: (value: boolean) => void;
  showOnlyBookings: boolean;
  onBookingFilterChange: (value: boolean) => void;
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
  showOnlyBookings,
  onBookingFilterChange,
  onResetFilters
}: AnamnesisFiltersProps) {
  // Count active filters
  const activeFiltersCount = [
    statusFilter && statusFilter !== "all",
    timeFilter && timeFilter !== "all", 
    showOnlyUnanswered,
    showOnlyBookings
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 p-6 bg-surface_light rounded-2xl border border-muted/30" aria-label="Filtrera anamneser">
      {/* Header with filter count and reset button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">Filter</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-6 px-2 text-xs bg-primary/10 text-primary">
              {activeFiltersCount} aktiv{activeFiltersCount !== 1 ? 'a' : ''}
            </Badge>
          )}
        </div>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <FilterX className="h-3.5 w-3.5 mr-1.5" />
            Rensa alla
          </Button>
        )}
      </div>

      {/* Main Filters */}
      <FilterGroup title="Grundfilter">
        <UnifiedStatusFilter 
          statusFilter={statusFilter} 
          onStatusFilterChange={onStatusFilterChange} 
        />
        
        <UnifiedTimeFilter 
          timeFilter={timeFilter} 
          onTimeFilterChange={onTimeFilterChange} 
        />
      </FilterGroup>

      {/* Toggle Filters */}
      <FilterGroup title="Alternativ">
        <UnifiedToggleFilter
          label="Endast obesvarade"
          icon={MessageSquareX}
          isActive={showOnlyUnanswered}
          onToggle={onUnansweredFilterChange}
        />
        
        <UnifiedToggleFilter
          label="Endast bokningar"
          icon={TicketIcon}
          isActive={showOnlyBookings}
          onToggle={onBookingFilterChange}
        />

        <SortDirectionToggle 
          sortDescending={sortDescending} 
          onSortDirectionChange={onSortDirectionChange} 
        />
      </FilterGroup>
    </div>
  );
}
