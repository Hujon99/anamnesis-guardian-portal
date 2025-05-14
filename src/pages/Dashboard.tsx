
/**
 * Dashboard page that serves as the main landing page after authentication.
 * It displays the anamnesis list with enhanced filtering options for stores and opticians,
 * providing a comprehensive overview of all organization entries.
 */

import { useOrganization, useUser, useAuth } from "@clerk/clerk-react";
import { AnamnesisListView } from "@/components/Optician/AnamnesisListView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clipboard, Loader2, User, RefreshCw } from "lucide-react";
import { AnamnesisProvider } from "@/contexts/AnamnesisContext";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useEffect, useState } from "react";
import { LinkGenerator } from "@/components/Optician/LinkGenerator";
import { DirectFormButton } from "@/components/Optician/DirectFormButton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SyncUsersButton } from "@/components/Admin/SyncUsersButton";

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
  const { userId, has } = useAuth();
  const { user } = useUser();
  const { isReady, refreshClient, supabase } = useSupabaseClient();
  const [isUserOptician, setIsUserOptician] = useState(false);
  const [isConnectionActive, setIsConnectionActive] = useState(true);
  
  // Check user roles
  const isAdmin = has({ role: "org:admin" });

  // Ensure Supabase client is refreshed when dashboard mounts
  useEffect(() => {
    console.log("Dashboard mounted, ensuring Supabase client is ready");
    if (!isReady) {
      refreshClient(true); // Force refresh on dashboard mount
      setIsConnectionActive(false);
    } else {
      setIsConnectionActive(true);
    }
  }, [isReady, refreshClient]);

  // Check if user is an optician
  useEffect(() => {
    const checkOpticianRole = async () => {
      if (!userId || !isReady) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_user_id', userId)
          .single();
          
        if (error) {
          console.error("Error checking optician role:", error);
          
          // Check if it's an authentication error and refresh the client
          if (error.code === "PGRST301" || error.message?.includes("JWT")) {
            console.log("JWT authentication error detected, refreshing client...");
            await refreshClient(true);
          }
          
          setIsUserOptician(false);
          return;
        }
        
        setIsUserOptician(data?.role === 'optician');
        setIsConnectionActive(true);
      } catch (error) {
        console.error("Unexpected error checking optician role:", error);
        setIsUserOptician(false);
        setIsConnectionActive(false);
      }
    };
    
    checkOpticianRole();
  }, [userId, isReady, supabase, refreshClient]);

  // Determine if user can access optician features
  const canAccessOpticianFeatures = isUserOptician || isAdmin;
  
  // Handle manual connection refresh
  const handleRefreshConnection = async () => {
    try {
      setIsConnectionActive(false);
      await refreshClient(true);
      setIsConnectionActive(true);
    } catch (error) {
      console.error("Failed to refresh connection:", error);
      setIsConnectionActive(false);
    }
  };

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
          <p className="text-muted-foreground mt-2">Hantering av samtliga anamneser i organisationen</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {canAccessOpticianFeatures && (
            <Button variant="outline" asChild className="flex items-center gap-2 font-medium border-accent-1/30 hover:bg-accent-1/10 hover:text-accent-1 hover:border-accent-1">
              <Link to="/my-anamneses">
                <Clipboard className="h-4 w-4" />
                <span>Till mina anamneser</span>
              </Link>
            </Button>
          )}
          <DirectFormButton />
          <LinkGenerator />
          {isAdmin && (
            <SyncUsersButton 
              variant="outline"
              size="default"
              buttonText="Synka användare"
            />
          )}
          <Button
            variant="ghost" 
            size="icon"
            className={`h-10 w-10 ${!isConnectionActive ? 'text-destructive' : 'text-green-500'}`}
            onClick={handleRefreshConnection}
            title="Uppdatera anslutningen"
          >
            <RefreshCw className={`h-4 w-4 ${!isReady ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {!isConnectionActive && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Anslutningsproblem</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Det uppstod ett problem med databasanslutningen. Detta kan bero på en utgången session.</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshConnection}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Uppdatera anslutningen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={reset}>
            <AnamnesisProvider>
              <AnamnesisListView showAdvancedFilters={true} />
            </AnamnesisProvider>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
};

export default Dashboard;
