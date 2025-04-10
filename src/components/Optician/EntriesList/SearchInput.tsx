
/**
 * This component provides a search input for filtering the anamnesis entry list.
 * It allows users to search by patient identifier (name/number).
 */

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchInput = ({ value, onChange }: SearchInputProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Sök efter patient (namn/nummer)..."
        className="pl-9"
      />
    </div>
  );
}
