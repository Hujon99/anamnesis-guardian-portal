
/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 * Enhanced with better error handling, token persistence mechanisms,
 * and recovery options for token-related issues.
 * Now uses FormLayout to display sidebar for authenticated opticians.
 * Refactored into smaller, focused components for better maintainability.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";
import { useState, useEffect, useRef } from "react";
import { SubmissionError } from "@/hooks/useFormSubmission";
import { useToast } from "@/components/ui/use-toast";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { SubmissionMode } from "@/hooks/useFormSubmissionManager";
import { ErrorBoundary } from "react-error-boundary";
import FormLayout from "@/components/FormLayout";

// Import refactored components and utilities
import { 
  initializeToken, 
  DIRECT_FORM_TOKEN_KEY, 
  DIRECT_FORM_MODE_KEY 
} from "@/utils/opticianFormTokenUtils";
import { OpticianFormErrorFallback } from "@/components/OpticianForm/OpticianFormErrorFallback";
import { OpticianFormTokenError } from "@/components/OpticianForm/OpticianFormTokenError";
import { OpticianFormLoading } from "@/components/OpticianForm/OpticianFormLoadingStates";
import { useOpticianFormAuth } from "@/hooks/useOpticianFormAuth";
import OpticianFormHeader from "@/components/Optician/OpticianFormHeader";

