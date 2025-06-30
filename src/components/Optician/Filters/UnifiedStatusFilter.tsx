
/**
 * Unified status filter component using consistent Button + Popover design.
 * Provides a clean, professional look with clear visual feedback.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileCheck, BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedStatusFilterProps {
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
}

const statusOptions = [
  { value: "all", label: "Alla statusar", icon: null },
  { value: "sent", label: "Skickade", icon: Clock },
  { value: "pending", label: "Att granska", icon: FileCheck },
  { value: "ready", label: "Klara", icon: CheckCircle },
  { value: "journaled", label: "Journalförda", icon: BookOpen },
];

export function UnifiedStatusFilter({ statusFilter, onStatusFilterChange }: UnifiedStatusFilterProps) {
  const [open, setOpen] = useState(false);
  
  const selectedOption = statusOptions.find(option => option.value === (statusFilter || "all"));
  const isFiltered = statusFilter && statusFilter !== "all";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 justify-between min-w-[120px] bg-white border-muted transition-all",
            isFiltered && "border-primary bg-primary/5 text-primary"
          )}
        >
          <div className="flex items-center gap-2">
            {selectedOption?.icon && <selectedOption.icon className="h-4 w-4" />}
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
      <PopoverContent className="w-56 p-2 bg-white" align="start">
        <div className="space-y-1">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = (statusFilter || "all") === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => {
                  onStatusFilterChange(option.value === "all" ? null : option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                  isSelected 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "hover:bg-muted/50"
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : <div className="w-4" />}
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
