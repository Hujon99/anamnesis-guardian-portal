
/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 * Enhanced with better error handling and recovery options for token-related issues.
 * Includes a delayed mode check to prevent premature redirects from URL parameter timing issues.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";
import { useState, useEffect } from "react";
import { SubmissionError } from "@/hooks/useFormSubmission";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DirectFormButton } from "@/components/Optician/DirectFormButton";

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
  
  // Debug log when component mounts
  useEffect(() => {
    console.log("[OpticianFormPage]: Initial mount with token:", token ? token.substring(0, 6) + "..." : "none");
    console.log("[OpticianFormPage]: Initial mode parameter:", mode);
  }, [token, mode]);
  
  // Delayed check of the mode parameter
  useEffect(() => {
    // Use setTimeout to delay the mode check
    const timeoutId = setTimeout(() => {
      console.log("[OpticianFormPage]: Running delayed mode check, current mode:", searchParams.get("mode"));
      
      // Update state with the current URL parameter values
      const currentMode = searchParams.get("mode");
      setParamMode(currentMode);
      setHasCheckedMode(true);
      
      console.log("[OpticianFormPage]: Mode check completed, paramMode set to:", currentMode);
    }, 200); // 200ms delay
    
    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [searchParams]);
  
  // Separate effect for redirection based on the delayed mode check
  useEffect(() => {
    // Only proceed with redirection if we've completed the delayed check
    if (hasCheckedMode) {
      console.log("[OpticianFormPage]: Checking if redirect needed. paramMode:", paramMode);
      
      // If not in optician mode, redirect to dashboard
      if (paramMode !== "optician") {
        console.log("[OpticianFormPage]: Redirecting to dashboard. Mode is not 'optician'.");
        navigate("/dashboard");
      } else {
        console.log("[OpticianFormPage]: No redirection needed. Mode is 'optician'.");
      }
    }
  }, [hasCheckedMode, paramMode, navigate]);
  
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
  
  // If there's a token error, show a recovery UI
  if (tokenError) {
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
  
  // Only render the form if we've verified we're in optician mode
  // or if we haven't completed the check yet
  const isOpticianMode = paramMode === "optician" || !hasCheckedMode;
  
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
