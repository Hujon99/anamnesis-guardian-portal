
/**
 * This context provides state management for the anamnesis list and detail views.
 * It handles data fetching, error state management, and selected entry tracking.
 * The context implements error handling and manages the initial data loading.
 */

import { createContext, useContext, ReactNode, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { useOrganization } from "@clerk/clerk-react";

interface AnamnesisContextType {
  selectedEntry: AnamnesesEntry | null;
  setSelectedEntry: (entry: AnamnesesEntry | null) => void;
  isLoading: boolean;
  error: Error | null;
  clearError: () => void;
  refreshData: () => void;
  forceRefresh: () => void;
  dataLastUpdated: Date | null;
}

const AnamnesisContext = createContext<AnamnesisContextType | undefined>(undefined);

export function AnamnesisProvider({ children }: { children: ReactNode }) {
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataLastUpdated, setDataLastUpdated] = useState<Date | null>(new Date());
  const queryClient = useQueryClient();
  const { refreshClient } = useSupabaseClient();
  const { organization } = useOrganization();

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Regular refresh data with error handling
  const refreshData = useCallback(() => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    
    try {
      // Refresh authentication with normal priority (use cache if available)
      refreshClient(false)
        .then(() => {
          // Invalidate all anamnesis entries queries
          queryClient.invalidateQueries({ 
            queryKey: ["anamnes-entries-all"] 
          });
          
          setDataLastUpdated(new Date());
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error refreshing data:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
          
          toast({
            title: "Uppdateringsfel",
            description: "Det gick inte att uppdatera data. Försök igen.",
            variant: "destructive",
          });
        });
    } catch (err) {
      console.error("Error in refresh data:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
      
      toast({
        title: "Uppdateringsfel",
        description: "Det gick inte att uppdatera data. Försök igen.",
        variant: "destructive",
      });
    }
  }, [queryClient, refreshClient, organization?.id]);

  // Force refresh that bypasses all caches
  const forceRefresh = useCallback(() => {
    setIsLoading(true);
    
    try {
      // Force refresh authentication (bypass cache)
      refreshClient(true)
        .then(() => {
          // Invalidate and refetch all queries
          queryClient.invalidateQueries({ 
            queryKey: ["anamnes-entries-all"] 
          });
          queryClient.refetchQueries({ 
            queryKey: ["anamnes-entries-all"] 
          });
          setDataLastUpdated(new Date());
          
          toast({
            title: "Data uppdaterad",
            description: "Anamneser har uppdaterats.",
          });
          
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error force refreshing data:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
          
          toast({
            title: "Uppdateringsfel",
            description: "Det gick inte att uppdatera data. Försök igen.",
            variant: "destructive",
          });
        });
    } catch (err) {
      console.error("Error in force refresh:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
      
      toast({
        title: "Uppdateringsfel",
        description: "Det gick inte att uppdatera data. Försök igen.",
        variant: "destructive",
      });
    }
  }, [queryClient, refreshClient]);

  return (
    <AnamnesisContext.Provider value={{ 
      selectedEntry, 
      setSelectedEntry,
      isLoading,
      error,
      clearError,
      refreshData,
      forceRefresh,
      dataLastUpdated
    }}>
      {children}
    </AnamnesisContext.Provider>
  );
}

export function useAnamnesis() {
  const context = useContext(AnamnesisContext);
  if (context === undefined) {
    throw new Error("useAnamnesis must be used within an AnamnesisProvider");
  }
  return context;
}
