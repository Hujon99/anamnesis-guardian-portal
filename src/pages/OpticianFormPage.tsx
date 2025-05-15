
/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 * Enhanced with better error handling and recovery options for token-related issues.
 * Implements a coordinated token verification and mode checking system to prevent
 * race conditions that cause redirection loops.
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

const OpticianFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const mode = searchParams.get("mode");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tokenError, setTokenError] = useState<SubmissionError | null>(null);
  
  // Add state variables for delayed mode check
  const [hasCheckedMode, setHasCheckedMode] = useState(false);
  const [paramMode, setParamMode] = useState<string | null>(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Refs to track verification process
  const tokenVerificationStartedRef = useRef(false);
  const mountTimeRef = useRef(Date.now());
  
  // Directly use the token verification hook to coordinate with mode checking
  // This will give us real-time information about token verification status
  const tokenVerification = token ? useTokenVerification(token) : null;
  
  // Debug log when component mounts
  useEffect(() => {
    console.log("[OpticianFormPage]: Initial mount with token:", token ? token.substring(0, 6) + "..." : "none");
    console.log("[OpticianFormPage]: Initial mode parameter:", mode);
    console.log("[OpticianFormPage]: Mount time:", new Date(mountTimeRef.current).toISOString());
  }, [token, mode]);
  
  // Mark when token verification has started
  useEffect(() => {
    if (token && tokenVerification) {
      tokenVerificationStartedRef.current = true;
      console.log("[OpticianFormPage]: Token verification process has started");
    }
  }, [token, tokenVerification]);
  
  // Monitor token verification status
  useEffect(() => {
    if (tokenVerification) {
      console.log("[OpticianFormPage]: Token verification status:", {
        loading: tokenVerification.loading,
        formLoading: tokenVerification.formLoading,
        error: tokenVerification.error,
        errorCode: tokenVerification.errorCode,
        expired: tokenVerification.expired,
        submitted: tokenVerification.submitted,
        isFullyLoaded: tokenVerification.isFullyLoaded,
        hasData: !!tokenVerification.entryData && !!tokenVerification.formTemplate
      });
    }
  }, [tokenVerification]);
  
  // Delayed check of the mode parameter - increased to 1000ms for better coordination
  useEffect(() => {
    // Use setTimeout to delay the mode check
    const timeoutId = setTimeout(() => {
      console.log("[OpticianFormPage]: Running delayed mode check, current mode:", searchParams.get("mode"));
      console.log("[OpticianFormPage]: Time since mount:", Date.now() - mountTimeRef.current, "ms");
      
      // Update state with the current URL parameter values
      const currentMode = searchParams.get("mode");
      setParamMode(currentMode);
      setHasCheckedMode(true);
      
      console.log("[OpticianFormPage]: Mode check completed, paramMode set to:", currentMode);
    }, 1000); // Increased to 1000ms delay to ensure token verification has time to start
    
    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [searchParams]);
  
  // Separate effect for redirection based on the delayed mode check
  // This now also takes into account token verification status
  useEffect(() => {
    // Only proceed with redirection if we've completed the delayed check 
    // AND we haven't already attempted a redirect
    if (hasCheckedMode && !redirectAttempted) {
      console.log("[OpticianFormPage]: Checking if redirect needed. paramMode:", paramMode);
      console.log("[OpticianFormPage]: Token verification started:", tokenVerificationStartedRef.current);
      console.log("[OpticianFormPage]: Time since mount:", Date.now() - mountTimeRef.current, "ms");
      
      // If explicitly NOT in optician mode, redirect to dashboard
      // Only redirect if paramMode is a non-null value that isn't "optician"
      if (paramMode !== null && paramMode !== "optician") {
        console.log("[OpticianFormPage]: Redirecting to dashboard. Mode is explicitly not 'optician'.");
        setRedirectAttempted(true);
        navigate("/dashboard");
      } else if (paramMode === "optician") {
        console.log("[OpticianFormPage]: No redirection needed. Mode is explicitly 'optician'.");
      } else {
        console.log("[OpticianFormPage]: Mode is null/undefined, not redirecting yet.");
      }
    }
  }, [hasCheckedMode, paramMode, navigate, redirectAttempted]);
  
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
  
  // Only render the form if:
  // 1. We've verified we're in optician mode, OR
  // 2. We haven't completed the check yet, OR
  // 3. Mode is null/undefined but we believe we're in the right place
  const isOpticianMode = paramMode === "optician" || !hasCheckedMode || paramMode === null;
  
  // Handle the case where token verification is ongoing but mode check has completed
  const isLoading = tokenVerification?.loading || tokenVerification?.formLoading;
  
  // Show a loading state while token verification is in progress
  if (isOpticianMode && isLoading && hasCheckedMode) {
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
  
  console.log("[OpticianFormPage]: Rendering form. isOpticianMode:", isOpticianMode);
  return isOpticianMode ? (
    <BaseFormPage 
      token={token}
      mode="optician"
      hideAutoSave={true}
      hideCopyLink={true}
      onError={handleSubmissionError}
    />
  ) : null;
};

export default OpticianFormPage;
