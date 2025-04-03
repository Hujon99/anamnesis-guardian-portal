
/**
 * This component provides filter controls for the anamnesis list view,
 * allowing users to filter by status, time period, and other criteria.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowDownAZ, ArrowUpAZ, Filter } from "lucide-react";

interface AnamnesisFiltersProps {
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  timeFilter: string | null;
  onTimeFilterChange: (value: string | null) => void;
  showOnlyUnanswered: boolean;
  onUnansweredFilterChange: (value: boolean) => void;
  sortDescending: boolean;
  onSortDirectionChange: (value: boolean) => void;
}

export function AnamnesisFilters({
  statusFilter,
  onStatusFilterChange,
  timeFilter,
  onTimeFilterChange,
  showOnlyUnanswered,
  onUnansweredFilterChange,
  sortDescending,
  onSortDirectionChange
}: AnamnesisFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center" aria-label="Filtrera anamneser">
      <Select
        value={statusFilter || "all"}
        onValueChange={(value) => onStatusFilterChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla statusar</SelectItem>
          <SelectItem value="sent">Skickade</SelectItem>
          <SelectItem value="pending">Att granska</SelectItem>
          <SelectItem value="ready">Klara</SelectItem>
        </SelectContent>
      </Select>
      
      <Select
        value={timeFilter || "all"}
        onValueChange={(value) => onTimeFilterChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Tidsperiod" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla tidsperioder</SelectItem>
          <SelectItem value="today">Idag</SelectItem>
          <SelectItem value="week">Senaste veckan</SelectItem>
          <SelectItem value="month">Senaste månaden</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="unanswered-mode"
          checked={showOnlyUnanswered}
          onCheckedChange={onUnansweredFilterChange}
        />
        <Label htmlFor="unanswered-mode">Endast obesvarade</Label>
      </div>
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onSortDirectionChange(!sortDescending)}
        aria-label={sortDescending ? "Sortera stigande" : "Sortera fallande"}
        title={sortDescending ? "Sortera stigande" : "Sortera fallande"}
      >
        {sortDescending ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onStatusFilterChange(null);
          onTimeFilterChange(null);
          onUnansweredFilterChange(false);
        }}
        className="ml-auto"
      >
        <Filter className="h-4 w-4 mr-2" />
        Rensa filter
      </Button>
    </div>
  );
}
