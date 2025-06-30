
/**
 * Unified time filter component using consistent Button + Popover design.
 * Provides intuitive time period selection with clear visual feedback.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronDown, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedTimeFilterProps {
  timeFilter: string | null;
  onTimeFilterChange: (value: string | null) => void;
}

const timeOptions = [
  { value: "all", label: "Alla tidsperioder", icon: Calendar },
  { value: "today", label: "Idag", icon: Clock },
  { value: "week", label: "Senaste veckan", icon: Calendar },
  { value: "month", label: "Senaste månaden", icon: Calendar },
];

export function UnifiedTimeFilter({ timeFilter, onTimeFilterChange }: UnifiedTimeFilterProps) {
  const [open, setOpen] = useState(false);
  
  const selectedOption = timeOptions.find(option => option.value === (timeFilter || "all"));
  const isFiltered = timeFilter && timeFilter !== "all";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 justify-between min-w-[140px] bg-white border-muted transition-all",
            isFiltered && "border-primary bg-primary/5 text-primary"
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">{selectedOption?.label}</span>
            {isFiltered && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary/10 text-primary border-0">
                1
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-white" align="start">
        <div className="space-y-1">
          {timeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = (timeFilter || "all") === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => {
                  onTimeFilterChange(option.value === "all" ? null : option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                  isSelected 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
                {isSelected && <CheckCircle className="h-4 w-4 ml-auto" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
