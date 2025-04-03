
/**
 * This component provides a button to toggle the sort direction of anamnesis entries.
 * It switches between ascending and descending order based on the entry date.
 */

import { Button } from "@/components/ui/button";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";

interface SortDirectionToggleProps {
  sortDescending: boolean;
  onSortDirectionChange: (value: boolean) => void;
}

export function SortDirectionToggle({ 
  sortDescending, 
  onSortDirectionChange 
}: SortDirectionToggleProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => onSortDirectionChange(!sortDescending)}
      aria-label={sortDescending ? "Sortera stigande" : "Sortera fallande"}
      title={sortDescending ? "Sortera stigande" : "Sortera fallande"}
    >
      {sortDescending ? (
        <ArrowDownAZ className="h-4 w-4" />
      ) : (
        <ArrowUpAZ className="h-4 w-4" />
      )}
    </Button>
  );
}
