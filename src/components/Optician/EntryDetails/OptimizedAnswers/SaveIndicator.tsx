
/**
 * This component displays the save status indicator for the optimized answers view.
 */

import { CheckCheck } from "lucide-react";

interface SaveIndicatorProps {
  saveIndicator: "unsaved" | "saved" | null;
}

export const SaveIndicator = ({ saveIndicator }: SaveIndicatorProps) => {
  if (!saveIndicator) return null;

  return saveIndicator === "unsaved" ? (
    <span className="text-amber-500 text-xs">Osparade ändringar</span>
  ) : (
    <span className="text-green-500 text-xs flex items-center">
      <CheckCheck className="h-3 w-3 mr-1" />
      Sparad
    </span>
  );
};
