
/**
 * This component provides a search input for filtering the anamnesis entry list.
 * It allows users to search by patient identifier (reference number) and refresh the list.
 * Enhanced to highlight that it searches reference numbers.
 */

import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const SearchInput = ({ 
  searchQuery, 
  onSearchChange,
  onRefresh,
  isRefreshing
}: SearchInputProps) => {
  return (
    <div className="relative flex gap-2 items-center">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
          <Search className="h-4 w-4" />
          <Hash className="h-3 w-3" />
        </div>
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sök efter referensnummer eller patient..."
          className="pl-12 rounded-xl bg-white border-muted"
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
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
};
