
/**
 * This component provides advanced filtering options for anamnesis entries,
 * including filters for stores, opticians, and assignment status.
 */

import { useState, useEffect } from "react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useOrganization } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOpticians } from "@/hooks/useOpticians";
import { Loader2, User, Users, Store as StoreIcon, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdvancedFiltersProps {
  storeFilter: string | null;
  onStoreFilterChange: (value: string | null) => void;
  opticianFilter: string | null;
  onOpticianFilterChange: (value: string | null) => void;
  assignmentFilter: 'all' | 'assigned' | 'unassigned';
  onAssignmentFilterChange: (value: 'all' | 'assigned' | 'unassigned') => void;
}

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
  const { opticians, isLoading: isLoadingOpticians, getOpticianDisplayName } = useOpticians();
  
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
  
  // Reset all advanced filters
  const handleResetFilters = () => {
    onStoreFilterChange(null);
    onOpticianFilterChange(null);
    onAssignmentFilterChange('all');
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Avancerade filter</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleResetFilters}
          className="h-8 gap-1 text-xs"
        >
          <FilterX className="h-3.5 w-3.5" />
          Återställ alla filter
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Select 
            value={storeFilter || 'all'} 
            onValueChange={(value) => onStoreFilterChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrera efter butik" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Butiker</SelectLabel>
                <SelectItem value="all">Alla butiker</SelectItem>
                {isLoadingStores ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Laddar...
                  </div>
                ) : (
                  stores.map((store: any) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select 
            value={opticianFilter || 'all'} 
            onValueChange={(value) => onOpticianFilterChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrera efter optiker" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Optiker</SelectLabel>
                <SelectItem value="all">Alla optiker</SelectItem>
                <SelectItem value="none">Inga tilldelade</SelectItem>
                {isLoadingOpticians ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Laddar...
                  </div>
                ) : (
                  opticians.map((optician) => (
                    <SelectItem key={optician.id} value={optician.id}>
                      {getOpticianDisplayName(optician)}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tilldelningsstatus
            </label>
            <ToggleGroup 
              type="single" 
              value={assignmentFilter} 
              onValueChange={(value) => {
                if (value) onAssignmentFilterChange(value as 'all' | 'assigned' | 'unassigned');
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="all" aria-label="Visa alla">
                Alla
              </ToggleGroupItem>
              <ToggleGroupItem value="assigned" aria-label="Visa tilldelade">
                Tilldelade
              </ToggleGroupItem>
              <ToggleGroupItem value="unassigned" aria-label="Visa ej tilldelade">
                Ej tilldelade
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
