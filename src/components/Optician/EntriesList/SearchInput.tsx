
/**
 * This component provides a search input for filtering the anamnesis entry list.
 * It allows users to search by patient identifier (name/number) and refresh the list.
 */

import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sök efter patient (namn/nummer)..."
          className="pl-9"
        />
      </div>
      
      {onRefresh && (
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onRefresh} 
          disabled={isRefreshing}
          title="Uppdatera listan"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
};
