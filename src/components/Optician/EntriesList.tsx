
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useAnamnesis } from "@/contexts/AnamnesisContext";

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
  const { supabase, refreshClient } = useSupabaseClient();
  const { refreshData } = useAnamnesis();

  const { data: entries = [], isLoading, error, refetch } = useQuery({
    queryKey: ["anamnes-entries", organization?.id, status],
    queryFn: async () => {
      if (!organization?.id) return [];

      try {
        // Ensure we have a fresh auth token before making the request
        await refreshClient();

        const { data, error } = await supabase
          .from("anamnes_entries")
          .select("*")
          .eq("status", status)
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching anamnes entries:", error);
          throw error;
        }

        return data as AnamnesesEntry[];
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        
        console.error("Error in query function:", fetchError);
        
        toast({
          title: "Fel vid hämtning av anamneser",
          description: errorMessage,
          variant: "destructive",
        });
        
        throw fetchError;
      }
    },
    enabled: !!organization?.id,
    staleTime: 30000, // 30 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with max 30s
  });

  const handleRetry = async () => {
    // First refresh the client to ensure we have valid auth
    await refreshClient();
    // Then refresh the data
    refreshData();
    // Finally refetch this specific query
    refetch();
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState errorMessage={error.message} onRetry={handleRetry} />;
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
