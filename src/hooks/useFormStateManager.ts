
/**
 * This hook manages the form state using a state machine approach.
 * It provides a unified way to handle form states like loading, error, submission,
 * and transitions between these states for both patient and optician forms.
 */

import { useState, useEffect, useRef } from "react";
import { FormTemplateWithMeta } from "@/hooks/useFormTemplate";
import { SubmissionError } from "@/hooks/useFormSubmission";

// Define a form state enum for better state management
export type FormPageState = 
  | "INITIAL_LOADING" 
  | "LOADING_WITH_DATA"
  | "TRANSITION"
  | "ERROR" 
  | "EXPIRED" 
  | "SUBMITTED" 
  | "FORM_READY"
  | "SUBMITTING"
  | "SUBMISSION_ERROR";

interface FormStateManagerProps {
  loading: boolean;
  formLoading?: boolean;
  verificationError: string | null;
  expired: boolean;
  submitted: boolean;
  isSubmitting: boolean;
  submissionError: SubmissionError | null;
  isSubmitted: boolean;
  formTemplate: FormTemplateWithMeta | null;
  isFullyLoaded?: boolean;
  initialRenderDelayMs?: number;
  transitionDelayMs?: number;
}

export function useFormStateManager({
  loading,
  formLoading = false,
  verificationError,
  expired,
  submitted,
  isSubmitting,
  submissionError,
  isSubmitted,
  formTemplate,
  isFullyLoaded = false,
  initialRenderDelayMs = 500,
  transitionDelayMs = 300
}: FormStateManagerProps) {
  const [formPageState, setFormPageState] = useState<FormPageState>("INITIAL_LOADING");
  
  // Safari detection
  const isSafari = useRef<boolean>(
    typeof window !== 'undefined' && 
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  );
  
  // Simplified timing refs for Safari compatibility
  const initialRenderComplete = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const formDataReadyRef = useRef(false);
  const stateChangeTimeRef = useRef<number>(Date.now());
  
  // Simplified circuit breaker for Safari
  const maxLoadingTimeRef = useRef<number | null>(null);
  const maxLoadingTimeMs = isSafari.current ? 8000 : 10000; // Safari: shorter timeout
  
  // Debug logging for state changes with Safari detection
  useEffect(() => {
    if (isSafari.current) {
      console.log(`[useFormStateManager/Safari]: State changed to ${formPageState}`);
      console.log(`[useFormStateManager/Safari]: Form data ready: ${formDataReadyRef.current}`);
    } else {
      console.log(`[useFormStateManager]: State changed to ${formPageState}`);
      console.log(`[useFormStateManager]: Form data ready: ${formDataReadyRef.current}`);
    }
    
    // Track state changes with timestamps for debugging
    const timeSinceLastChange = Date.now() - stateChangeTimeRef.current;
    console.log(`[useFormStateManager${isSafari.current ? '/Safari' : ''}]: State changed to ${formPageState} after ${timeSinceLastChange}ms`);
    stateChangeTimeRef.current = Date.now();
    
    // Simplified circuit breaker for Safari
    if (["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState) && !maxLoadingTimeRef.current) {
      console.log(`[useFormStateManager${isSafari.current ? '/Safari' : ''}]: Starting circuit breaker`);
      maxLoadingTimeRef.current = window.setTimeout(() => {
        console.log(`[useFormStateManager${isSafari.current ? '/Safari' : ''}]: Circuit breaker triggered`);
        if (["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState)) {
          setFormPageState("FORM_READY");
          initialRenderComplete.current = true;
        }
      }, maxLoadingTimeMs);
    }
    
    // Clear circuit breaker when leaving loading states
    if (!["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState) && maxLoadingTimeRef.current) {
      clearTimeout(maxLoadingTimeRef.current);
      maxLoadingTimeRef.current = null;
    }
    
    return () => {
      // Clean up timeouts when component unmounts
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
      
      if (maxLoadingTimeRef.current) {
        clearTimeout(maxLoadingTimeRef.current);
        maxLoadingTimeRef.current = null;
      }
    };
  }, [formPageState]);
  
  // Simplified transition logic for Safari compatibility
  useEffect(() => {
    if (formTemplate && formPageState === "INITIAL_LOADING" && !loading) {
      console.log(`[useFormStateManager${isSafari.current ? '/Safari' : ''}]: Have formTemplate, transitioning to FORM_READY`);
      formDataReadyRef.current = true;
      
      if (isSafari.current) {
        // Safari: Direct transition to avoid timing issues
        setFormPageState("FORM_READY");
        initialRenderComplete.current = true;
      } else {
        // Other browsers: Use transition state
        setFormPageState("LOADING_WITH_DATA");
      }
    }
  }, [formTemplate, formPageState, loading]);
  
  // Update state based on props
  useEffect(() => {
    // Clear pending transitions to avoid race conditions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    
    // Error states take precedence
    if (verificationError) {
      console.log("[useFormStateManager]: Error detected, transitioning to ERROR state");
      setFormPageState("ERROR");
      return;
    }
    
    // Then check expired or submitted
    if (expired) {
      console.log("[useFormStateManager]: Token expired, transitioning to EXPIRED state");
      setFormPageState("EXPIRED");
      return;
    }
    
    if (submitted || isSubmitted) {
      console.log("[useFormStateManager]: Form submitted, transitioning to SUBMITTED state");
      setFormPageState("SUBMITTED");
      return;
    }
    
    // Handle loading states
    if (loading || formLoading) {
      if (formPageState === "INITIAL_LOADING" && formTemplate) {
        console.log("[useFormStateManager]: Have template while loading, showing LOADING_WITH_DATA state");
        formDataReadyRef.current = true;
        setFormPageState("LOADING_WITH_DATA");
      }
      return;
    }
    
    // Simplified form template handling for Safari
    if (formTemplate) {
      console.log(`[useFormStateManager${isSafari.current ? '/Safari' : ''}]: Form template loaded, marking data as ready`);
      formDataReadyRef.current = true;
      
      // Safari: Direct transition to FORM_READY to avoid timing issues
      if (isSafari.current && formPageState === "INITIAL_LOADING") {
        setFormPageState("FORM_READY");
        initialRenderComplete.current = true;
      } else if (!isSafari.current && formPageState === "INITIAL_LOADING") {
        // Other browsers: Use transition state
        setFormPageState("LOADING_WITH_DATA");
        
        // Schedule transition to avoid flashing
        transitionTimeoutRef.current = window.setTimeout(() => {
          setFormPageState("FORM_READY");
          initialRenderComplete.current = true;
        }, initialRenderDelayMs);
      }
    }
    
    // Handle fully loaded state
    if (isFullyLoaded && formTemplate && !initialRenderComplete.current) {
      console.log(`[useFormStateManager${isSafari.current ? '/Safari' : ''}]: Form fully loaded`);
      
      if (isSafari.current) {
        // Safari: Direct transition
        setFormPageState("FORM_READY");
        initialRenderComplete.current = true;
      } else if (["INITIAL_LOADING", "LOADING_WITH_DATA"].includes(formPageState)) {
        // Other browsers: Transition with delay
        transitionTimeoutRef.current = window.setTimeout(() => {
          setFormPageState("FORM_READY");
          initialRenderComplete.current = true;
        }, transitionDelayMs);
      }
    }
    
    // Handle submission states
    if (isSubmitting) {
      console.log("[useFormStateManager]: Form submission started, setting SUBMITTING state");
      setFormPageState("SUBMITTING");
    } else if (submissionError && (formPageState === "SUBMITTING" || formPageState === "FORM_READY")) {
      console.log("[useFormStateManager]: Form submission error, setting SUBMISSION_ERROR state");
      setFormPageState("SUBMISSION_ERROR");
    }
  }, [
    loading, 
    formLoading, 
    verificationError, 
    expired, 
    submitted,
    isSubmitting,
    submissionError,
    isSubmitted,
    isFullyLoaded,
    formTemplate,
    formPageState,
    initialRenderDelayMs,
    transitionDelayMs
  ]);
  
  return {
    formPageState,
    isFormDataReady: formDataReadyRef.current,
    setFormPageState,
    initialRenderComplete: initialRenderComplete.current
  };
}
