
/**
 * Unified toggle filter component for binary options like "only unanswered".
 * Uses consistent Button design with clear on/off states.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface UnifiedToggleFilterProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onToggle: (value: boolean) => void;
  activeLabel?: string;
}

export function UnifiedToggleFilter({ 
  label, 
  icon: Icon, 
  isActive, 
  onToggle,
  activeLabel = "På"
}: UnifiedToggleFilterProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onToggle(!isActive)}
      className={cn(
        "h-9 px-3 gap-2 bg-white border-muted transition-all",
        isActive && "border-accent_teal bg-accent_teal/10 text-accent_teal hover:bg-accent_teal/15"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
      {isActive && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-accent_teal/20 text-accent_teal border-0">
          {activeLabel}
        </Badge>
      )}
    </Button>
  );
}
