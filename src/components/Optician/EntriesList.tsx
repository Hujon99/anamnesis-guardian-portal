
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { AnamnesesEntry } from "@/types/anamnesis";

import { EntryCard } from "./EntriesList/EntryCard";
import { LoadingState } from "./EntriesList/LoadingState";
import { ErrorState } from "./EntriesList/ErrorState";
import { EmptyState } from "./EntriesList/EmptyState";

interface EntriesListProps {
  status: string;
  selectedEntry: AnamnesesEntry | null;
  onSelectEntry: (entry: AnamnesesEntry) => void;
}

export const EntriesList = ({ status, selectedEntry, onSelectEntry }: EntriesListProps) => {
  const { organization } = useOrganization();
  const { supabase } = useSupabaseClient();

  const { data: entries = [], isLoading, error, refetch } = useQuery({
    queryKey: ["anamnes-entries", organization?.id, status],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("anamnes_entries")
        .select("*")
        .eq("status", status)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching anamnes entries:", error);
        toast({
          title: "Fel vid hämtning av anamneser",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      return data as AnamnesesEntry[];
    },
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState errorMessage={error.message} onRetry={() => refetch()} />;
  }

  if (entries.length === 0) {
    return <EmptyState status={status} />;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <EntryCard 
          key={entry.id}
          entry={entry}
          isSelected={selectedEntry?.id === entry.id}
          onSelect={() => onSelectEntry(entry)}
        />
      ))}
    </div>
  );
};
