
/**
 * This component displays the auto-save status to the user,
 * showing when the form was last saved and the current saving state.
 */

import React from "react";
import { Loader2, Save, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface AutoSaveIndicatorProps {
  lastSaved: Date | null;
  isSaving: boolean;
  className?: string;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  lastSaved,
  isSaving,
  className = ""
}) => {
  const formattedTime = lastSaved
    ? formatDistanceToNow(lastSaved, { addSuffix: true, locale: sv })
    : null;

  return (
    <div className={`flex items-center text-xs ${className}`} aria-live="polite">
      {isSaving ? (
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="animate-spin h-3 w-3 mr-1" />
          <span>Sparar...</span>
        </div>
      ) : lastSaved ? (
        <div className="flex items-center text-muted-foreground">
          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
          <span>Sparat {formattedTime}</span>
        </div>
      ) : (
        <div className="flex items-center text-muted-foreground">
          <Save className="h-3 w-3 mr-1" />
          <span>Inte sparat än</span>
        </div>
      )}
    </div>
  );
};

export default AutoSaveIndicator;
