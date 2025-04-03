
/**
 * This component provides a unified list view of all anamnesis entries
 * with filtering, searching, and sorting capabilities. It replaces the previous
 * tab-based interface for a more streamlined user experience.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useAnamnesis } from "@/contexts/AnamnesisContext";
import { format, isAfter, isBefore, subDays } from "date-fns";

import { AnamnesisListItem } from "./AnamnesisListItem";
import { AnamnesisDetailModal } from "./AnamnesisDetailModal";
import { AnamnesisFilters } from "./AnamnesisFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { EmptyState } from "./EntriesList/EmptyState";
import { ErrorState } from "./EntriesList/ErrorState";
import { LoadingState } from "./EntriesList/LoadingState";

export function AnamnesisListView() {
  const { organization } = useOrganization();
  const { supabase, refreshClient } = useSupabaseClient();
  const { dataLastUpdated, forceRefresh } = useAnamnesis();
  
  // State for search, filter, and selected entry
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const [showOnlyUnanswered, setShowOnlyUnanswered] = useState(false);
  const [sortDescending, setSortDescending] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);

  // Fetch all entries regardless of status
  const { data: entries = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["anamnes-entries-all", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      try {
        console.log(`Fetching all entries for org: ${organization.id}`);
        
        const { data, error } = await supabase
          .from("anamnes_entries")
          .select("*")
          .eq("organization_id", organization.id)
          .order("sent_at", { ascending: false });

        if (error) {
          console.error("Error fetching anamnes entries:", error);
          throw error;
        }

        console.log(`Fetched ${data.length} entries`);
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
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!organization?.id,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Refetch when dataLastUpdated changes
  useEffect(() => {
    if (organization?.id && dataLastUpdated) {
      refetch();
    }
  }, [organization?.id, dataLastUpdated, refetch]);

  const handleRetry = async () => {
    await refreshClient(false);
    refetch();
  };

  // Filter and sort the entries based on current filters
  const filteredEntries = entries.filter(entry => {
    // Filter by search query (email)
    if (searchQuery && entry.patient_email) {
      if (!entry.patient_email.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    // Filter by status
    if (statusFilter && entry.status !== statusFilter) {
      return false;
    }
    
    // Filter by time
    if (timeFilter) {
      const sentDate = entry.sent_at ? new Date(entry.sent_at) : null;
      if (!sentDate) return false;
      
      const now = new Date();
      if (timeFilter === "today" && !isSameDay(sentDate, now)) {
        return false;
      } else if (timeFilter === "week") {
        const weekAgo = subDays(now, 7);
        if (isBefore(sentDate, weekAgo)) {
          return false;
        }
      } else if (timeFilter === "month") {
        const monthAgo = subDays(now, 30);
        if (isBefore(sentDate, monthAgo)) {
          return false;
        }
      }
    }
    
    // Filter by answered status
    if (showOnlyUnanswered) {
      if (entry.answers && Object.keys(entry.answers as Record<string, any>).length > 0) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by sent_at date
    const dateA = a.sent_at ? new Date(a.sent_at) : new Date(0);
    const dateB = b.sent_at ? new Date(b.sent_at) : new Date(0);
    
    return sortDescending 
      ? dateB.getTime() - dateA.getTime() 
      : dateA.getTime() - dateB.getTime();
  });

  // Helper function to check if two dates are the same day
  function isSameDay(date1: Date, date2: Date) {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }

  // Helper to determine if an entry is expired
  const isExpired = (entry: AnamnesesEntry) => {
    return entry.expires_at && isBefore(new Date(entry.expires_at), new Date());
  };

  // Calculate days until expiration
  const daysUntilExpiration = (entry: AnamnesesEntry) => {
    if (!entry.expires_at) return null;
    
    const expiryDate = new Date(entry.expires_at);
    const today = new Date();
    
    // If already expired
    if (isBefore(expiryDate, today)) {
      return -1;
    }
    
    // Calculate days difference
    const diffTime = Math.abs(expiryDate.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  if ((isLoading && !entries.length)) {
    return <LoadingState />;
  }

  if (error && !isFetching) {
    return <ErrorState errorMessage={error.message} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Sök efter patient-epost..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button 
            variant="outline" 
            onClick={handleRetry} 
            disabled={isFetching}
            aria-label="Uppdatera listan"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        <AnamnesisFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          showOnlyUnanswered={showOnlyUnanswered}
          onUnansweredFilterChange={setShowOnlyUnanswered}
          sortDescending={sortDescending}
          onSortDirectionChange={setSortDescending}
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {isFetching ? (
                <span className="flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Uppdaterar...
                </span>
              ) : (
                `${filteredEntries.length} av ${entries.length} anamneser`
              )}
            </p>
            {statusFilter && (
              <Badge variant="outline" className="flex items-center gap-1">
                {statusFilter === "sent" ? "Skickade" : 
                 statusFilter === "pending" ? "Att granska" : 
                 statusFilter === "ready" ? "Klara" : statusFilter}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {dataLastUpdated && 
             `Senast uppdaterad: ${dataLastUpdated.toLocaleTimeString('sv-SE')}`}
          </p>
        </div>
        
        {filteredEntries.length === 0 ? (
          <EmptyState status={statusFilter || "all"} />
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <AnamnesisListItem
                key={entry.id}
                entry={entry}
                isExpired={isExpired(entry)}
                daysUntilExpiration={daysUntilExpiration(entry)}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        )}
      </div>
      
      {selectedEntry && (
        <AnamnesisDetailModal
          entry={selectedEntry}
          isOpen={!!selectedEntry}
          onOpenChange={(open) => {
            if (!open) setSelectedEntry(null);
          }}
          onEntryUpdated={() => {
            refetch();
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}
