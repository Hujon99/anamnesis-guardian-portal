
/**
 * This context provides state management for the anamnesis list and detail views.
 * It handles data fetching, error state management, and selected entry tracking.
 * The context implements error handling and manages the initial data loading.
 */

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";

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

  // Log when the provider is initialized
  useEffect(() => {
    console.log("AnamnesisProvider initialized at", new Date().toISOString());
    
    return () => {
      console.log("AnamnesisProvider unmounted at", new Date().toISOString());
    };
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Regular refresh data with error handling
  const refreshData = useCallback(() => {
    console.log("AnamnesisContext: refreshData called at", new Date().toISOString());
    setIsLoading(true);
    
    try {
      // Invalidate all anamnesis entries queries
      queryClient.invalidateQueries({ 
        queryKey: ["anamnes-entries-all"] 
      });
      
      setDataLastUpdated(new Date());
      setIsLoading(false);
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
  }, [queryClient]);

  // Force refresh that bypasses all caches
  const forceRefresh = useCallback(() => {
    console.log("AnamnesisContext: forceRefresh called at", new Date().toISOString());
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

  const contextValue = {
    selectedEntry, 
    setSelectedEntry,
    isLoading,
    error,
    clearError,
    refreshData,
    forceRefresh,
    dataLastUpdated
  };

  console.log("AnamnesisContext: rendering provider with value:", JSON.stringify({
    hasSelectedEntry: !!selectedEntry,
    isLoading,
    hasError: !!error,
    dataLastUpdated: dataLastUpdated?.toISOString()
  }));

  return (
    <AnamnesisContext.Provider value={contextValue}>
      {children}
    </AnamnesisContext.Provider>
  );
}

export function useAnamnesis() {
  const context = useContext(AnamnesisContext);
  if (context === undefined) {
    console.error("useAnamnesis must be used within an AnamnesisProvider - current component tree:", 
      new Error().stack);
    throw new Error("useAnamnesis must be used within an AnamnesisProvider");
  }
  return context;
}
