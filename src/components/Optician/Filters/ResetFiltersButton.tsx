
/**
 * This component provides a button to reset all anamnesis filters to their default values.
 * It clears status, time period, and other filter settings.
 */

import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface ResetFiltersButtonProps {
  onResetFilters: () => void;
}

export function ResetFiltersButton({ onResetFilters }: ResetFiltersButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onResetFilters}
      className="ml-auto"
      aria-label="Rensa alla filter"
    >
      <Filter className="h-4 w-4 mr-2" />
      Rensa filter
    </Button>
  );
}
