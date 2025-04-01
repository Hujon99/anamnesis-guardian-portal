
import { createContext, useContext, ReactNode, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";

interface AnamnesisContextType {
  selectedEntry: AnamnesesEntry | null;
  setSelectedEntry: (entry: AnamnesesEntry | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoading: boolean;
  error: Error | null;
  clearError: () => void;
  refreshData: () => void;
}

const AnamnesisContext = createContext<AnamnesisContextType | undefined>(undefined);

export function AnamnesisProvider({ children }: { children: ReactNode }) {
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const [activeTab, setActiveTab] = useState("sent");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  const { refreshClient } = useSupabaseClient();

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh data with debounce and error handling
  const refreshData = useCallback(() => {
    setIsLoading(true);
    
    try {
      // Refresh authentication first
      refreshClient();
      
      // Then invalidate queries to refresh data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["anamnes-entries"] });
        setIsLoading(false);
      }, 100); // Small delay to ensure auth refresh completes first
    } catch (err) {
      console.error("Error refreshing data:", err);
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
      activeTab, 
      setActiveTab,
      isLoading,
      error,
      clearError,
      refreshData
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
