
import { useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface EntriesListProps {
  status: string;
  selectedEntry: AnamnesesEntry | null;
  onSelectEntry: (entry: AnamnesesEntry) => void;
}

export const EntriesList = ({ status, selectedEntry, onSelectEntry }: EntriesListProps) => {
  const { organization } = useOrganization();
  const { supabase, refreshClient } = useSupabaseClient();
  const { dataLastUpdated, forceRefresh, isLoading: contextLoading } = useAnamnesis();

  // Optimize query with better staleTime, cacheTime, and retry configuration
  const { data: entries = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["anamnes-entries", organization?.id, status, dataLastUpdated],
    queryFn: async () => {
      if (!organization?.id) return [];

      try {
        console.log(`Fetching entries with status '${status}' for org: ${organization.id}`);
        
        const { data, error } = await supabase
          .from("anamnes_entries")
          .select("*")
          .eq("status", status)
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(`Error fetching anamnes entries with status '${status}':`, error);
          throw error;
        }

        console.log(`Fetched ${data.length} entries with status '${status}'`);
        return data as AnamnesesEntry[];
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        
        console.error(`Error in query function for status '${status}':`, fetchError);
        
        // Only show toast for critical errors, not during normal retries
        if (!isFetching) {
          toast({
            title: "Fel vid hämtning av anamneser",
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        throw fetchError;
      }
    },
    staleTime: 30000, // 30 seconds - increasing from default to reduce refetches
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache longer
    enabled: !!organization?.id,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with max 30s
  });

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      refetch();
    }
  }, [organization?.id, refetch]);

  const handleRetry = async () => {
    // Force refresh the client and data
    forceRefresh();
  };

  // Show loading state when context is loading or query is loading for the first time
  if ((isLoading && !entries.length) || contextLoading) {
    return <LoadingState />;
  }

  // Show error state only after retries are exhausted
  if (error && !isFetching) {
    return <ErrorState errorMessage={error.message} onRetry={handleRetry} />;
  }

  // Show empty state when there are no entries but the query was successful
  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState status={status} />
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Uppdatera listan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {isFetching ? "Uppdaterar..." : `${entries.length} anamneser`}
        </p>
        <Button variant="ghost" size="sm" onClick={handleRetry} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Uppdatera
        </Button>
      </div>
      
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
