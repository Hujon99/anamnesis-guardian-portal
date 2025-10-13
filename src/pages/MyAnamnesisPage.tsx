
/**
 * My Anamnesis page that displays anamnesis entries assigned to the logged-in optician.
 * It provides a personalized view with statistics and filtered entries specific to the user.
 * Only accessible by opticians and admins.
 */

import { useSafeUser as useUser } from "@/hooks/useSafeUser";
import { useSafeAuth as useAuth } from "@/hooks/useSafeAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, LayoutDashboard, Loader2 } from "lucide-react";
import { AnamnesisProvider } from "@/contexts/AnamnesisContext";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useEffect } from "react";
import { MyAnamnesisView } from "@/components/Optician/MyAnamnesisView";
import { DirectFormButton } from "@/components/Optician/DirectFormButton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

// Error fallback component 
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
      <h2 className="text-xl font-medium mb-2">Förbereder din översikt</h2>
      <p className="text-muted-foreground">Hämtar dina tilldelade anamneser...</p>
    </div>
  </div>
);

const MyAnamnesisPage = () => {
  const { user } = useUser();
  const { isReady, refreshClient } = useSupabaseClient();
  const { has } = useAuth();
  
  // Check if user is admin
  const isAdmin = has({ role: "org:admin" });
  
  // Ensure Supabase client is refreshed when dashboard mounts
  useEffect(() => {
    console.log("My Anamnesis page mounted, ensuring Supabase client is ready");
    if (!isReady) {
      refreshClient(false);
    }
  }, [isReady, refreshClient]);

  if (!user) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Du måste vara inloggad för att se denna sida</h2>
        <p className="text-gray-600 mb-6">
          Logga in för att se dina tilldelade anamneser.
        </p>
      </div>
    );
  }

  // Show loading state while Supabase client is initializing
  if (!isReady) {
    return <LoadingState />;
  }

  return (
    <ProtectedRoute requireRole={['admin', 'optician']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mina anamneser</h1>
            <p className="text-muted-foreground mt-2">
              {isAdmin 
                ? "Hantering av alla anamneser med administratörsbehörighet" 
                : "Hantering av anamneser tilldelade till dig"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" asChild className="flex items-center gap-2">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>Till översikten</span>
              </Link>
            </Button>
            <DirectFormButton />
          </div>
        </div>

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary FallbackComponent={ErrorFallback} onReset={reset}>
              <AnamnesisProvider>
                <MyAnamnesisView />
              </AnamnesisProvider>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </ProtectedRoute>
  );
};

export default MyAnamnesisPage;
