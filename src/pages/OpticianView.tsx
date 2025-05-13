
/**
 * This page represents the main view for opticians managing patient anamnesis entries.
 * It provides a unified list view of all entries with filtering capabilities and detailed
 * information accessible through a modal dialog.
 * 
 * The view handles error states, authentication, and synchronization with the organization data.
 * It uses Supabase Realtime for live updates of anamnesis entries.
 */

import { useState, useEffect } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { OpticianHeader } from "@/components/Optician/OpticianHeader";
import { LinkGenerator } from "@/components/Optician/LinkGenerator";
import { AnamnesisListView } from "@/components/Optician/AnamnesisListView";
import { AnamnesisProvider, useAnamnesis } from "@/contexts/AnamnesisContext";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useQueryClient } from "@tanstack/react-query";

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => {
  const { refreshClient } = useSupabaseClient();
  
  const handleReset = async () => {
    // First refresh auth, then reset error boundary
    await refreshClient();
    resetErrorBoundary();
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Ett fel uppstod</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{error.message || "Ett oväntat fel uppstod. Försök ladda om sidan."}</p>
        <Button onClick={handleReset} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Försök igen
        </Button>
      </AlertDescription>
    </Alert>
  );
};

// Main content component (wrapped with error boundary)
const OpticianContent = () => {
  const { organization } = useOrganization();
  const { supabase, isLoading: supabaseLoading, error: supabaseError, refreshClient } = useSupabaseClient();
  const { isSyncing, isSynced, error: syncError } = useSyncOrganization();
  const { error: contextError, clearError, refreshData } = useAnamnesis();
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  const isReady = !supabaseLoading && !isSyncing && isSynced;
  const combinedError = error || supabaseError || syncError || contextError;

  // Fetch data when component mounts and all dependencies are ready
  useEffect(() => {
    if (isReady && organization?.id) {
      console.log("OpticianContent is ready, triggering data fetch");
      queryClient.invalidateQueries({ queryKey: ["anamnes-entries-all"] });
    }
  }, [isReady, organization?.id, queryClient]);

  const handleRetry = async () => {
    setError(null);
    clearError();
    await refreshClient();
  };

  if (combinedError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fel</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{combinedError.message}</p>
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Försök igen
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Laddar...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
        <OpticianHeader />
        <LinkGenerator />
      </div>
      
      <div className="mt-6">
        <AnamnesisListView />
      </div>
    </div>
  );
};

// Main component with provider and error boundary
const OpticianView = () => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={reset}>
          <AnamnesisProvider>
            <OpticianContent />
          </AnamnesisProvider>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

export default OpticianView;
