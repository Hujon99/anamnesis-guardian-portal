
/**
 * This component provides a dropdown filter for anamnesis entry status.
 * It allows users to filter entries by their current status (sent, pending, etc).
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StatusFilterProps {
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
}

export function StatusFilter({ statusFilter, onStatusFilterChange }: StatusFilterProps) {
  return (
    <Select
      value={statusFilter || "all"}
      onValueChange={(value) => onStatusFilterChange(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-[130px]" aria-label="Filtrera efter status">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alla statusar</SelectItem>
        <SelectItem value="sent">Skickade</SelectItem>
        <SelectItem value="pending">Att granska</SelectItem>
        <SelectItem value="ready">Klara</SelectItem>
        <SelectItem value="reviewed">Granskade</SelectItem>
      </SelectContent>
    </Select>
  );
}
