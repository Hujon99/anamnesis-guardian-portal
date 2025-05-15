
/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 * Enhanced with better error handling, token persistence mechanisms,
 * and recovery options for token-related issues.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";
import { useState, useEffect, useRef } from "react";
import { SubmissionError } from "@/hooks/useFormSubmission";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DirectFormButton } from "@/components/Optician/DirectFormButton";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useAuth } from "@clerk/clerk-react";
import { SubmissionMode } from "@/hooks/useFormSubmissionManager";
import { ErrorBoundary } from "react-error-boundary";

// Constants for localStorage keys
const DIRECT_FORM_TOKEN_KEY = 'opticianDirectFormToken';
const DIRECT_FORM_MODE_KEY = 'opticianDirectFormMode';
const AUTH_RETURN_URL_KEY = 'opticianFormReturnUrl';
const AUTH_SAVED_TOKEN_KEY = 'opticianFormToken';

// Error fallback component for error boundary
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const navigate = useNavigate();
  
  return (
    <Card className="w-full max-w-3xl mx-auto p-6">
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-600">Ett fel har uppstått</h2>
          <p className="text-gray-700 max-w-lg">
            {error.message || "Ett oväntat fel uppstod vid laddning av sidan."}
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-md pt-4">
            <Button 
              onClick={resetErrorBoundary}
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Försök igen
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="w-full"
            >
              Återgå till dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const OpticianFormPage = () => {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get("token");
  const initialMode = searchParams.get("mode");
  const debug = searchParams.get("debug");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tokenError, setTokenError] = useState<SubmissionError | null>(null);
  
  // Add authentication state from Clerk
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // CRITICAL REFS - Use stable refs to prevent reinitialization
  const initCompletedRef = useRef<boolean>(false);
  const navigationInProgressRef = useRef<boolean>(false);
  const stableTokenRef = useRef<string | null>(null);
  const stableModeRef = useRef<string | null>(null);
  const instanceIdRef = useRef<string>(`form-page-${Math.random().toString(36).substring(2, 7)}`);
  
  // Set token and mode state - these are used for rendering only
  // The refs are the source of truth for functionality
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);

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
    console.log(`[OpticianFormPage/${instanceIdRef.current}]: Initializing token (one-time only)...`);
    
    // TOKEN PRIORITY:
    // 1. URL params (highest priority)
    // 2. localStorage direct form token
    // 3. localStorage auth saved token
    let resultToken = null;
    let resultMode = 'optician'; // Default mode

    if (initialToken) {
      // 1. URL params take highest priority
      console.log(`[OpticianFormPage/${instanceIdRef.current}]: Using token from URL params: ${initialToken.substring(0, 6)}...`);
      resultToken = initialToken;
      
      // Also save to localStorage as backup
      localStorage.setItem(DIRECT_FORM_TOKEN_KEY, initialToken);
      
      if (initialMode) {
        resultMode = initialMode;
        localStorage.setItem(DIRECT_FORM_MODE_KEY, initialMode);
      } else {
        localStorage.setItem(DIRECT_FORM_MODE_KEY, 'optician');
      }
    } 
    else {
      // 2. Check localStorage for token
      const storedToken = localStorage.getItem(DIRECT_FORM_TOKEN_KEY);
      
      if (storedToken) {
        console.log(`[OpticianFormPage/${instanceIdRef.current}]: Using token from localStorage: ${storedToken.substring(0, 6)}...`);
        resultToken = storedToken;
        
        const storedMode = localStorage.getItem(DIRECT_FORM_MODE_KEY) || 'optician';
        resultMode = storedMode;
      } 
      else {
        // 3. Last resort - check auth-specific localStorage
        const authToken = localStorage.getItem(AUTH_SAVED_TOKEN_KEY);
        
        if (authToken) {
          console.log(`[OpticianFormPage/${instanceIdRef.current}]: Using token from auth localStorage: ${authToken.substring(0, 6)}...`);
          resultToken = authToken;
          resultMode = 'optician';
          
          // Clear auth storage to prevent reuse
          localStorage.removeItem(AUTH_SAVED_TOKEN_KEY);
          localStorage.removeItem(AUTH_RETURN_URL_KEY);
          
          // Save to regular localStorage
          localStorage.setItem(DIRECT_FORM_TOKEN_KEY, authToken);
          localStorage.setItem(DIRECT_FORM_MODE_KEY, 'optician');
        }
      }
    }
    
    // Update refs and state if token was found
    if (resultToken) {
      // Update stable refs (primary source of truth)
      stableTokenRef.current = resultToken;
      stableModeRef.current = resultMode;
      
      // Update state for rendering (secondary/presentation)
      setToken(resultToken);
      setMode(resultMode);
      
      // If URL doesn't match token, update URL (only if not navigating)
      if (initialToken !== resultToken && !navigationInProgressRef.current) {
        console.log(`[OpticianFormPage/${instanceIdRef.current}]: URL needs updating with token: ${resultToken.substring(0, 6)}...`);
        navigationInProgressRef.current = true;
        
        // Use replace to avoid navigation history issues
        navigate(`/optician-form?token=${resultToken}&mode=${resultMode}`, { replace: true });
        
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

  // ===== AUTHENTICATION HANDLING =====
  useEffect(() => {
    // Only proceed if initialization is complete and not already redirecting
    if (isInitializing || isRedirecting) return;
    
    // Get effective values using refs (most stable source)
    const effectiveMode = stableModeRef.current || mode || 'optician';
    
    if (isAuthLoaded && !isSignedIn && effectiveMode === "optician") {
      // Handle non-authenticated users for optician mode
      console.log(`[OpticianFormPage/${instanceIdRef.current}]: User not authenticated, redirecting to login`);
      
      // Prevent multiple redirects
      setIsRedirecting(true);
      
      // Store the current URL to return after login
      const currentUrl = window.location.href;
      localStorage.setItem(AUTH_RETURN_URL_KEY, currentUrl);
      
      // Store token separately for extra safety
      const effectiveToken = stableTokenRef.current || token;
      if (effectiveToken) {
        localStorage.setItem(AUTH_SAVED_TOKEN_KEY, effectiveToken);
      }
      
      // Redirect with replace to avoid history issues
      navigate("/sign-in", { replace: true });
    }
  }, [isAuthLoaded, isSignedIn, mode, navigate, isRedirecting, token, isInitializing]);

  // Check if returning from authentication
  useEffect(() => {
    // Only run if initialization is complete and not already processing
    if (isInitializing || navigationInProgressRef.current) return;
    
    // Only run if the user is now authenticated but we don't have a token in state
    const effectiveToken = stableTokenRef.current || token;
    
    if (isAuthLoaded && isSignedIn && !effectiveToken) {
      const savedUrl = localStorage.getItem(AUTH_RETURN_URL_KEY);
      const savedToken = localStorage.getItem(AUTH_SAVED_TOKEN_KEY);
      
      console.log(`[OpticianFormPage/${instanceIdRef.current}]: Checking for saved session data:`, {
        hasSavedUrl: !!savedUrl,
        hasSavedToken: !!savedToken
      });
      
      if (savedUrl || savedToken) {
        console.log(`[OpticianFormPage/${instanceIdRef.current}]: Returning from authentication`);
        
        // Clear the stored data
        localStorage.removeItem(AUTH_RETURN_URL_KEY);
        localStorage.removeItem(AUTH_SAVED_TOKEN_KEY);
        
        let returnToken: string | null = null;
        let returnMode: string | null = "optician";
        
        // Extract parameters from the saved URL if available
        if (savedUrl) {
          try {
            const urlObj = new URL(savedUrl);
            returnToken = urlObj.searchParams.get("token");
            const urlMode = urlObj.searchParams.get("mode");
            if (urlMode) returnMode = urlMode;
          } catch (err) {
            console.error(`[OpticianFormPage/${instanceIdRef.current}]: Error parsing saved URL:`, err);
          }
        }
        
        // If we couldn't get the token from URL, use the separately saved token
        if (!returnToken && savedToken) {
          console.log(`[OpticianFormPage/${instanceIdRef.current}]: Using saved token from localStorage`);
          returnToken = savedToken;
        }
        
        if (returnToken) {
          console.log(`[OpticianFormPage/${instanceIdRef.current}]: Restoring session with token: ${returnToken.substring(0, 6)}...`);
          
          // Update both state and ref to ensure consistency
          setToken(returnToken);
          stableTokenRef.current = returnToken;
          setMode(returnMode);
          stableModeRef.current = returnMode;
          
          // Save to regular localStorage
          localStorage.setItem(DIRECT_FORM_TOKEN_KEY, returnToken);
          localStorage.setItem(DIRECT_FORM_MODE_KEY, returnMode || 'optician');
          
          // Update URL to match token
          navigationInProgressRef.current = true;
          navigate(`/optician-form?token=${returnToken}&mode=${returnMode}`, { replace: true });
          
          // Reset navigation flag after delay
          setTimeout(() => {
            navigationInProgressRef.current = false;
          }, 100);
        } else {
          // If we lost the token, navigate back to dashboard
          console.error(`[OpticianFormPage/${instanceIdRef.current}]: Failed to restore token, redirecting to dashboard`);
          navigate("/dashboard");
        }
      }
    }
  }, [isAuthLoaded, isSignedIn, token, navigate, isInitializing]);
  
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
      <Card className="w-full max-w-3xl mx-auto p-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-amber-100 p-4 rounded-full">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-amber-600">Sessionen har gått ut</h2>
            <p className="text-gray-700 max-w-lg">
              Din session för detta formulär har gått ut. För att fortsätta behöver du skapa ett nytt formulär.
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-md pt-4">
              <DirectFormButton />
              
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Återgå till dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // ===== LOADING STATES =====
  // Show a loading state while waiting for initialization to complete
  if (isInitializing) {
    return (
      <Card className="w-full max-w-3xl mx-auto p-6">
        <CardContent className="space-y-6 pt-6 flex flex-col items-center justify-center">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="h-12 w-12 bg-primary/20 rounded-full"></div>
            <div className="h-4 w-48 bg-primary/20 rounded"></div>
            <div className="h-3 w-64 bg-gray-200 rounded"></div>
          </div>
          <p className="text-gray-500 text-center mt-4">
            Förbereder formulär...
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Show a loading state while waiting for authentication to load
  if ((stableModeRef.current === "optician" || mode === "optician") && !isAuthLoaded) {
    return (
      <Card className="w-full max-w-3xl mx-auto p-6">
        <CardContent className="space-y-6 pt-6 flex flex-col items-center justify-center">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="h-12 w-12 bg-primary/20 rounded-full"></div>
            <div className="h-4 w-48 bg-primary/20 rounded"></div>
            <div className="h-3 w-64 bg-gray-200 rounded"></div>
          </div>
          <p className="text-gray-500 text-center mt-4">
            Kontrollerar behörighet...
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // No token available - show an error UI with recovery options
  if (!effectiveToken) {
    console.error(`[OpticianFormPage/${instanceIdRef.current}]: No token available to render form`);
    return (
      <Card className="w-full max-w-3xl mx-auto p-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-amber-100 p-4 rounded-full">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-amber-600">Ingen åtkomsttoken</h2>
            <p className="text-gray-700 max-w-lg">
              Ingen åtkomsttoken kunde hittas. För att fortsätta behöver du skapa ett nytt formulär.
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-md pt-4">
              <DirectFormButton />
              
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Återgå till dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Handle loading state for token verification
  const isLoading = tokenVerification?.loading || tokenVerification?.formLoading;
  
  // Show a loading state while token verification is in progress
  if (isLoading) {
    console.log(`[OpticianFormPage/${instanceIdRef.current}]: Showing loading state during verification`);
    return (
      <Card className="w-full max-w-3xl mx-auto p-6">
        <CardContent className="space-y-6 pt-6 flex flex-col items-center justify-center">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="h-12 w-12 bg-primary/20 rounded-full"></div>
            <div className="h-4 w-48 bg-primary/20 rounded"></div>
            <div className="h-3 w-64 bg-gray-200 rounded"></div>
          </div>
          <p className="text-gray-500 text-center mt-4">
            Laddar formuläret...
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Additional check for optician mode
  if ((stableModeRef.current === "optician" || mode === "optician") && isAuthLoaded && !isSignedIn) {
    console.log(`[OpticianFormPage/${instanceIdRef.current}]: In optician mode but not signed in`);
    return (
      <Card className="w-full max-w-3xl mx-auto p-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-amber-100 p-4 rounded-full">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-amber-600">Inloggning krävs</h2>
            <p className="text-gray-700 max-w-lg">
              Du måste vara inloggad för att fylla i ett formulär som optiker. Klicka på knappen nedan för att logga in.
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-md pt-4">
              <Button 
                onClick={() => navigate("/sign-in")}
                className="w-full"
              >
                Logga in
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Återgå till dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // For optician mode, the user must be authenticated
  if ((stableModeRef.current === "optician" || mode === "optician") && (!isAuthLoaded || !isSignedIn)) {
    return null; // Don't render anything until auth state is confirmed
  }
  
  // Ensure mode is properly typed as SubmissionMode
  const formMode: SubmissionMode = (stableModeRef.current === "optician" || mode === "optician") ? "optician" : "patient";
  
  console.log(`[OpticianFormPage/${instanceIdRef.current}]: Rendering form. mode: ${formMode}, token: ${effectiveToken?.substring(0, 6) || "missing"}...`);
  
  // Wrap in ErrorBoundary for better error handling
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
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
  );
};

export default OpticianFormPage;
