
/**
 * This component provides a toggle switch to filter anamnesis entries 
 * to show only those that have not been answered by patients.
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface UnansweredFilterProps {
  showOnlyUnanswered: boolean;
  onUnansweredFilterChange: (value: boolean) => void;
}

export function UnansweredFilter({ 
  showOnlyUnanswered, 
  onUnansweredFilterChange 
}: UnansweredFilterProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="unanswered-mode"
        checked={showOnlyUnanswered}
        onCheckedChange={onUnansweredFilterChange}
        aria-label="Visa endast obesvarade"
      />
      <Label htmlFor="unanswered-mode">Endast obesvarade</Label>
    </div>
  );
}
