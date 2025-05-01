
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
  
  // Transition timing refs
  const initialRenderComplete = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const formDataReadyRef = useRef(false);
  const forcedTransitionTimeoutRef = useRef<number | null>(null);
  const stateChangeTimeRef = useRef<number>(Date.now());
  
  // Circuit breaker for stuck loading states
  const maxLoadingTimeRef = useRef<number | null>(null);
  const maxLoadingTimeMs = 10000; // 10 seconds max loading time
  
  // Debug logging for state changes
  useEffect(() => {
    console.log(`[useFormStateManager]: State changed to ${formPageState}`);
    console.log(`[useFormStateManager]: Form data ready: ${formDataReadyRef.current}`);
    
    // Track state changes with timestamps for debugging
    const timeSinceLastChange = Date.now() - stateChangeTimeRef.current;
    console.log(`[useFormStateManager]: State changed to ${formPageState} after ${timeSinceLastChange}ms`);
    stateChangeTimeRef.current = Date.now();
    
    // Start the circuit breaker when entering loading states
    if (["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState) && !maxLoadingTimeRef.current) {
      console.log("[useFormStateManager]: Starting max loading time circuit breaker");
      maxLoadingTimeRef.current = window.setTimeout(() => {
        console.log("[useFormStateManager]: Circuit breaker triggered - loading time exceeded");
        if (["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState)) {
          console.log("[useFormStateManager]: Forcing FORM_READY state after timeout");
          setFormPageState("FORM_READY");
          initialRenderComplete.current = true;
        }
      }, maxLoadingTimeMs);
    }
    
    // Clear circuit breaker when leaving loading states
    if (!["INITIAL_LOADING", "LOADING_WITH_DATA", "TRANSITION"].includes(formPageState) && maxLoadingTimeRef.current) {
      console.log("[useFormStateManager]: Clearing max loading time circuit breaker");
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
      
      if (forcedTransitionTimeoutRef.current) {
        clearTimeout(forcedTransitionTimeoutRef.current);
        forcedTransitionTimeoutRef.current = null;
      }
    };
  }, [formPageState]);
  
  // Force transition if we have form template but not fully loaded
  useEffect(() => {
    if (formTemplate && formPageState === "INITIAL_LOADING" && !loading) {
      console.log("[useFormStateManager]: Have formTemplate but not fully loaded, setting LOADING_WITH_DATA state");
      setFormPageState("LOADING_WITH_DATA");
      formDataReadyRef.current = true;
      
      // Set a backup timer to force transition
      if (!forcedTransitionTimeoutRef.current) {
        forcedTransitionTimeoutRef.current = window.setTimeout(() => {
          console.log("[useFormStateManager]: Backup timer triggered, forcing TRANSITION state");
          if (["INITIAL_LOADING", "LOADING_WITH_DATA"].includes(formPageState)) {
            setFormPageState("TRANSITION");
            
            // Schedule final transition to FORM_READY
            setTimeout(() => {
              console.log("[useFormStateManager]: Final transition to FORM_READY");
              setFormPageState("FORM_READY");
              initialRenderComplete.current = true;
            }, transitionDelayMs);
          }
        }, initialRenderDelayMs * 2.5);
      }
    }
  }, [formTemplate, formPageState, loading, initialRenderDelayMs, transitionDelayMs]);
  
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
    
    // If form template is loaded, mark data as ready
    if (formTemplate) {
      console.log("[useFormStateManager]: Form template loaded, marking data as ready");
      formDataReadyRef.current = true;
      
      // If initial loading, move to loading with data first
      if (formPageState === "INITIAL_LOADING") {
        setFormPageState("LOADING_WITH_DATA");
        
        // Schedule transition to avoid flashing
        transitionTimeoutRef.current = window.setTimeout(() => {
          console.log("[useFormStateManager]: Scheduling transition phase");
          setFormPageState("TRANSITION");
          
          // Schedule final transition to FORM_READY
          setTimeout(() => {
            console.log("[useFormStateManager]: Final transition to FORM_READY");
            setFormPageState("FORM_READY");
            initialRenderComplete.current = true;
          }, transitionDelayMs);
        }, initialRenderDelayMs);
      }
    }
    
    // If fully loaded with form data, transition to ready
    if (isFullyLoaded && formTemplate && !initialRenderComplete.current) {
      console.log("[useFormStateManager]: Form fully loaded, preparing transition sequence");
      
      if (["INITIAL_LOADING", "LOADING_WITH_DATA"].includes(formPageState)) {
        console.log("[useFormStateManager]: Starting transition phase");
        setFormPageState("TRANSITION");
        
        // Schedule final transition after delay
        transitionTimeoutRef.current = window.setTimeout(() => {
          console.log("[useFormStateManager]: Transition complete, setting FORM_READY state");
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