const OpticianFormPage = () => {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get("token");
  const initialMode = searchParams.get("mode");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tokenError, setTokenError] = useState<SubmissionError | null>(null);
  
  // CRITICAL REFS - Use stable refs to prevent reinitialization
  const initCompletedRef = useRef<boolean>(false);
  const navigationInProgressRef = useRef<boolean>(false);
  const stableTokenRef = useRef<string | null>(null);
  const stableModeRef = useRef<string | null>(null);
  const instanceIdRef = useRef<string>(`form-page-${Math.random().toString(36).substring(2, 7)}`);
  
  // Set token and mode state - these are used for rendering only
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // ===== COMPONENT LIFECYCLE TRACKING =====
  useEffect(() => {
    console.log(`[OpticianFormPage/${instanceIdRef.current}]: Component mounted`);
    
    return () => {
      console.log(`[OpticianFormPage/${instanceIdRef.current}]: Component unmounting`);
    };
  }, []);

  // ===== TOKEN INITIALIZATION LOGIC - STRICT ONCE-ONLY =====
  useEffect(() => {
    // CRITICAL: Skip if we've already completed initialization
    if (initCompletedRef.current) {
      console.log(`[OpticianFormPage/${instanceIdRef.current}]: Token initialization already completed, skipping`);
      return;
    }
    
    // Mark initialization as completed immediately to prevent multiple runs
    initCompletedRef.current = true;
    
    const result = initializeToken(initialToken, initialMode, instanceIdRef.current);
    
    // Update refs and state if token was found
    if (result.token) {
      // Update stable refs (primary source of truth)
      stableTokenRef.current = result.token;
      stableModeRef.current = result.mode;
      
      // Update state for rendering (secondary/presentation)
      setToken(result.token);
      setMode(result.mode);
      
      // If URL doesn't match token, update URL (only if not navigating)
      if (initialToken !== result.token && !navigationInProgressRef.current) {
        console.log(`[OpticianFormPage/${instanceIdRef.current}]: URL needs updating with token: ${result.token.substring(0, 6)}...`);
        navigationInProgressRef.current = true;
        
        // Use replace to avoid navigation history issues
        navigate(`/optician-form?token=${result.token}&mode=${result.mode}`, { replace: true });
        
        // Reset navigation flag after delay
        setTimeout(() => {
          navigationInProgressRef.current = false;
        }, 100);
      }
    } else {
      console.log(`[OpticianFormPage/${instanceIdRef.current}]: No token found during initialization`);
    }
    
    // Signal initialization is complete
    setIsInitializing(false);
  }, []); // Empty dependency array - runs only once and never again

  // Handle token restoration from authentication
  const handleTokenRestore = (restoredToken: string, restoredMode: string) => {
    console.log(`[OpticianFormPage/${instanceIdRef.current}]: Token restored: ${restoredToken.substring(0, 6)}...`);
    
    // Update both state and ref to ensure consistency
    setToken(restoredToken);
    stableTokenRef.current = restoredToken;
    setMode(restoredMode);
    stableModeRef.current = restoredMode;
    
    // Save to regular localStorage
    localStorage.setItem(DIRECT_FORM_TOKEN_KEY, restoredToken);
    localStorage.setItem(DIRECT_FORM_MODE_KEY, restoredMode);
  };

  // Clerk should be available for optician mode (they must be logged in)
  // For patient mode with token, Clerk is not needed
  const clerkAvailable = (initialMode === "optician" || mode === "optician");
  
  // ===== AUTHENTICATION HANDLING =====
  const { isAuthLoaded, isSignedIn, isRedirecting } = useOpticianFormAuth({
    mode,
    token,
    isInitializing,
    onTokenRestore: handleTokenRestore,
    clerkAvailable
  });
  
  // ===== TOKEN VERIFICATION =====
  // Get effective token for verification (prioritize ref over state)
  const effectiveToken = stableTokenRef.current || token;
  const tokenVerification = useTokenVerification(effectiveToken);
  
  // Handler for submission errors
  const handleSubmissionError = (error: SubmissionError) => {
    console.error(`[OpticianFormPage/${instanceIdRef.current}]: Submission error:`, error);
    
    // Check if it's a JWT-related error which indicates token expiration
    if (error.message?.includes('JWT') || 
        error.message?.includes('token') || 
        error.message?.toLowerCase().includes('autentisering') ||
        error.status === 401) {
      setTokenError(error);
      
      toast({
        title: "Autentiseringsfel",
        description: "Din session har gått ut. Skapa ett nytt formulär för att fortsätta.",
        variant: "destructive",
      });
    }
  };
  
  // ===== ERROR HANDLING =====
  // If there's a token error or token verification returns an error, show a recovery UI
  const hasError = tokenError || (tokenVerification && tokenVerification.error);
  if (hasError) {
    const errorMessage = tokenVerification?.error || tokenError?.message || "Din session har gått ut";
    console.log(`[OpticianFormPage/${instanceIdRef.current}]: Showing error UI due to:`, errorMessage);
    
    return (
      <OpticianFormTokenError
        title="Sessionen har gått ut"
        message="Din session för detta formulär har gått ut. För att fortsätta behöver du skapa ett nytt formulär."
      />
    );
  }
  
  // ===== LOADING STATES =====
  // Show a loading state while waiting for initialization to complete
  if (isInitializing) {
    return <OpticianFormLoading message="Förbereder formulär..." />;
  }
  
  // Show a loading state while waiting for authentication to load
  if ((stableModeRef.current === "optician" || mode === "optician") && !isAuthLoaded) {
    return <OpticianFormLoading message="Kontrollerar behörighet..." />;
  }
  
  // No token available - show an error UI with recovery options
  if (!effectiveToken) {
    console.error(`[OpticianFormPage/${instanceIdRef.current}]: No token available to render form`);
    return (
      <OpticianFormTokenError
        title="Ingen åtkomsttoken"
        message="Ingen åtkomsttoken kunde hittas. För att fortsätta behöver du skapa ett nytt formulär."
      />
    );
  }
  
  // Handle loading state for token verification
  const isLoading = tokenVerification?.loading || tokenVerification?.formLoading;
  
  // Show a loading state while token verification is in progress
  if (isLoading) {
    console.log(`[OpticianFormPage/${instanceIdRef.current}]: Showing loading state during verification`);
    return <OpticianFormLoading message="Laddar formuläret..." />;
  }
  
  // Additional check for optician mode
  if ((stableModeRef.current === "optician" || mode === "optician") && isAuthLoaded && !isSignedIn) {
    console.log(`[OpticianFormPage/${instanceIdRef.current}]: In optician mode but not signed in`);
    return (
      <OpticianFormTokenError
        title="Inloggning krävs"
        message="Du måste vara inloggad för att fylla i ett formulär som optiker. Klicka på knappen nedan för att logga in."
        showDirectFormButton={false}
      />
    );
  }
  
  // For optician mode, the user must be authenticated
  if ((stableModeRef.current === "optician" || mode === "optician") && (!isAuthLoaded || !isSignedIn)) {
    return null; // Don't render anything until auth state is confirmed
  }
  
  // Ensure mode is properly typed as SubmissionMode
  const formMode: SubmissionMode = (stableModeRef.current === "optician" || mode === "optician") ? "optician" : "patient";
  
  console.log(`[OpticianFormPage/${instanceIdRef.current}]: Rendering form. mode: ${formMode}, token: ${effectiveToken?.substring(0, 6) || "missing"}...`);
  
  // Wrap in ErrorBoundary for better error handling and use FormLayout with clean layout (no sidebar/breadcrumbs)
  return (
    <FormLayout cleanLayout={true}>
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <OpticianFormHeader />
          <ErrorBoundary
            FallbackComponent={OpticianFormErrorFallback}
            onReset={() => {
              // Reset error boundary and reload the page
              window.location.reload();
            }}
          >
            <BaseFormPage 
              token={effectiveToken}
              mode={formMode}
              hideAutoSave={true}
              hideCopyLink={true}
              onError={handleSubmissionError}
            />
          </ErrorBoundary>
        </div>
      </div>
    </FormLayout>
  );
};

export default OpticianFormPage;
