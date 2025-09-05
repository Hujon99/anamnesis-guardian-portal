/**
 * ID Verification filter component using consistent Button + Popover design.
 * Allows filtering of entries based on ID verification status for driving license examinations.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { IdCard, CheckCircle, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface IDVerificationFilterProps {
  idVerificationFilter: string | null;
  onIDVerificationFilterChange: (value: string | null) => void;
}

const idVerificationOptions = [
  { value: "all", label: "Alla ID-status", icon: IdCard },
  { value: "missing", label: "Saknar ID", icon: AlertTriangle },
  { value: "verified", label: "ID verifierat", icon: CheckCircle },
];

export function IDVerificationFilter({ idVerificationFilter, onIDVerificationFilterChange }: IDVerificationFilterProps) {
  const [open, setOpen] = useState(false);
  
  const selectedOption = idVerificationOptions.find(option => option.value === (idVerificationFilter || "all"));
  const isFiltered = idVerificationFilter && idVerificationFilter !== "all";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 justify-between min-w-[120px] bg-white border-muted transition-all",
            isFiltered && "border-accent_coral bg-accent_coral/5 text-accent_coral"
          )}
        >
          <div className="flex items-center gap-2">
            {selectedOption?.icon && <selectedOption.icon className="h-4 w-4" />}
            <span className="text-sm font-medium">{selectedOption?.label}</span>
            {isFiltered && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-accent_coral/10 text-accent_coral border-0">
                1
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 bg-white" align="start">
        <div className="space-y-1">
          {idVerificationOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = (idVerificationFilter || "all") === option.value;
            
            return (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start h-8 px-2 font-normal",
                  isSelected && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onIDVerificationFilterChange(option.value === "all" ? null : option.value);
                  setOpen(false);
                }}
              >
                <Icon className="h-4 w-4 mr-2" />
                <span>{option.label}</span>
                {isSelected && <CheckCircle className="h-4 w-4 ml-auto" />}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}