
/**
 * This component provides advanced filtering options for anamnesis entries,
 * including filters for stores, opticians, and assignment status.
 * Redesigned with unified styling and better visual hierarchy.
 */

import { useState, useEffect } from "react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useOpticians } from "@/hooks/useOpticians";
import { Loader2, User, Store as StoreIcon, FilterX, ChevronDown, CheckCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterGroup } from "./Filters/FilterGroup";

interface AdvancedFiltersProps {
  storeFilter: string | null;
  onStoreFilterChange: (value: string | null) => void;
  opticianFilter: string | null;
  onOpticianFilterChange: (value: string | null) => void;
  assignmentFilter: 'all' | 'assigned' | 'unassigned';
  onAssignmentFilterChange: (value: 'all' | 'assigned' | 'unassigned') => void;
}

const assignmentOptions = [
  { value: "all", label: "Alla", icon: Users },
  { value: "assigned", label: "Tilldelade", icon: User },
  { value: "unassigned", label: "Ej tilldelade", icon: User },
];

export function AdvancedFilters({
  storeFilter,
  onStoreFilterChange,
  opticianFilter,
  onOpticianFilterChange,
  assignmentFilter,
  onAssignmentFilterChange
}: AdvancedFiltersProps) {
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();
  const { opticians, isLoading: isLoadingOpticians } = useOpticians();
  
  // State for dropdowns
  const [storeOpen, setStoreOpen] = useState(false);
  const [opticianOpen, setOpticianOpen] = useState(false);
  
  // Fetch stores for filtering
  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ["stores", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name', { ascending: true });
        
      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id
  });
  
  // Count active advanced filters
  const activeAdvancedFilters = [
    storeFilter,
    opticianFilter,
    assignmentFilter !== 'all'
  ].filter(Boolean).length;

  // Reset all advanced filters
  const handleResetFilters = () => {
    onStoreFilterChange(null);
    onOpticianFilterChange(null);
    onAssignmentFilterChange('all');
  };

  // Get selected store name
  const selectedStore = stores.find(store => store.id === storeFilter);
  
  // Get selected optician name
  const selectedOptician = opticians.find(opt => opt.id === opticianFilter);
  
  // Get selected assignment option
  const selectedAssignment = assignmentOptions.find(opt => opt.value === assignmentFilter);
  
  return (
    <div className="space-y-4 p-6 bg-white rounded-2xl border border-muted/30 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">Avancerade filter</h3>
          {activeAdvancedFilters > 0 && (
            <Badge variant="secondary" className="h-6 px-2 text-xs bg-accent_teal/10 text-accent_teal">
              {activeAdvancedFilters} aktiv{activeAdvancedFilters !== 1 ? 'a' : ''}
            </Badge>
          )}
        </div>
        
        {activeAdvancedFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <FilterX className="h-3.5 w-3.5 mr-1.5" />
            Återställ alla
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <FilterGroup>
        {/* Store Filter */}
        <Popover open={storeOpen} onOpenChange={setStoreOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 justify-between min-w-[140px] bg-white border-muted transition-all",
                storeFilter && "border-accent_teal bg-accent_teal/5 text-accent_teal"
              )}
            >
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {selectedStore?.name || "Alla butiker"}
                </span>
                {storeFilter && (
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
              <button
                onClick={() => {
                  onStoreFilterChange(null);
                  setStoreOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                  !storeFilter 
                    ? "bg-accent_teal/10 text-accent_teal font-medium" 
                    : "hover:bg-muted/50"
                )}
              >
                <StoreIcon className="h-4 w-4" />
                <span>Alla butiker</span>
                {!storeFilter && <CheckCircle className="h-4 w-4 ml-auto" />}
              </button>
              
              {isLoadingStores ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Laddar...</span>
                </div>
              ) : (
                stores.map((store: any) => {
                  const isSelected = storeFilter === store.id;
                  return (
                    <button
                      key={store.id}
                      onClick={() => {
                        onStoreFilterChange(store.id);
                        setStoreOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                        isSelected 
                          ? "bg-accent_teal/10 text-accent_teal font-medium" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <StoreIcon className="h-4 w-4" />
                      <span>{store.name}</span>
                      {isSelected && <CheckCircle className="h-4 w-4 ml-auto" />}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Optician Filter */}
        <Popover open={opticianOpen} onOpenChange={setOpticianOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 justify-between min-w-[140px] bg-white border-muted transition-all",
                opticianFilter && "border-accent_teal bg-accent_teal/5 text-accent_teal"
              )}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {selectedOptician?.name || selectedOptician?.email || "Alla optiker"}
                </span>
                {opticianFilter && (
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
              <button
                onClick={() => {
                  onOpticianFilterChange(null);
                  setOpticianOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                  !opticianFilter 
                    ? "bg-accent_teal/10 text-accent_teal font-medium" 
                    : "hover:bg-muted/50"
                )}
              >
                <User className="h-4 w-4" />
                <span>Alla optiker</span>
                {!opticianFilter && <CheckCircle className="h-4 w-4 ml-auto" />}
              </button>
              
              {isLoadingOpticians ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Laddar...</span>
                </div>
              ) : (
                opticians.map((optician) => {
                  const isSelected = opticianFilter === optician.id;
                  return (
                    <button
                      key={optician.id}
                      onClick={() => {
                        onOpticianFilterChange(optician.id);
                        setOpticianOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                        isSelected 
                          ? "bg-accent_teal/10 text-accent_teal font-medium" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <User className="h-4 w-4" />
                      <span>{optician.name || optician.email || 'Okänd optiker'}</span>
                      {isSelected && <CheckCircle className="h-4 w-4 ml-auto" />}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Assignment Filter */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
          {assignmentOptions.map((option) => {
            const Icon = option.icon;
            const isActive = assignmentFilter === option.value;
            
            return (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                onClick={() => onAssignmentFilterChange(option.value as 'all' | 'assigned' | 'unassigned')}
                className={cn(
                  "h-8 px-3 text-xs transition-all duration-300",
                  isActive 
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/80"
                )}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </FilterGroup>
    </div>
  );
}
