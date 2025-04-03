
/**
 * This hook manages the data fetching and filtering logic for anamnesis entries.
 * It provides a unified interface for retrieving, filtering, and sorting
 * anamnesis entries with loading states and error handling.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { AnamnesesEntry } from "@/types/anamnesis";
import { subDays } from "date-fns";
import { useAnamnesis } from "@/contexts/AnamnesisContext";
import { toast } from "@/components/ui/use-toast";

export interface AnamnesisFilters {
  searchQuery: string;
  statusFilter: string | null;
  timeFilter: string | null;
  showOnlyUnanswered: boolean;
  sortDescending: boolean;
}

export const useAnamnesisList = () => {
  const { organization } = useOrganization();
  const { supabase, refreshClient } = useSupabaseClient();
  const { dataLastUpdated, forceRefresh } = useAnamnesis();
  
  // State for filters
  const [filters, setFilters] = useState<AnamnesisFilters>({
    searchQuery: "",
    statusFilter: null,
    timeFilter: null,
    showOnlyUnanswered: false,
    sortDescending: true,
  });

  // Fetch all entries regardless of status
  const { 
    data: entries = [], 
    isLoading, 
    error, 
    refetch, 
    isFetching 
  } = useQuery({
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

  // Update a single filter
  const updateFilter = <K extends keyof AnamnesisFilters>(
    key: K, 
    value: AnamnesisFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      searchQuery: "",
      statusFilter: null,
      timeFilter: null,
      showOnlyUnanswered: false,
      sortDescending: true,
    });
  };

  // Handle retry for errors
  const handleRetry = async () => {
    await refreshClient(false);
    refetch();
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

  // Filter and sort the entries based on current filters
  const filteredEntries = entries.filter(entry => {
    // Filter by search query (email)
    if (filters.searchQuery && entry.patient_email) {
      if (!entry.patient_email.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    // Filter by status
    if (filters.statusFilter && entry.status !== filters.statusFilter) {
      return false;
    }
    
    // Filter by time
    if (filters.timeFilter) {
      const sentDate = entry.sent_at ? new Date(entry.sent_at) : null;
      if (!sentDate) return false;
      
      const now = new Date();
      if (filters.timeFilter === "today" && !isSameDay(sentDate, now)) {
        return false;
      } else if (filters.timeFilter === "week") {
        const weekAgo = subDays(now, 7);
        if (sentDate < weekAgo) {
          return false;
        }
      } else if (filters.timeFilter === "month") {
        const monthAgo = subDays(now, 30);
        if (sentDate < monthAgo) {
          return false;
        }
      }
    }
    
    // Filter by answered status
    if (filters.showOnlyUnanswered) {
      if (entry.answers && Object.keys(entry.answers as Record<string, any>).length > 0) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by sent_at date
    const dateA = a.sent_at ? new Date(a.sent_at) : new Date(0);
    const dateB = b.sent_at ? new Date(b.sent_at) : new Date(0);
    
    return filters.sortDescending 
      ? dateB.getTime() - dateA.getTime() 
      : dateA.getTime() - dateB.getTime();
  });

  return {
    entries,
    filteredEntries,
    filters,
    updateFilter,
    resetFilters,
    isLoading,
    error,
    isFetching,
    refetch,
    handleRetry,
    dataLastUpdated
  };
};
