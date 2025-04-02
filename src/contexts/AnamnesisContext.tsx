
import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { useOrganization } from "@clerk/clerk-react";

interface AnamnesisContextType {
  selectedEntry: AnamnesesEntry | null;
  setSelectedEntry: (entry: AnamnesesEntry | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  const [activeTab, setActiveTab] = useState("sent");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataLastUpdated, setDataLastUpdated] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();
  const { refreshClient } = useSupabaseClient();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  
  // Track consecutive errors to implement circuit breaker
  const consecutiveErrorsRef = useState<number>(0);
  const lastRefreshAttemptRef = useState<number>(0);
  const MIN_REFRESH_INTERVAL = 3000; // Increased from 2000 to 3000 ms
  const CIRCUIT_BREAKER_THRESHOLD = 5; // Break after 5 consecutive errors
  const CIRCUIT_BREAKER_RESET_TIME = 30000; // 30 seconds before resetting circuit breaker

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
    consecutiveErrorsRef[0] = 0;
  }, [consecutiveErrorsRef]);

  // Initial data load on mount
  useEffect(() => {
    if (isOrgLoaded && organization?.id && !isInitialized) {
      setTimeout(() => {
        refreshData();
        setIsInitialized(true);
      }, 500);
    }
  }, [isOrgLoaded, organization?.id, isInitialized]);

  // Regular refresh data with debounce and error handling
  const refreshData = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshAttemptRef[0] < MIN_REFRESH_INTERVAL) {
      console.log("Refresh attempt debounced - too frequent");
      return;
    }
    
    // Circuit breaker pattern
    if (consecutiveErrorsRef[0] >= CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastError = now - lastRefreshAttemptRef[0];
      if (timeSinceLastError < CIRCUIT_BREAKER_RESET_TIME) {
        console.log(`Circuit breaker active - waiting ${(CIRCUIT_BREAKER_RESET_TIME - timeSinceLastError) / 1000}s to retry`);
        return;
      } else {
        // Reset circuit breaker after cooling period
        console.log("Circuit breaker reset after cooling period");
        consecutiveErrorsRef[0] = 0;
      }
    }
    
    lastRefreshAttemptRef[0] = now;
    setIsLoading(true);
    
    try {
      // Refresh authentication with normal priority (use cache if available)
      refreshClient(false)
        .then(() => {
          // Only invalidate the current tab's data
          setTimeout(() => {
            queryClient.invalidateQueries({ 
              queryKey: ["anamnes-entries", undefined, activeTab] 
            });
            consecutiveErrorsRef[0] = 0;
            setDataLastUpdated(new Date());
            setIsLoading(false);
          }, 100); // Small delay to ensure auth refresh completes first
        })
        .catch((err) => {
          console.error("Error refreshing data:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          consecutiveErrorsRef[0]++;
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
      consecutiveErrorsRef[0]++;
      setIsLoading(false);
      
      toast({
        title: "Uppdateringsfel",
        description: "Det gick inte att uppdatera data. Försök igen.",
        variant: "destructive",
      });
    }
  }, [queryClient, refreshClient, consecutiveErrorsRef, lastRefreshAttemptRef, activeTab]);

  // Force refresh that bypasses all caches
  const forceRefresh = useCallback(() => {
    setIsLoading(true);
    
    try {
      // Force refresh authentication (bypass cache)
      refreshClient(true)
        .then(() => {
          // Then invalidate and refetch only the active tab's queries
          setTimeout(() => {
            queryClient.invalidateQueries({ 
              queryKey: ["anamnes-entries", undefined, activeTab] 
            });
            queryClient.refetchQueries({ 
              queryKey: ["anamnes-entries", undefined, activeTab] 
            });
            consecutiveErrorsRef[0] = 0;
            setDataLastUpdated(new Date());
            
            toast({
              title: "Data uppdaterad",
              description: "Anamneser har uppdaterats.",
            });
            
            setIsLoading(false);
          }, 100);
        })
        .catch((err) => {
          console.error("Error force refreshing data:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          consecutiveErrorsRef[0]++;
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
      consecutiveErrorsRef[0]++;
      setIsLoading(false);
      
      toast({
        title: "Uppdateringsfel",
        description: "Det gick inte att uppdatera data. Försök igen.",
        variant: "destructive",
      });
    }
  }, [queryClient, refreshClient, consecutiveErrorsRef, activeTab]);

  // Do NOT automatically refresh data when tab changes - let the TabsContainer handle that
  // This removes a major source of circular refreshing

  return (
    <AnamnesisContext.Provider value={{ 
      selectedEntry, 
      setSelectedEntry, 
      activeTab, 
      setActiveTab,
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
