/**
 * Dashboard page that serves as the main landing page after authentication.
 * It now displays the anamnesis list directly for better usability,
 * providing immediate access to the most important functionality.
 */

import { useOrganization } from "@clerk/clerk-react";
import { AnamnesisListView } from "@/components/Optician/AnamnesisListView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { AnamnesisProvider } from "@/contexts/AnamnesisContext";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useEffect } from "react";
import { LinkGenerator } from "@/components/Optician/LinkGenerator";
import { DirectFormButton } from "@/components/Optician/DirectFormButton";

// Error fallback component for the Dashboard
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Ett fel uppstod</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{error.message || "Ett oväntat fel uppstod. Försök ladda om sidan."}</p>
      </AlertDescription>
    </Alert>
  );
};

// Loading state component
const LoadingState = () => (
  <div className="flex items-center justify-center py-10">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
      <h2 className="text-xl font-medium mb-2">Förbereder översikt</h2>
      <p className="text-muted-foreground">Ansluter till databasen...</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { organization } = useOrganization();
  const { isReady, refreshClient } = useSupabaseClient();
  
  // Ensure Supabase client is refreshed when dashboard mounts
  useEffect(() => {
    console.log("Dashboard mounted, ensuring Supabase client is ready");
    if (!isReady) {
      refreshClient(false);
    }
  }, [isReady, refreshClient]);

  if (!organization) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Du måste tillhöra en organisation</h2>
        <p className="text-gray-600 mb-6">
          Kontakta din administratör för att bli tillagd i en organisation.
        </p>
      </div>
    );
  }

  // Show loading state while Supabase client is initializing
  if (!isReady) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Översikt</h1>
          <p className="text-muted-foreground mt-2">Hantering av anamneslista och patientdata</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DirectFormButton />
          <LinkGenerator />
        </div>
      </div>

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={reset}>
            <AnamnesisProvider>
              <AnamnesisListView />
            </AnamnesisProvider>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
};

export default Dashboard;
