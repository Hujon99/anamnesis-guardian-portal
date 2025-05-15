
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
  
  // Store token and mode in state to prevent loss during re-renders
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  
  // Add authentication state from Clerk
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Create a ref to prevent token from being lost during renders
  const tokenRef = useRef<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const initAttemptedRef = useRef<boolean>(false);
  const navigationInProgressRef = useRef<boolean>(false);
  
  // Log component mount for debugging
  useEffect(() => {
    console.log("[OpticianFormPage]: Component mounted");
    return () => {
      console.log("[OpticianFormPage]: Component unmounted");
      // Reset navigation flag on unmount to prevent stale references
      navigationInProgressRef.current = false;
    };
  }, []);

  // ===== TOKEN INITIALIZATION LOGIC =====
  // This effect runs once on component mount to initialize the token
  // It considers all possible token sources in order of priority
  useEffect(() => {
    // Skip if we've already attempted initialization
    if (initAttemptedRef.current) return;
    
    initAttemptedRef.current = true;
    console.log("[OpticianFormPage]: Initializing token...");
    
    const initializeToken = () => {
      // 1. First check URL params (highest priority)
      if (initialToken) {
        console.log("[OpticianFormPage]: Using token from URL params:", initialToken.substring(0, 6) + "...");
        setToken(initialToken);
        tokenRef.current = initialToken;
        
        // Also save to localStorage as a backup
        localStorage.setItem(DIRECT_FORM_TOKEN_KEY, initialToken);
        
        if (initialMode) {
          console.log("[OpticianFormPage]: Using mode from URL params:", initialMode);
          setMode(initialMode);
          modeRef.current = initialMode;
          localStorage.setItem(DIRECT_FORM_MODE_KEY, initialMode);
        } else {
          // Default to optician mode if not specified
          setMode('optician');
          modeRef.current = 'optician';
          localStorage.setItem(DIRECT_FORM_MODE_KEY, 'optician');
        }
        
        setIsInitializing(false);
        return true;
      }
      
      // 2. Check localStorage for direct form token (saved by DirectFormButton)
      const storedToken = localStorage.getItem(DIRECT_FORM_TOKEN_KEY);
      if (storedToken) {
        console.log("[OpticianFormPage]: Using token from localStorage:", storedToken.substring(0, 6) + "...");
        setToken(storedToken);
        tokenRef.current = storedToken;
        
        const storedMode = localStorage.getItem(DIRECT_FORM_MODE_KEY) || 'optician';
        console.log("[OpticianFormPage]: Using mode from localStorage:", storedMode);
        setMode(storedMode);
        modeRef.current = storedMode;
        
        // If found in localStorage but not in URL, update URL for better UX
        // Note: We're using a ref to track navigation to avoid multiple navigation attempts
        if (!navigationInProgressRef.current) {
          navigationInProgressRef.current = true;
          console.log("[OpticianFormPage]: Updating URL with token from localStorage");
          
          // Use setTimeout to delay navigation until after the current render cycle
          setTimeout(() => {
            navigate(`/optician-form?token=${storedToken}&mode=${storedMode}`, { replace: true });
            navigationInProgressRef.current = false;
          }, 0);
        }
        
        setIsInitializing(false);
        return true;
      }
      
      // 3. Check auth-specific localStorage (from post-authentication return)
      const authToken = localStorage.getItem(AUTH_SAVED_TOKEN_KEY);
      if (authToken) {
        console.log("[OpticianFormPage]: Using token from auth localStorage:", authToken.substring(0, 6) + "...");
        setToken(authToken);
        tokenRef.current = authToken;
        setMode('optician');
        modeRef.current = 'optician';
        
        // Clear auth storage to prevent reuse
        localStorage.removeItem(AUTH_SAVED_TOKEN_KEY);
        localStorage.removeItem(AUTH_RETURN_URL_KEY);
        
        // Also save to regular localStorage as backup
        localStorage.setItem(DIRECT_FORM_TOKEN_KEY, authToken);
        localStorage.setItem(DIRECT_FORM_MODE_KEY, 'optician');
        
        // Update URL for better UX, using the same navigation safety pattern
        if (!navigationInProgressRef.current) {
          navigationInProgressRef.current = true;
          console.log("[OpticianFormPage]: Updating URL with token from auth localStorage");
          
          // Use setTimeout to delay navigation until after the current render cycle
          setTimeout(() => {
            navigate(`/optician-form?token=${authToken}&mode=optician`, { replace: true });
            navigationInProgressRef.current = false;
          }, 0);
        }
        
        setIsInitializing(false);
        return true;
      }
      
      // If we get here, we couldn't find a token
      console.log("[OpticianFormPage]: No token found in any storage location");
      setIsInitializing(false);
      return false;
    };
    
    // Attempt to initialize token
    initializeToken();
  }, [initialToken, initialMode, navigate]);
  
  // Debug logging
  useEffect(() => {
    if (!isInitializing) {
      console.log("[OpticianFormPage]: Initialized with:", { 
        token: token ? `${token.substring(0, 6)}...` : "none", 
        tokenRef: tokenRef.current ? `${tokenRef.current.substring(0, 6)}...` : "none",
        mode, 
        debug,
        isAuthLoaded,
        isSignedIn
      });
    }
  }, [token, mode, debug, isAuthLoaded, isSignedIn, isInitializing]);

  // ===== AUTHENTICATION HANDLING =====
  // Handle redirecting to login if needed for optician authentication  
  useEffect(() => {
    // Only proceed if initialization is complete
    if (isInitializing) return;
    
    if (isAuthLoaded && !isSignedIn && mode === "optician" && !isRedirecting) {
      // If we're in optician mode but not signed in, we need to redirect to login
      // but save the current URL so we can come back later
      const currentUrl = window.location.href;
      console.log("[OpticianFormPage]: User not authenticated, redirecting to login");
      
      setIsRedirecting(true);
      
      // Store the current URL to return after login
      localStorage.setItem(AUTH_RETURN_URL_KEY, currentUrl);
      
      // Store the token separately for extra safety
      if (token) {
        localStorage.setItem(AUTH_SAVED_TOKEN_KEY, token);
      }
      
      // Use setTimeout to delay navigation until after render cycle
      setTimeout(() => {
        navigate("/sign-in");
      }, 0);
    }
  }, [isAuthLoaded, isSignedIn, mode, navigate, isRedirecting, token, isInitializing]);

  // Check if we're returning from authentication
  useEffect(() => {
    // Only run if initialization is complete
    if (isInitializing) return;
    
    // Only run if the user is now authenticated but we don't have a token in state
    if (isAuthLoaded && isSignedIn && !token) {
      const savedUrl = localStorage.getItem(AUTH_RETURN_URL_KEY);
      const savedToken = localStorage.getItem(AUTH_SAVED_TOKEN_KEY);
      
      console.log("[OpticianFormPage]: Checking for saved session data:", {
        hasSavedUrl: !!savedUrl,
        hasSavedToken: !!savedToken
      });
      
      if (savedUrl || savedToken) {
        console.log("[OpticianFormPage]: Returning from authentication");
        
        // Clear the stored data
        localStorage.removeItem(AUTH_RETURN_URL_KEY);
        localStorage.removeItem(AUTH_SAVED_TOKEN_KEY);
        
        let returnToken: string | null = null;
        let returnMode: string | null = "optician";
        
        // First try to extract parameters from the saved URL
        if (savedUrl) {
          try {
            const urlObj = new URL(savedUrl);
            returnToken = urlObj.searchParams.get("token");
            const urlMode = urlObj.searchParams.get("mode");
            if (urlMode) returnMode = urlMode;
          } catch (err) {
            console.error("[OpticianFormPage]: Error parsing saved URL:", err);
          }
        }
        
        // If we couldn't get the token from URL, use the separately saved token
        if (!returnToken && savedToken) {
          console.log("[OpticianFormPage]: Using saved token from localStorage");
          returnToken = savedToken;
        }
        
        if (returnToken) {
          console.log("[OpticianFormPage]: Restoring session with token:", returnToken.substring(0, 6) + "...");
          // Update both state and ref to ensure consistency
          setToken(returnToken);
          tokenRef.current = returnToken;
          setMode(returnMode);
          modeRef.current = returnMode;
          
          // Also save to regular localStorage
          localStorage.setItem(DIRECT_FORM_TOKEN_KEY, returnToken);
          localStorage.setItem(DIRECT_FORM_MODE_KEY, returnMode || 'optician');
          
          // Navigate to the same route but with the parameters restored
          if (!navigationInProgressRef.current) {
            navigationInProgressRef.current = true;
            setTimeout(() => {
              navigate(`/optician-form?token=${returnToken}&mode=${returnMode || "optician"}`, { replace: true });
              navigationInProgressRef.current = false;
            }, 0);
          }
        } else {
          // If we somehow lost the token, navigate back to dashboard
          console.error("[OpticianFormPage]: Failed to restore token, redirecting to dashboard");
          navigate("/dashboard");
        }
      }
    }
  }, [isAuthLoaded, isSignedIn, token, navigate, isInitializing]);
  
  // ===== TOKEN VERIFICATION =====
  // IMPORTANT: Always call useTokenVerification regardless of token state
  // to avoid React's "Rendered more hooks than during the previous render" error
  const tokenVerification = useTokenVerification(token);
  
  // Handler for submission errors
  const handleSubmissionError = (error: SubmissionError) => {
    console.error("[OpticianFormPage]: Submission error:", error);
    
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
    console.log("[OpticianFormPage]: Showing error UI due to:", errorMessage);
    
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
  if ((mode === "optician" && !isAuthLoaded) || isRedirecting) {
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
  if (!token && !tokenRef.current) {
    console.error("[OpticianFormPage]: No token available to render form");
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
    console.log("[OpticianFormPage]: Showing loading state while token verification completes");
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
  if (mode === "optician" && isAuthLoaded && !isSignedIn) {
    console.log("[OpticianFormPage]: In optician mode but not signed in");
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
  if (mode === "optician" && (!isAuthLoaded || !isSignedIn)) {
    return null; // Don't render anything until auth state is confirmed
  }
  
  // Ensure mode is properly typed as SubmissionMode
  const formMode: SubmissionMode = (mode === "optician") ? "optician" : "patient";
  
  // Use the token from ref as final fallback
  const effectiveToken = token || tokenRef.current;
  
  console.log("[OpticianFormPage]: Rendering form. mode:", formMode, "token:", effectiveToken ? `${effectiveToken.substring(0, 6)}...` : "missing");
  
  // Final null check before rendering
  if (!effectiveToken) {
    console.error("[OpticianFormPage]: Attempting to render form but token is still null");
    return (
      <Card className="w-full max-w-3xl mx-auto p-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-amber-100 p-4 rounded-full">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-amber-600">Token saknas</h2>
            <p className="text-gray-700 max-w-lg">
              Något gick fel vid laddning av formuläret. Vänligen försök igen.
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-md pt-4">
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
  
  // Wrap in ErrorBoundary for better error handling
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset error boundary and try to reload the page
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
