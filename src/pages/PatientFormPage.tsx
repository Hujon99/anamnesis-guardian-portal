
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 * Enhanced to support magic links, auto-saving functionality, and smooth transitions
 * between loading and form display using a state machine approach to prevent flashing.
 */

import { useSearchParams } from "react-router-dom";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEffect, useState, useCallback, useRef } from "react";
import LoadingCard from "@/components/PatientForm/StatusCards/LoadingCard";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import ExpiredCard from "@/components/PatientForm/StatusCards/ExpiredCard";
import SubmittedCard from "@/components/PatientForm/StatusCards/SubmittedCard";
import FormContainer from "@/components/PatientForm/FormContainer";
import BookingInfoCard from "@/components/PatientForm/BookingInfoCard";
import CopyLinkButton from "@/components/PatientForm/CopyLinkButton";
import AutoSaveIndicator from "@/components/PatientForm/AutoSaveIndicator";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// Define a form state enum for better state management
type FormPageState = 
  | "INITIAL_LOADING" 
  | "ERROR" 
  | "EXPIRED" 
  | "SUBMITTED" 
  | "FORM_READY"
  | "SUBMITTING";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [currentFormValues, setCurrentFormValues] = useState<Record<string, any> | null>(null);
  const [formPageState, setFormPageState] = useState<FormPageState>("INITIAL_LOADING");
  
  // Track if initial rendering has occurred to avoid flashing
  const initialRenderComplete = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  
  // Enhanced debugging
  useEffect(() => {
    console.log("PatientFormPage rendered with token:", token ? `${token.substring(0, 6)}...` : 'null');
    console.log("Current form page state:", formPageState);
    console.log("Current path:", window.location.pathname);
    console.log("Complete URL:", window.location.href);
    console.log("Search params:", Object.fromEntries([...searchParams.entries()]));
  }, [token, searchParams, formPageState]);
  
  // Use custom hooks to handle token verification and form submission
  const { 
    loading, 
    formLoading,
    error, 
    errorCode, 
    diagnosticInfo, 
    expired, 
    submitted,
    formTemplate,
    entryData,
    handleRetry,
    isFullyLoaded
  } = useTokenVerification(token);
  
  // Determine the form page state based on verification results
  useEffect(() => {
    // Clear any pending timeouts to avoid race conditions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    if (loading || formLoading) {
      setFormPageState("INITIAL_LOADING");
      return;
    }
    
    if (error) {
      setFormPageState("ERROR");
      return;
    }
    
    if (expired) {
      setFormPageState("EXPIRED");
      return;
    }
    
    if (submitted) {
      setFormPageState("SUBMITTED");
      return;
    }
    
    if (isFullyLoaded && formTemplate) {
      // Add a small delay before showing the form to ensure smooth transition
      // and prevent rapid state changes causing flashing
      transitionTimeoutRef.current = window.setTimeout(() => {
        setFormPageState("FORM_READY");
        initialRenderComplete.current = true;
      }, 300);
    }
    
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [loading, formLoading, error, expired, submitted, isFullyLoaded, formTemplate]);
  
  const { 
    isSubmitting, 
    error: submissionError, 
    isSubmitted, 
    submitForm 
  } = useFormSubmission();

  // Update form state when submission starts
  useEffect(() => {
    if (isSubmitting) {
      setFormPageState("SUBMITTING");
    } else if (isSubmitted) {
      setFormPageState("SUBMITTED");
    } else if (submissionError && formPageState === "SUBMITTING") {
      setFormPageState("ERROR");
    }
  }, [isSubmitting, isSubmitted, submissionError, formPageState]);

  // Setup auto-save functionality
  const {
    lastSaved,
    isSaving,
    error: saveError,
    saveFormData
  } = useAutoSave({
    token,
    formData: currentFormValues,
    enabled: formPageState === "FORM_READY" && !isSubmitted && !!token,
    formTemplate
  });

  // Extract magic link info from entry data
  const isMagicLink = entryData?.is_magic_link || false;
  const bookingId = entryData?.booking_id || null;
  const firstName = entryData?.first_name || null;
  const bookingDate = entryData?.booking_date || null;
  const storeId = entryData?.store_id || null;
  
  // Add additional debug logging for the form template
  useEffect(() => {
    if (formTemplate) {
      console.log("PatientFormPage: Template schema sections count:", formTemplate.schema?.sections?.length || 0);
    }
  }, [formTemplate]);

  // Handle form values change for auto-save - memoized to prevent unnecessary re-renders
  const handleFormValuesChange = useCallback((values: Record<string, any>) => {
    setCurrentFormValues(values);
  }, []);

  // Handle form submission with form template - memoized to prevent unnecessary re-renders
  const handleFormSubmit = useCallback(async (values: any, formattedAnswers?: any) => {
    if (!token) {
      console.error("Cannot submit form: No token provided");
      return;
    }
    console.log("Submitting form with token:", token.substring(0, 6) + "...");
    setFormPageState("SUBMITTING");
    await submitForm(token, values, formTemplate?.schema, formattedAnswers);
  }, [token, submitForm, formTemplate?.schema]);

  // Get the responsible optician's name
  const createdByName = entryData?.created_by_name || null;

  // Render different components based on form page state
  switch (formPageState) {
    case "INITIAL_LOADING":
      return <LoadingCard onRetry={handleRetry} minDisplayTime={800} />;
      
    case "ERROR":
      return (
        <ErrorCard 
          error={submissionError?.message || error} 
          errorCode={errorCode} 
          diagnosticInfo={diagnosticInfo} 
          onRetry={handleRetry} 
        />
      );
      
    case "EXPIRED":
      return <ExpiredCard />;
      
    case "SUBMITTED":
    case "SUBMITTING":
      if (isSubmitting) {
        return <LoadingCard />;
      }
      return <SubmittedCard />;
      
    case "FORM_READY":
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
      
      // Form display state - show only when fully ready
      return (
        <div className="space-y-4">
          {/* Show info card for magic link entries */}
          {isMagicLink && (
            <BookingInfoCard 
              firstName={firstName}
              bookingId={bookingId}
              bookingDate={bookingDate}
              storeId={storeId}
            />
          )}
          
          <Card>
            <CardContent className="p-0">
              {formTemplate && (
                <FormContainer
                  formTemplate={formTemplate.schema}
                  onSubmit={handleFormSubmit}
                  isSubmitting={isSubmitting}
                  createdByName={createdByName}
                  onFormValuesChange={handleFormValuesChange}
                />
              )}
            </CardContent>
            
            <CardFooter className="flex justify-between pt-0 pb-4 px-6">
              <AutoSaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
              <CopyLinkButton />
            </CardFooter>
          </Card>
        </div>
      );
  }
};

export default PatientFormPage;
