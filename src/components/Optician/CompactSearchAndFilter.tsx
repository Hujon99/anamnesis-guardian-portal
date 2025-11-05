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
import { Search, RefreshCw, Hash, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormsByStore } from "@/hooks/useFormsByStore";
import { useActiveStore } from "@/contexts/ActiveStoreContext";
import { EXAMINATION_TYPE_OPTIONS } from "@/types/examinationType";
import { useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompactSearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  examinationTypeFilter: string | null;
  onExaminationTypeChange: (type: string | null) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: React.ReactNode; // For the create form button
  searchInAllStores?: boolean;
  onSearchInAllStoresChange?: (value: boolean) => void;
  hasSearchResults?: boolean;
}

export const CompactSearchAndFilter = ({ 
  searchQuery, 
  onSearchChange,
  examinationTypeFilter,
  onExaminationTypeChange,
  onRefresh,
  isRefreshing,
  children,
  searchInAllStores,
  onSearchInAllStoresChange,
  hasSearchResults
}: CompactSearchAndFilterProps) => {
  const { activeStore } = useActiveStore();
  const { data: forms, isLoading: isLoadingForms } = useFormsByStore(activeStore?.id);

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
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-6 px-1 border-b border-border/40">
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
              className="rounded-xl shrink-0"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}

          {children}
        </div>

        {/* Expandable search to all stores alert */}
        {searchQuery && !hasSearchResults && !searchInAllStores && onSearchInAllStoresChange && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <Store className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm text-amber-800 dark:text-amber-200">
                Inga resultat i nuvarande butik. Vill du söka i alla butiker?
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSearchInAllStoresChange(true)}
                className="ml-2 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20"
              >
                Sök i alla butiker
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Active global search indicator */}
        {searchInAllStores && onSearchInAllStoresChange && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm text-blue-800 dark:text-blue-200">
                Söker i alla butiker
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSearchInAllStoresChange(false)}
                className="ml-2 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
              >
                Sök endast i nuvarande butik
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
