
/**
 * This component serves as the base for both patient and optician form pages.
 * It handles common functionality like token verification, loading states,
 * error handling, and form rendering, while allowing customization for
 * specific form types. Enhanced with improved error handling, better state
 * management, and clearer feedback during token verification issues.
 */

import React, { useState, useCallback, useEffect } from "react";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useFormSubmissionManager, SubmissionMode } from "@/hooks/useFormSubmissionManager";
import { useFormStateManager } from "@/hooks/useFormStateManager";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SubmissionError } from "@/hooks/useFormSubmission";
import { ErrorBoundary } from "react-error-boundary";

// Import status cards
import LoadingCard from "@/components/PatientForm/StatusCards/LoadingCard";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import ExpiredCard from "@/components/PatientForm/StatusCards/ExpiredCard";
import SubmittedCard from "@/components/PatientForm/StatusCards/SubmittedCard";
import OpticianSubmittedView from "@/components/Optician/OpticianSubmittedView";

// Import form components
import FormContainer from "@/components/PatientForm/FormContainer";
import BookingInfoCard from "@/components/PatientForm/BookingInfoCard";
import CopyLinkButton from "@/components/PatientForm/CopyLinkButton";
import AutoSaveIndicator from "@/components/PatientForm/AutoSaveIndicator";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Error fallback component for error boundary
const FormErrorFallback = ({ error, resetErrorBoundary }) => {
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
            {error.message || "Ett oväntat fel uppstod vid laddning av formuläret."}
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

interface BaseFormPageProps {
  token: string | null;
  mode: SubmissionMode;
  renderCustomContent?: (props: any) => React.ReactNode;
  renderCustomSubmissionError?: (props: any) => React.ReactNode;
  renderCustomSubmitted?: (props: any) => React.ReactNode;
  hideAutoSave?: boolean;
  hideCopyLink?: boolean;
  showBookingInfo?: boolean;
  onError?: (error: SubmissionError) => void;
}

export const BaseFormPage: React.FC<BaseFormPageProps> = ({
  token,
  mode,
  renderCustomContent,
  renderCustomSubmissionError,
  renderCustomSubmitted,
  hideAutoSave = false,
  hideCopyLink = false,
  showBookingInfo = false,
  onError
}) => {
  // Store current form values for auto-save and retry
  const [currentFormValues, setCurrentFormValues] = useState<Record<string, any> | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  // Track component mount for debugging purposes
  useEffect(() => {
    console.log(`[BaseFormPage]: Mounted with token: ${token ? token.substring(0, 6) + '...' : 'none'} and mode: ${mode}`);
    return () => {
      console.log("[BaseFormPage]: Unmounting");
    };
  }, [token, mode]);
  
  // If no token, show missing token error immediately
  if (!token) {
    return (
      <ErrorCard 
        error="Ingen åtkomsttoken hittades"
        errorCode="missing_token"
        diagnosticInfo="Token parameter saknas i URL:en eller i localStorage"
        onRetry={() => window.location.href = "/dashboard"}
      />
    );
  }
  
  // Use token verification hook with retry counter
  const { 
    loading, 
    formLoading,
    error: verificationError, 
    errorCode, 
    diagnosticInfo, 
    expired, 
    submitted,
    formTemplate,
    entryData,
    handleRetry: handleVerificationRetry,
    isFullyLoaded
  } = useTokenVerification(token);
  
  // Use form submission manager with onError handler
  const {
    isSubmitting,
    submissionError,
    isSubmitted,
    localSubmitted,
    submissionAttempts,
    handleFormSubmit,
    handleRetrySubmission,
    resetError
  } = useFormSubmissionManager({ 
    token, 
    mode,
    onSubmissionError: onError
  });
  
  // Use form state manager
  const {
    formPageState,
    isFormDataReady,
    setFormPageState
  } = useFormStateManager({
    loading,
    formLoading,
    verificationError,
    expired,
    submitted,
    isSubmitting,
    submissionError,
    isSubmitted,
    formTemplate,
    isFullyLoaded
  });
  
  // Setup auto-save functionality (patient mode only)
  const {
    lastSaved,
    isSaving,
    error: saveError,
    saveFormData
  } = useAutoSave({
    token,
    formData: currentFormValues,
    enabled: mode === 'patient' && formPageState === "FORM_READY" && !isSubmitted && !!token,
    formTemplate
  });
  
  // Handle form values change for auto-save
  const handleFormValuesChange = useCallback((values: Record<string, any>) => {
    setCurrentFormValues(values);
  }, []);
  
  // Enhanced retry handler with reset of all verification state
  const handleEnhancedRetry = useCallback(() => {
    console.log("[BaseFormPage]: Enhanced retry initiated");
    
    // Increment retry attempt counter to force clean remounting
    setRetryAttempt(prev => prev + 1);
    
    // After a small delay, trigger the verification retry
    setTimeout(() => {
      handleVerificationRetry();
    }, 100);
  }, [handleVerificationRetry]);
  
  // Handle form submission with form template
  const handleSubmitWithFormTemplate = useCallback(async (values: any, formattedAnswers?: any) => {
    if (!token) {
      console.error(`[BaseFormPage]: Cannot submit form: No token provided`);
      return;
    }
    
    console.log(`[BaseFormPage]: Submitting form with token: ${token.substring(0, 6) + "..."}`);
    setFormPageState("SUBMITTING");
    await handleFormSubmit(values, formTemplate, formattedAnswers);
  }, [token, handleFormSubmit, formTemplate, setFormPageState]);
  
  // Handle retry for submission errors
  const handleSubmissionRetry = useCallback(() => {
    console.log(`[BaseFormPage]: Retrying submission...`);
    
    // If in error state, reset error and update state
    if (formPageState === "SUBMISSION_ERROR") {
      resetError();
      setFormPageState("FORM_READY");
      
      // After a short delay to let the UI update, retry submission
      setTimeout(async () => {
        setFormPageState("SUBMITTING");
        const success = await handleRetrySubmission();
        
        if (!success) {
          console.log(`[BaseFormPage]: Retry submission failed`);
          setFormPageState("SUBMISSION_ERROR");
        } else {
          console.log(`[BaseFormPage]: Retry submission succeeded`);
        }
      }, 100);
    }
  }, [formPageState, resetError, handleRetrySubmission, setFormPageState]);
  
  // Extract data from entry
  const isMagicLink = entryData?.is_magic_link || false;
  const bookingId = entryData?.booking_id || null;
  const firstName = entryData?.first_name || null;
  const bookingDate = entryData?.booking_date || null;
  const storeId = entryData?.store_id || null;
  const createdByName = entryData?.created_by_name || null;
  
  // Log state transitions for debugging
  useEffect(() => {
    console.log(`[BaseFormPage]: State transition to: ${formPageState}`);
  }, [formPageState]);
  
  // Render different components based on form state
  switch (formPageState) {
    case "INITIAL_LOADING":
    case "LOADING_WITH_DATA":
      return (
        <LoadingCard 
          onRetry={handleEnhancedRetry} 
          minDisplayTime={2000}
          isFormDataReady={isFormDataReady} 
        />
      );
      
    case "TRANSITION":
      return (
        <LoadingCard 
          minDisplayTime={300}
          isFormDataReady={true} 
        />
      );
      
    case "ERROR":
      return (
        <ErrorCard 
          error={verificationError || "Ett okänt fel har uppstått"} 
          errorCode={errorCode} 
          diagnosticInfo={`Retry attempt: ${retryAttempt}, ${diagnosticInfo}`} 
          onRetry={handleEnhancedRetry} 
        />
      );
      
    case "SUBMISSION_ERROR":
      // Use custom error component if provided
      if (renderCustomSubmissionError) {
        return renderCustomSubmissionError({
          error: submissionError,
          onRetry: handleSubmissionRetry,
          onReturn: handleEnhancedRetry,
          submissionAttempts
        });
      }
      
      // Default error UI - with proper type casting for SubmissionError
      return (
        <Card className="w-full max-w-3xl mx-auto p-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-red-100 p-4 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-600">Formuläret kunde inte skickas in</h2>
            <p className="text-gray-700 max-w-lg">
              {submissionError?.message || "Ett oväntat fel uppstod vid inskickning av formuläret."}
            </p>
            
            {(submissionError as SubmissionError)?.details && (
              <div className="bg-gray-100 p-4 rounded-md text-sm max-w-lg w-full text-left">
                <p className="font-medium">Detaljer:</p>
                <p className="font-mono">{(submissionError as SubmissionError).details}</p>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-3 w-full max-w-md pt-4">
              {(submissionError as SubmissionError)?.recoverable && (
                <Button 
                  onClick={handleSubmissionRetry} 
                  className="flex-1"
                  disabled={submissionAttempts > 3}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Försök igen
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleEnhancedRetry} 
                className="flex-1"
              >
                Återgå till formuläret
              </Button>
            </div>
            
            {submissionAttempts > 3 && (
              <p className="text-sm text-amber-600">
                Vi har försökt flera gånger. Vänligen kontakta din optiker om problemet kvarstår.
              </p>
            )}
          </div>
        </Card>
      );
    
    case "EXPIRED":
      return <ExpiredCard />;
      
    case "SUBMITTED":
      // Use custom submitted component if provided
      if (renderCustomSubmitted) {
        return renderCustomSubmitted({ 
          mode,
          firstName,
          patientName: firstName
        });
      }
      
      // Default submitted view based on mode
      return mode === 'optician' ? <OpticianSubmittedView /> : <SubmittedCard />;
    
    case "SUBMITTING":
      return (
        <LoadingCard 
          minDisplayTime={800} 
          isFormDataReady={true} 
          message="Skickar in formulär..." 
        />
      );
      
    case "FORM_READY":
      // Use custom content if provided
      if (renderCustomContent) {
        return renderCustomContent({
          formTemplate,
          onSubmit: handleSubmitWithFormTemplate,
          isSubmitting,
          initialValues: currentFormValues,
          createdByName,
          onFormValuesChange: handleFormValuesChange,
          lastSaved,
          isSaving,
          mode,
          isMagicLink,
          firstName,
          bookingId,
          bookingDate,
          storeId
        });
      }
      
      // If no token, show error
      if (!token) {
        return (
          <ErrorCard 
            error="Ingen åtkomsttoken hittades i URL:en" 
            errorCode="missing_token"
            diagnosticInfo="Token parameter saknas i URL:en"
            onRetry={() => window.location.href = "/"}
          />
        );
      }
      
      // If no template, show error
      if (!formTemplate || !formTemplate.schema) {
        return (
          <ErrorCard 
            error="Kunde inte ladda formulärmallen korrekt" 
            errorCode="invalid_template"
            diagnosticInfo={`FormTemplate exists: ${!!formTemplate}, Schema exists: ${!!formTemplate?.schema}`}
            onRetry={handleEnhancedRetry}
          />
        );
      }
      
      // Add a key based on retry attempt to force full remounting
      const formKey = `form-${token}-${retryAttempt}`;
      
      // Default form UI
      return (
        <ErrorBoundary
          FallbackComponent={FormErrorFallback}
          onReset={() => {
            // Reset error boundary and retry loading
            handleEnhancedRetry();
          }}
        >
          <div className="space-y-4" key={formKey}>
            {/* Show info card for magic link entries */}
            {showBookingInfo && isMagicLink && (
              <BookingInfoCard 
                firstName={firstName}
                bookingId={bookingId}
                bookingDate={bookingDate}
                storeId={storeId}
              />
            )}
            
            <Card>
              <CardContent className="p-0">
                <FormContainer
                  formTemplate={formTemplate.schema}
                  onSubmit={handleSubmitWithFormTemplate}
                  isSubmitting={isSubmitting}
                  isOpticianMode={mode === 'optician'}
                  initialValues={currentFormValues}
                  createdByName={createdByName}
                  onFormValuesChange={handleFormValuesChange}
                />
              </CardContent>
              
              <CardFooter className="flex justify-between pt-0 pb-4 px-6">
                {!hideAutoSave && (
                  <AutoSaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
                )}
                {!hideCopyLink && (
                  <CopyLinkButton />
                )}
              </CardFooter>
            </Card>
          </div>
        </ErrorBoundary>
      );
  }
};
