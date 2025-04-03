
/**
 * This component provides a dropdown filter for anamnesis entries by time period.
 * It allows users to filter entries from today, the last week, or the last month.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeFilterProps {
  timeFilter: string | null;
  onTimeFilterChange: (value: string | null) => void;
}

export function TimeFilter({ timeFilter, onTimeFilterChange }: TimeFilterProps) {
  return (
    <Select
      value={timeFilter || "all"}
      onValueChange={(value) => onTimeFilterChange(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-[130px]" aria-label="Filtrera efter tidsperiod">
        <SelectValue placeholder="Tidsperiod" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alla tidsperioder</SelectItem>
        <SelectItem value="today">Idag</SelectItem>
        <SelectItem value="week">Senaste veckan</SelectItem>
        <SelectItem value="month">Senaste månaden</SelectItem>
      </SelectContent>
    </Select>
  );
}
