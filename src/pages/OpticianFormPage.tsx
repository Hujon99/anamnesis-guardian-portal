
/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 * Enhanced with better error handling and recovery options for token-related issues.
 * Handles its own authentication checks to prevent token loss during redirection.
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

const OpticianFormPage = () => {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get("token");
  const initialMode = searchParams.get("mode");
  const debug = searchParams.get("debug");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tokenError, setTokenError] = useState<SubmissionError | null>(null);
  
  // Store token and mode in state to prevent loss during re-renders
  const [token, setToken] = useState<string | null>(initialToken);
  const [mode, setMode] = useState<string | null>(initialMode);
  
  // Add authentication state from Clerk
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Create a ref to prevent token from being lost during renders
  const tokenRef = useRef<string | null>(initialToken);
  
  // Ensure the token is preserved throughout the component lifecycle
  useEffect(() => {
    if (initialToken) {
      console.log("[OpticianFormPage]: Initializing with token:", initialToken.substring(0, 6) + "...");
      setToken(initialToken);
      tokenRef.current = initialToken;
    } else {
      console.log("[OpticianFormPage]: No initial token provided");
    }
    
    if (initialMode) {
      console.log("[OpticianFormPage]: Initializing with mode:", initialMode);
      setMode(initialMode);
    }
  }, [initialToken, initialMode]);

  // Debug logging
  useEffect(() => {
    console.log("[OpticianFormPage]: Component mounted with params:", { 
      token: token ? `${token.substring(0, 6)}...` : "none", 
      tokenRef: tokenRef.current ? `${tokenRef.current.substring(0, 6)}...` : "none",
      initialToken: initialToken ? `${initialToken.substring(0, 6)}...` : "none",
      mode, 
      debug,
      isAuthLoaded,
      isSignedIn
    });
  }, [token, mode, debug, isAuthLoaded, isSignedIn, initialToken]);

  // Directly use the token verification hook to check token validity
  // Use the ref value to ensure consistent token throughout component lifecycle
  const tokenVerification = tokenRef.current ? useTokenVerification(tokenRef.current) : null;
  
  // Handle redirecting to login if needed for optician authentication
  useEffect(() => {
    if (isAuthLoaded && !isSignedIn && mode === "optician" && !isRedirecting) {
      // If we're in optician mode but not signed in, we need to redirect to login
      // but save the current URL so we can come back later
      const currentUrl = window.location.href;
      console.log("[OpticianFormPage]: User not authenticated, redirecting to login");
      
      setIsRedirecting(true);
      
      // Store the current URL to return after login
      localStorage.setItem("opticianFormReturnUrl", currentUrl);
      
      // Store the token separately for extra safety
      if (tokenRef.current) {
        localStorage.setItem("opticianFormToken", tokenRef.current);
      }
      
      // Redirect to sign in
      navigate("/sign-in");
    }
  }, [isAuthLoaded, isSignedIn, mode, navigate, isRedirecting]);

  // Check if we're returning from authentication
  useEffect(() => {
    // Only run if the user is now authenticated
    if (isAuthLoaded && isSignedIn && !token) {
      const savedUrl = localStorage.getItem("opticianFormReturnUrl");
      const savedToken = localStorage.getItem("opticianFormToken");
      
      console.log("[OpticianFormPage]: Checking for saved session data:", {
        hasSavedUrl: !!savedUrl,
        hasSavedToken: !!savedToken
      });
      
      if (savedUrl || savedToken) {
        console.log("[OpticianFormPage]: Returning from authentication");
        
        // Clear the stored data
        localStorage.removeItem("opticianFormReturnUrl");
        localStorage.removeItem("opticianFormToken");
        
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
          
          // Navigate to the same route but with the parameters restored
          navigate(`/optician-form?token=${returnToken}&mode=${returnMode || "optician"}`, { replace: true });
        } else {
          // If we somehow lost the token, navigate back to dashboard
          console.error("[OpticianFormPage]: Failed to restore token, redirecting to dashboard");
          navigate("/dashboard");
        }
      }
    }
  }, [isAuthLoaded, isSignedIn, token, navigate]);
  
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
  
  // No token available - show an error UI
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
  
  console.log("[OpticianFormPage]: Rendering form. mode:", mode, "token:", effectiveToken ? `${effectiveToken.substring(0, 6)}...` : "missing");
  
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
  
  return (
    <BaseFormPage 
      token={effectiveToken}
      mode={formMode}
      hideAutoSave={true}
      hideCopyLink={true}
      onError={handleSubmissionError}
    />
  );
};

export default OpticianFormPage;
