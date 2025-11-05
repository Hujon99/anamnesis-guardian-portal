
/**
 * Dashboard page that serves as the main landing page after authentication.
 * It displays the anamnesis list with enhanced filtering options for stores and opticians,
 * providing a comprehensive overview of all organization entries.
 */

import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useSafeUser as useUser } from "@/hooks/useSafeUser";
import { useSafeAuth as useAuth } from "@/hooks/useSafeAuth";
import { AnamnesisListView } from "@/components/Optician/AnamnesisListView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clipboard, Loader2 } from "lucide-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useEffect, useState } from "react";
import { DirectFormButton } from "@/components/Optician/DirectFormButton";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { OnboardingTour } from "@/components/Onboarding/OnboardingTour";
import { useActiveStore } from "@/contexts/ActiveStoreContext";
import { Badge } from "@/components/ui/badge";
import { Store } from "lucide-react";
import { getStoreColor, getStoreAccentColor } from "@/utils/storeColorUtils";
// Import debug utility for testing (remove after testing)
import { debugSummaryRepair } from "@/utils/debugSummaryRepair";

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
  const { activeStore } = useActiveStore();
  const [isUserOptician, setIsUserOptician] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Handle navigation from form submission to open driving license examination
  const [autoOpenDrivingLicenseExam, setAutoOpenDrivingLicenseExam] = useState<string | null>(null);
  
  useEffect(() => {
    const state = location.state as any;
    if (state?.openDrivingLicenseExam) {
      const entryId = state.openDrivingLicenseExam;
      console.log("[Dashboard]: Auto-opening driving license examination for entry:", entryId);
      
      setAutoOpenDrivingLicenseExam(entryId);
      
      // Show toast notification
      toast({
        title: "Öppnar körkortsundersökning",
        description: "Formuläret har skickats in och undersökningen öppnas automatiskt.",
      });
      
      // Clear the navigation state to prevent re-opening
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  
  // Check user roles
  const isAdmin = has({ role: "org:admin" });

  // Ensure Supabase client is refreshed when dashboard mounts
  useEffect(() => {
    console.log("Dashboard mounted, ensuring Supabase client is ready");
    if (!isReady) {
      refreshClient(false);
    }
  }, [isReady, refreshClient]);

  // Check if user is an optician
  useEffect(() => {
    const checkOpticianRole = async () => {
      if (!userId || !isReady) return;
      
      try {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_user_id', userId)
          .single();
          
        setIsUserOptician(data?.role === 'optician');
      } catch (error) {
        console.error("Error checking optician role:", error);
        setIsUserOptician(false);
      }
    };
    
    checkOpticianRole();
  }, [userId, isReady, supabase]);

  // Determine if user can access optician features
  const canAccessOpticianFeatures = isUserOptician || isAdmin;

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
    <>
      <OnboardingTour />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Översikt</h1>
              {activeStore ? (
                <Badge 
                  className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium border transition-all duration-500 ease-in-out hover-scale"
                  style={{
                    backgroundColor: getStoreColor(activeStore.name, activeStore.id).backgroundColor,
                    color: getStoreColor(activeStore.name, activeStore.id).color,
                    borderColor: getStoreColor(activeStore.name, activeStore.id).borderColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = getStoreAccentColor(activeStore.name, activeStore.id).backgroundColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = getStoreColor(activeStore.name, activeStore.id).backgroundColor;
                  }}
                >
                  <Store className="h-3.5 w-3.5" strokeWidth={2} />
                  {activeStore.name}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Ingen butik vald
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Hantering av anamneser för vald butik</p>
          </div>
        </div>

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={reset}>
            <AnamnesisListView 
              showAdvancedFilters={true} 
              autoOpenDrivingLicenseExam={autoOpenDrivingLicenseExam}
              onDrivingLicenseExamOpened={() => setAutoOpenDrivingLicenseExam(null)}
            />
      </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
      </div>
    </>
  );
};

export default Dashboard;
