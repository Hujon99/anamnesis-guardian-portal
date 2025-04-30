
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
  | "LOADING_WITH_DATA"
  | "TRANSITION"
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
  
  // Track transition timing to prevent flashing
  const initialRenderComplete = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const formDataReadyRef = useRef(false);
  const forcedTransitionTimeoutRef = useRef<number | null>(null);
  const stateChangeTimeRef = useRef<number>(Date.now());
  
  // Add circuit breaker for stuck loading states
  const maxLoadingTimeRef = useRef<number | null>(null);
  const maxLoadingTimeMs = 10000; // 10 seconds max loading time
  
  // Enhanced debugging
  useEffect(() => {
    console.log("PatientFormPage rendered with token:", token ? `${token.substring(0, 6)}...` : 'null');
    console.log("Current form page state:", formPageState);
    console.log("Current path:", window.location.pathname);
    console.log("Complete URL:", window.location.href);
    console.log("Search params:", Object.fromEntries([...searchParams.entries()]));
    
    // Track state changes with timestamps for debugging
    const timeSinceLastChange = Date.now() - stateChangeTimeRef.current;
    console.log(`State changed to ${formPageState} after ${timeSinceLastChange}ms`);
    stateChangeTimeRef.current = Date.now();
    
    // Start the circuit breaker when entering loading states
    if (["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState) && !maxLoadingTimeRef.current) {
      console.log("[PatientFormPage]: Starting max loading time circuit breaker");
      maxLoadingTimeRef.current = window.setTimeout(() => {
        console.log("[PatientFormPage]: Circuit breaker triggered - loading time exceeded");
        if (["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState)) {
          console.log("[PatientFormPage]: Forcing FORM_READY state after timeout");
          setFormPageState("FORM_READY");
          initialRenderComplete.current = true;
        }
      }, maxLoadingTimeMs);
    }
    
    // Clear circuit breaker when leaving loading states
    if (!["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState) && maxLoadingTimeRef.current) {
      console.log("[PatientFormPage]: Clearing max loading time circuit breaker");
      clearTimeout(maxLoadingTimeRef.current);
      maxLoadingTimeRef.current = null;
    }
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
  
  // Force transition to FORM_READY if we have the form template but isFullyLoaded is not set
  useEffect(() => {
    if (formTemplate && formPageState === "INITIAL_LOADING" && !loading) {
      // Update to LOADING_WITH_DATA state first
      console.log("[PatientFormPage]: Have formTemplate but not fully loaded, setting LOADING_WITH_DATA state");
      setFormPageState("LOADING_WITH_DATA");
      formDataReadyRef.current = true;
      
      // Set a backup timer to force transition after 2.5 seconds
      if (!forcedTransitionTimeoutRef.current) {
        forcedTransitionTimeoutRef.current = window.setTimeout(() => {
          console.log("[PatientFormPage]: Backup timer triggered, forcing TRANSITION state");
          if (["INITIAL_LOADING", "LOADING_WITH_DATA"].includes(formPageState)) {
            setFormPageState("TRANSITION");
            
            // Then schedule the final transition to FORM_READY
            setTimeout(() => {
              console.log("[PatientFormPage]: Final transition to FORM_READY");
              setFormPageState("FORM_READY");
              initialRenderComplete.current = true;
            }, 300);
          }
        }, 2500);
      }
    }
    
    // Debug form template when it loads
    if (formTemplate) {
      console.log("[PatientFormPage]: Form template loaded:", {
        hasSchema: !!formTemplate.schema,
        schemaType: typeof formTemplate.schema,
        hasSections: !!(formTemplate.schema && formTemplate.schema.sections),
        sectionCount: formTemplate.schema && formTemplate.schema.sections ? formTemplate.schema.sections.length : 0,
        formId: formTemplate.id
      });
    }
    
    return () => {
      if (forcedTransitionTimeoutRef.current) {
        clearTimeout(forcedTransitionTimeoutRef.current);
        forcedTransitionTimeoutRef.current = null;
      }
    };
  }, [formTemplate, formPageState, loading]);
  
  // Determine the form page state based on verification results
  useEffect(() => {
    // Clear any pending timeouts to avoid race conditions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    
    // Error state takes precedence
    if (error) {
      console.log("[PatientFormPage]: Error detected, transitioning to ERROR state");
      setFormPageState("ERROR");
      return;
    }
    
    // Then check for expired or submitted states
    if (expired) {
      console.log("[PatientFormPage]: Token expired, transitioning to EXPIRED state");
      setFormPageState("EXPIRED");
      return;
    }
    
    if (submitted) {
      console.log("[PatientFormPage]: Form submitted, transitioning to SUBMITTED state");
      setFormPageState("SUBMITTED");
      return;
    }
    
    // Handle loading states
    if (loading || formLoading) {
      // Only update state if coming from initial state to avoid unnecessary renders
      if (formPageState === "INITIAL_LOADING" && formTemplate) {
        console.log("[PatientFormPage]: Have template while loading, showing LOADING_WITH_DATA state");
        formDataReadyRef.current = true;
        setFormPageState("LOADING_WITH_DATA");
      }
      return;
    }
    
    // If form template is loaded, mark data as ready for the loading screen
    if (formTemplate) {
      console.log("[PatientFormPage]: Form template loaded, marking data as ready");
      formDataReadyRef.current = true;
      
      // If we were in INITIAL_LOADING, move to LOADING_WITH_DATA first
      if (formPageState === "INITIAL_LOADING") {
        setFormPageState("LOADING_WITH_DATA");
        
        // Schedule transition to avoid flashing
        transitionTimeoutRef.current = window.setTimeout(() => {
          console.log("[PatientFormPage]: Scheduling transition phase");
          setFormPageState("TRANSITION");
          
          // Then schedule the final transition to FORM_READY
          setTimeout(() => {
            console.log("[PatientFormPage]: Final transition to FORM_READY");
            setFormPageState("FORM_READY");
            initialRenderComplete.current = true;
          }, 300);
        }, 500);
      }
    }
    
    // If fully loaded with form data, use a multi-step transition
    if (isFullyLoaded && formTemplate && !initialRenderComplete.current) {
      console.log("[PatientFormPage]: Form fully loaded, preparing transition sequence");
      
      // Fix: Use array.includes for type-safe comparison of literal string types
      if (["INITIAL_LOADING", "LOADING_WITH_DATA"].includes(formPageState)) {
        console.log("[PatientFormPage]: Starting transition phase");
        setFormPageState("TRANSITION");
        
        // Schedule final transition after a short delay
        transitionTimeoutRef.current = window.setTimeout(() => {
          console.log("[PatientFormPage]: Transition complete, setting FORM_READY state");
          setFormPageState("FORM_READY");
          initialRenderComplete.current = true;
        }, 300);
      }
    }
    
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [loading, formLoading, error, expired, submitted, isFullyLoaded, formTemplate, formPageState]);
  
  const { 
    isSubmitting, 
    error: submissionError, 
    isSubmitted, 
    submitForm 
  } = useFormSubmission();

  // Update form state when submission starts
  useEffect(() => {
    if (isSubmitting) {
      console.log("[PatientFormPage]: Form submission started, setting SUBMITTING state");
      setFormPageState("SUBMITTING");
    } else if (isSubmitted) {
      console.log("[PatientFormPage]: Form submission completed, setting SUBMITTED state");
      setFormPageState("SUBMITTED");
    } else if (submissionError && formPageState === "SUBMITTING") {
      console.log("[PatientFormPage]: Form submission error, setting ERROR state");
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
      console.log("[PatientFormPage]: Template schema sections count:", formTemplate.schema?.sections?.length || 0);
    }
  }, [formTemplate]);

  // Handle form values change for auto-save - memoized to prevent unnecessary re-renders
  const handleFormValuesChange = useCallback((values: Record<string, any>) => {
    setCurrentFormValues(values);
  }, []);

  // Handle form submission with form template - memoized to prevent unnecessary re-renders
  const handleFormSubmit = useCallback(async (values: any, formattedAnswers?: any) => {
    if (!token) {
      console.error("[PatientFormPage]: Cannot submit form: No token provided");
      return;
    }
    console.log("[PatientFormPage]: Submitting form with token:", token.substring(0, 6) + "...");
    setFormPageState("SUBMITTING");
    await submitForm(token, values, formTemplate?.schema, formattedAnswers);
  }, [token, submitForm, formTemplate?.schema]);

  // Get the responsible optician's name
  const createdByName = entryData?.created_by_name || null;

  // Extra logging to debug the render state
  useEffect(() => {
    console.log(`[PatientFormPage/DEBUG]: Current render state: ${formPageState}`);
    console.log(`[PatientFormPage/DEBUG]: Form template exists: ${!!formTemplate}`);
    console.log(`[PatientFormPage/DEBUG]: Form template schema: ${!!formTemplate?.schema}`);
    console.log(`[PatientFormPage/DEBUG]: Entry data exists: ${!!entryData}`);
    console.log(`[PatientFormPage/DEBUG]: Token exists: ${!!token}`);
    
    if (formPageState === "FORM_READY" && formTemplate?.schema) {
      console.log("[PatientFormPage/DEBUG]: FORM_READY state with valid template, should render form now");
    }
  }, [formPageState, formTemplate, entryData, token]);

  // Render different components based on form page state
  console.log(`[PatientFormPage/RENDER]: About to render with state: ${formPageState}`);
  
  switch (formPageState) {
    case "INITIAL_LOADING":
    case "LOADING_WITH_DATA":
      console.log(`[PatientFormPage/RENDER]: Rendering LoadingCard for state ${formPageState}`);
      return (
        <LoadingCard 
          onRetry={handleRetry} 
          minDisplayTime={2000}
          isFormDataReady={formDataReadyRef.current} 
        />
      );
      
    case "TRANSITION":
      console.log("[PatientFormPage/RENDER]: Rendering transition LoadingCard");
      // Show a loading card but indicate that we're in transition
      return (
        <LoadingCard 
          minDisplayTime={300}
          isFormDataReady={true} 
        />
      );
      
    case "ERROR":
      console.log("[PatientFormPage/RENDER]: Rendering ErrorCard");
      return (
        <ErrorCard 
          error={submissionError?.message || error} 
          errorCode={errorCode} 
          diagnosticInfo={diagnosticInfo} 
          onRetry={handleRetry} 
        />
      );
      
    case "EXPIRED":
      console.log("[PatientFormPage/RENDER]: Rendering ExpiredCard");
      return <ExpiredCard />;
      
    case "SUBMITTED":
    case "SUBMITTING":
      console.log(`[PatientFormPage/RENDER]: Rendering ${formPageState === "SUBMITTED" ? "SubmittedCard" : "LoadingCard for submission"}`);
      if (isSubmitting) {
        return <LoadingCard minDisplayTime={800} isFormDataReady={true} />;
      }
      return <SubmittedCard />;
      
    case "FORM_READY":
      console.log("[PatientFormPage/RENDER]: Rendering FORM_READY state");
      
      if (!token) {
        console.log("[PatientFormPage/RENDER]: No token, rendering error");
        return (
          <ErrorCard 
            error="Ingen åtkomsttoken hittades i URL:en" 
            errorCode="missing_token"
            diagnosticInfo="Token parameter saknas i URL:en"
            onRetry={() => window.location.href = "/"}
          />
        );
      }
      
      if (!formTemplate || !formTemplate.schema) {
        console.error("[PatientFormPage/RENDER]: Missing formTemplate or schema in FORM_READY state");
        return (
          <ErrorCard 
            error="Kunde inte ladda formulärmallen korrekt" 
            errorCode="invalid_template"
            diagnosticInfo={`FormTemplate exists: ${!!formTemplate}, Schema exists: ${!!formTemplate?.schema}`}
            onRetry={handleRetry}
          />
        );
      }
      
      // Form display state - show only when fully ready
      console.log("[PatientFormPage/RENDER]: Rendering form container");
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
              <FormContainer
                formTemplate={formTemplate.schema}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                createdByName={createdByName}
                onFormValuesChange={handleFormValuesChange}
              />
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
