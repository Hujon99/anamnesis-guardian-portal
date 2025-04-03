
/**
 * This component provides search functionality for the anamnesis list.
 * It includes a search input with instant filtering and a refresh button.
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function SearchInput({
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing
}: SearchInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Sök efter patient-epost..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1"
        aria-label="Sök efter anamnesen"
      />
      <Button 
        variant="outline" 
        onClick={onRefresh} 
        disabled={isRefreshing}
        aria-label="Uppdatera listan"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
