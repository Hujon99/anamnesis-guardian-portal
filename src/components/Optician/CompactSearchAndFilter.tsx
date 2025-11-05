/**
 * CompactSearchAndFilter component
 * 
 * This component provides a compact, modern search and filter interface for the dashboard.
 * It combines the search input with examination type filter buttons in a single, sticky component.
 * The examination type buttons are large, accessible, and provide clear visual feedback.
 * 
 * Features:
 * - Search by reference number or patient name
 * - Filter by examination type with large, accessible buttons
 * - Sticky positioning for always-visible access
 * - Refresh button for manual data updates
 * - Responsive design that works on all screen sizes
 */

import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganizationForms } from "@/hooks/useOrganizationForms";
import { EXAMINATION_TYPE_OPTIONS } from "@/types/examinationType";
import { useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactSearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  examinationTypeFilter: string | null;
  onExaminationTypeChange: (type: string | null) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: React.ReactNode; // For the create form button
}

export const CompactSearchAndFilter = ({ 
  searchQuery, 
  onSearchChange,
  examinationTypeFilter,
  onExaminationTypeChange,
  onRefresh,
  isRefreshing,
  children
}: CompactSearchAndFilterProps) => {
  const { data: forms } = useOrganizationForms();

  // Build examination type options from available forms
  const examinationTypeOptions = useMemo(() => {
    const options = [
      {
        type: null,
        label: 'Alla typer',
        description: 'Visa alla undersökningar',
        icon: 'ListFilter'
      }
    ];

    // Add options based on available forms
    forms?.forEach((form) => {
      const predefinedOption = EXAMINATION_TYPE_OPTIONS.find(
        opt => opt.type === form.examination_type
      );
      
      if (predefinedOption && !options.some(opt => opt.type === form.examination_type)) {
        options.push(predefinedOption);
      } else if (!predefinedOption) {
        options.push({
          type: form.examination_type,
          label: form.examination_type || 'Allmän',
          description: form.title,
          icon: 'FileText'
        });
      }
    });

    return options;
  }, [forms]);

  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LucideIcons.FileText;
  };

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-6 border-b border-border/40">
      <div className="space-y-4">
        {/* Search and refresh row */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
              <Search className="h-4 w-4" />
              <Hash className="h-3 w-3" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Sök efter referensnummer eller patient..."
              className="pl-12 rounded-xl bg-card border-border/60"
            />
          </div>
          
          {onRefresh && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onRefresh} 
              disabled={isRefreshing}
              title="Uppdatera listan"
              className="rounded-xl"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}

          {children}
        </div>

        {/* Examination type filter buttons */}
        <div className="flex flex-wrap gap-2">
          {examinationTypeOptions.map((option) => {
            const Icon = getIconComponent(option.icon);
            const isActive = examinationTypeFilter === option.type;
            
            return (
              <Button
                key={option.type || 'all'}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onExaminationTypeChange(option.type)}
                className={cn(
                  "rounded-xl transition-all",
                  isActive 
                    ? "shadow-md" 
                    : "hover:shadow-sm hover:border-primary/40"
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
