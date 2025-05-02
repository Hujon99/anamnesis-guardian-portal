/**
 * This component serves as the base for both patient and optician form pages.
 * It handles common functionality like token verification, loading states,
 * error handling, and form rendering, while allowing customization for
 * specific form types.
 * Updated to use the more reliable submission approach that works for both
 * patient and optician forms.
 */

import React, { useState, useCallback } from "react";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useFormStateManager } from "@/hooks/useFormStateManager";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useFormSubmissionSelector, SubmissionError } from "@/hooks/useFormSubmissionSelector";
import { SubmissionMode } from "@/hooks/useUnifiedFormSubmission";

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
import { RefreshCw } from "lucide-react";

interface BaseFormPageProps {
  token: string | null;
  mode: SubmissionMode;
  renderCustomContent?: (props: any) => React.ReactNode;
  renderCustomSubmissionError?: (props: any) => React.ReactNode;
  renderCustomSubmitted?: (props: any) => React.ReactNode;
  hideAutoSave?: boolean;
  hideCopyLink?: boolean;
  showBookingInfo?: boolean;
  useUnifiedSubmission?: boolean; // Default will be changed to true
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
  useUnifiedSubmission = true // This is now true by default
}) => {
  console.log(`[BaseFormPage]: Initializing with mode=${mode}, token=${token?.substring(0, 6)}..., useUnifiedSubmission=${useUnifiedSubmission}`);
  
  // Store current form values for auto-save and retry
  const [currentFormValues, setCurrentFormValues] = useState<Record<string, any> | null>(null);
  
  // Use token verification hook
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
  
  // Use form submission selector hook
  const {
    isSubmitting,
    isSubmitted,
    error: submissionError,
    submissionAttempts,
    handleFormSubmit,
    handleRetrySubmission,
    resetError
  } = useFormSubmissionSelector({ 
    token, 
    mode,
    useUnifiedHook: useUnifiedSubmission // Always use our unified submission
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
    console.log(`[BaseFormPage]: Form values changed, mode=${mode}`);
    setCurrentFormValues(values);
  }, [mode]);
  
  // Handle form submission with form template and formatted answers
  const handleSubmitWithFormTemplate = useCallback(async (values: any, formattedAnswers?: any) => {
    if (!token) {
      console.error(`[BaseFormPage]: Cannot submit form: No token provided`);
      return;
    }
    console.log(`[BaseFormPage]: Submitting form with token:`, token.substring(0, 6) + "...");
    console.log(`[BaseFormPage]: Formatted answers provided:`, !!formattedAnswers);
    console.log(`[BaseFormPage]: Current form state:`, formPageState);
    
    // Only change state if we're not already submitting
    if (formPageState !== "SUBMITTING") {
      setFormPageState("SUBMITTING");
    }
    
    try {
      await handleFormSubmit(values, formTemplate, formattedAnswers);
    } catch (error) {
      console.error("[BaseFormPage]: Submission error in handleSubmitWithFormTemplate:", error);
      // The submission hook will handle setting error state
    }
  }, [token, handleFormSubmit, formTemplate, setFormPageState, formPageState]);
  
  // Handle retry for submission errors
  const handleSubmissionRetry = useCallback(() => {
    console.log(`[BaseFormPage]: Retrying submission...`);
    
    // If in error state, reset error and update state
    if (formPageState === "SUBMISSION_ERROR") {
      resetError();
      
      // Set submitting state
      setFormPageState("SUBMITTING");
      
      // After a short delay to let the UI update, retry submission
      setTimeout(async () => {
        try {
          const success = await handleRetrySubmission();
          
          if (!success) {
            console.log(`[BaseFormPage]: Retry submission failed`);
            setFormPageState("SUBMISSION_ERROR");
          } else {
            console.log(`[BaseFormPage]: Retry submission succeeded`);
          }
        } catch (error) {
          console.error("[BaseFormPage]: Error during retry:", error);
          setFormPageState("SUBMISSION_ERROR");
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
  
  // Render different components based on form state
  console.log(`[BaseFormPage/RENDER]: About to render with state: ${formPageState} and mode: ${mode}`);
  
  switch (formPageState) {
    case "INITIAL_LOADING":
    case "LOADING_WITH_DATA":
      return (
        <LoadingCard 
          onRetry={handleVerificationRetry} 
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
          diagnosticInfo={diagnosticInfo} 
          onRetry={handleVerificationRetry} 
        />
      );
      
    case "SUBMISSION_ERROR":
      // Use custom error component if provided
      if (renderCustomSubmissionError) {
        return renderCustomSubmissionError({
          error: submissionError,
          onRetry: handleSubmissionRetry,
          onReturn: handleVerificationRetry,
          submissionAttempts
        });
      }
      
      // Default error UI - with proper type casting for SubmissionError
      return (
        <Card className="w-full max-w-3xl mx-auto p-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-red-100 p-4 rounded-full">
              <RefreshCw className="h-8 w-8 text-red-500" />
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
                onClick={handleVerificationRetry} 
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
            onRetry={handleVerificationRetry}
          />
        );
      }
      
      // Default form UI
      return (
        <div className="space-y-4">
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
      );
  }
};
