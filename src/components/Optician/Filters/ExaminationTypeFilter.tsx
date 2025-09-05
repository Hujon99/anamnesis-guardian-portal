/**
 * Examination Type filter component using consistent Button + Popover design.
 * Allows filtering of entries based on examination type (Synundersökning, Körkortsundersökning, etc.).
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Eye, Car, FileText, Stethoscope, ChevronDown, CheckCircle, Contact } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganizationForms } from "@/hooks/useOrganizationForms";
import { EXAMINATION_TYPE_OPTIONS } from "@/types/examinationType";

interface ExaminationTypeFilterProps {
  examinationTypeFilter: string | null;
  onExaminationTypeFilterChange: (value: string | null) => void;
}

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'Eye': return Eye;
    case 'Car': return Car; 
    case 'Contact': return Contact;
    case 'FileText': return FileText;
    case 'Stethoscope': return Stethoscope;
    default: return FileText;
  }
};

export function ExaminationTypeFilter({ examinationTypeFilter, onExaminationTypeFilterChange }: ExaminationTypeFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: organizationForms = [], isLoading } = useOrganizationForms();
  
  const examinationTypeOptions = useMemo(() => {
    // Always include "Alla typer" as first option
    const allOption = { value: "all", label: "Alla typer", icon: FileText };
    
    // Get unique examination types from forms
    const uniqueTypes = Array.from(new Set(organizationForms.map(form => form.examination_type)));
    
    // Create options from examination types, using EXAMINATION_TYPE_OPTIONS for labels
    const typeOptions = uniqueTypes.map(type => {
      const typeOption = EXAMINATION_TYPE_OPTIONS.find(opt => 
        opt.type.toLowerCase() === type.toLowerCase()
      );
      
      return {
        value: type,
        label: typeOption?.label || type, // fallback to type if no match
        icon: getIconComponent(typeOption?.icon || 'FileText')
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
    
    return [allOption, ...typeOptions];
  }, [organizationForms]);
  
  const selectedOption = examinationTypeOptions.find(option => option.value === (examinationTypeFilter || "all"));
  const isFiltered = examinationTypeFilter && examinationTypeFilter !== "all";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 justify-between min-w-[140px] bg-white border-muted transition-all",
            isFiltered && "border-accent_teal bg-accent_teal/5 text-accent_teal"
          )}
        >
          <div className="flex items-center gap-2">
            {selectedOption?.icon && <selectedOption.icon className="h-4 w-4" />}
            <span className="text-sm font-medium">{selectedOption?.label}</span>
            {isFiltered && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-accent_teal/10 text-accent_teal border-0">
                1
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-white" align="start">
        <div className="space-y-1">
          {examinationTypeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = (examinationTypeFilter || "all") === option.value;
            
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
                  onExaminationTypeFilterChange(option.value === "all" ? null : option.value);
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