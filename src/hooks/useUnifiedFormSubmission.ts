/**
 * This hook provides a unified approach to form submission for both patient and optician modes.
 * It handles the entire submission lifecycle including state management, error handling,
 * retries, and fallback mechanisms. The hook ensures that both modes use consistent
 * data structures while maintaining the reliability of the original optician submission approach.
 * Enhanced with better authentication handling and circuit breaker patterns to prevent stuck states.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import { FormTemplateWithMeta } from './useFormTemplate';
import { createOptimizedPromptInput, extractFormattedAnswers } from "@/utils/anamnesisTextUtils";
import { SUPABASE_URL } from "@/integrations/supabase/client";
import { createSupabaseClient } from "@/utils/supabaseClientUtils";

// Define submission related types
export type SubmissionMode = 'patient' | 'optician';

export interface SubmissionError extends Error {
  status?: number;
  details?: string;
  recoverable?: boolean;
  isAuthError?: boolean;
}

interface FormSubmissionProps {
  token: string | null;
  mode: SubmissionMode;
}

export function useUnifiedFormSubmission({ token, mode }: FormSubmissionProps) {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const [lastAttemptValues, setLastAttemptValues] = useState<Record<string, any> | null>(null);
  
  // Get Supabase client
  const { supabase, isLoading: supabaseLoading, isReady } = useSupabaseClient();
  
  // Circuit breaker to detect stuck submissions
  const submissionTimeoutRef = useRef<number | null>(null);
  const MAX_SUBMISSION_TIME = 10000; // 10 seconds max submission time
  
  // Clear circuit breaker on unmount
  useEffect(() => {
    return () => {
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
        submissionTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Create a mutation for handling form submission
  const submissionMutation = useMutation({
    mutationFn: async (data: {
      values: Record<string, any>;
      formTemplate: FormTemplateWithMeta | null;
      formattedAnswers?: any;
    }) => {
      if (!token) {
        throw new Error("Ingen åtkomsttoken hittades");
      }
      
      // Set up circuit breaker to prevent stuck states
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
      
      submissionTimeoutRef.current = window.setTimeout(() => {
        console.error("[useUnifiedFormSubmission]: Submission took too long, circuit breaker triggered");
        if (isSubmitting) {
          setIsSubmitting(false);
          const timeoutError: SubmissionError = new Error("Tidsgränsen för inskickning överskreds");
          timeoutError.status = 408;
          timeoutError.recoverable = true;
          timeoutError.details = "Servern svarade inte inom rimlig tid";
          setError(timeoutError);
        }
      }, MAX_SUBMISSION_TIME);
      
      // Store values for potential retry
      setLastAttemptValues(data);
      setSubmissionAttempts(prev => prev + 1);
      
      console.log(`[useUnifiedFormSubmission]: Starting submission in ${mode} mode with token: ${token.substring(0, 6)}...`);
      console.log(`[useUnifiedFormSubmission]: Submission attempt #${submissionAttempts + 1}`);
      console.log(`[useUnifiedFormSubmission]: Supabase client ready:`, isReady);
      
      // Extract data from parameters
      const { values, formTemplate, formattedAnswers } = data;
      
      // Generate formatted raw data for better AI understanding (for both modes)
      let formattedRawData = null;
      
      // Check if formattedAnswers includes a preformatted text representation
      if (formattedAnswers && typeof formattedAnswers === 'object' && 'formatted_raw_data' in formattedAnswers) {
        formattedRawData = formattedAnswers.formatted_raw_data;
        console.log("[useUnifiedFormSubmission]: Using pre-formatted raw data from form context");
      }
      // If no preformatted data, generate it
      else if (!formattedRawData && formTemplate) {
        try {
          // Try to extract formatted answers from the values
          const formattedAnswersObj = formattedAnswers || extractFormattedAnswers(values);
          
          if (formattedAnswersObj) {
            formattedRawData = createOptimizedPromptInput(formTemplate.schema, formattedAnswersObj);
            console.log("[useUnifiedFormSubmission]: Generated formatted raw data:", 
              formattedRawData?.substring(0, 100) + "...");
          } else {
            // Fallback to simple formatting
            formattedRawData = "Patientens anamnesinformation:\n\n";
            Object.entries(values)
              .filter(([key]) => !key.startsWith('_') && key !== 'formMetadata' && key !== 'metadata')
              .forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                  formattedRawData += `${key}: ${JSON.stringify(value)}\n`;
                }
              });
          }
        } catch (error) {
          console.error("[useUnifiedFormSubmission]: Error generating formatted text:", error);
          // Continue with submission even if formatting fails
        }
      }
      
      // SUBMISSION DATA PREPARATION
      // Prepare data similarly for both modes but handle submission differently
      const submissionData = {
        // Include direct answers
        ...values,
        
        // Always include formatted_raw_data (snake_case for database compatibility)
        formatted_raw_data: formattedRawData,
        
        // Set status based on mode (submitted for patient, ready for optician)
        status: mode === 'optician' ? "ready" : "submitted",
        
        // Always update timestamp
        updated_at: new Date().toISOString()
      };
      
      console.log("[useUnifiedFormSubmission]: Submission data prepared:", {
        mode,
        directAnswersCount: Object.keys(values).length,
        hasFormattedRawData: !!submissionData.formatted_raw_data,
        formattedRawDataLength: submissionData.formatted_raw_data?.length || 0,
        status: submissionData.status
      });
      
      // OPTICIAN MODE: Direct database update approach first (this was working in the original)
      if (mode === 'optician') {
        console.log("[useUnifiedFormSubmission]: Using optician direct update approach");
        
        try {
          // Try with the authenticated client first
          console.log("[useUnifiedFormSubmission]: Attempting direct update with authenticated client");
          
          const { error: directUpdateError } = await supabase
            .from("anamnes_entries")
            .update(submissionData)
            .eq("access_token", token);
          
          if (directUpdateError) {
            // Check if this is an authentication error
            if (directUpdateError.code === 'PGRST301' || 
                directUpdateError.code === '401' || 
                directUpdateError.message?.includes('JWT')) {
              
              console.warn("[useUnifiedFormSubmission]: JWT auth error detected, trying with anon key:", directUpdateError);
              
              // Create a new client with the anon key as fallback
              console.log("[useUnifiedFormSubmission]: Creating new client with anon key");
              const anonClient = createSupabaseClient();
              
              // Try the update with anon key
              const { error: anonUpdateError } = await anonClient
                .from("anamnes_entries")
                .update(submissionData)
                .eq("access_token", token);
              
              if (anonUpdateError) {
                console.error("[useUnifiedFormSubmission]: Anon client update failed:", anonUpdateError);
                const authError: SubmissionError = new Error(`Auktoriseringsfel: ${anonUpdateError.message}`);
                authError.status = 401;
                authError.details = "Auktoriseringsfel vid databas-uppdatering";
                authError.recoverable = true;
                authError.isAuthError = true;
                throw authError;
              }
              
              console.log("[useUnifiedFormSubmission]: Anon client update successful");
              return { success: true, usedAnonFallback: true };
            }
            
            // Handle other errors
            console.error("[useUnifiedFormSubmission]: Optician direct update error:", directUpdateError);
            throw new Error(`Databasfel: ${directUpdateError.message}`);
          }
          
          console.log("[useUnifiedFormSubmission]: Optician direct update successful");
          return { success: true };
        } catch (error: any) {
          console.error("[useUnifiedFormSubmission]: Optician submission error:", error);
          
          // Add isAuthError flag for better error handling
          if (error.message?.includes('JWT') || 
              error.message?.includes('401') || 
              error.message?.includes('auth') ||
              error.isAuthError) {
            error.isAuthError = true;
          }
          
          throw error;
        }
      } 
      // PATIENT MODE: Try edge function first, then fallback to direct update
      else {
        console.log("[useUnifiedFormSubmission]: Using patient edge function approach with fallback");
        
        // Set up timeout for edge function calls
        const EDGE_FUNCTION_TIMEOUT = 8000; // 8 seconds
        
        // Try the edge function with a timeout
        try {
          console.log("[useUnifiedFormSubmission]: Attempting to call submit-form edge function");
          
          // Set up circuit breaker with timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Edge function timeout after 8 seconds")), EDGE_FUNCTION_TIMEOUT);
          });
          
          // Call the edge function with race against timeout
          const responsePromise = supabase.functions.invoke('submit-form', {
            body: { 
              token,
              answers: submissionData
            }
          });
          
          const response = await Promise.race([responsePromise, timeoutPromise]) as any;
          
          if (response.error) {
            console.error("[useUnifiedFormSubmission]: Edge function error:", response.error);
            throw new Error(`Edge function error: ${response.error.message || JSON.stringify(response.error)}`);
          }
          
          console.log("[useUnifiedFormSubmission]: Edge function successful:", response.data);
          return { success: true, ...response.data };
        } catch (edgeFunctionError: any) {
          console.error("[useUnifiedFormSubmission]: Edge function failed, trying direct database update:", edgeFunctionError);
          
          // FALLBACK: Direct database update if edge function fails
          try {
            console.log("[useUnifiedFormSubmission]: Attempting direct database update as fallback");
            
            // Try with the authenticated client first
            try {
              const { error: directUpdateError } = await supabase
                .from("anamnes_entries")
                .update(submissionData)
                .eq("access_token", token);
              
              if (directUpdateError) {
                // Check if this is an authentication error
                if (directUpdateError.code === 'PGRST301' || 
                    directUpdateError.code === '401' || 
                    directUpdateError.message?.includes('JWT')) {
                  
                  throw new Error("JWT auth error");
                }
                
                console.error("[useUnifiedFormSubmission]: Direct update error:", directUpdateError);
                throw new Error(`Direct database update failed: ${directUpdateError.message}`);
              }
            } catch (authError) {
              // If auth error, try with anon key as fallback
              console.log("[useUnifiedFormSubmission]: Auth error, trying with anon key");
              const anonClient = createSupabaseClient();
              
              const { error: anonUpdateError } = await anonClient
                .from("anamnes_entries")
                .update(submissionData)
                .eq("access_token", token);
              
              if (anonUpdateError) {
                console.error("[useUnifiedFormSubmission]: Anon client update failed:", anonUpdateError);
                throw new Error(`Anon client update failed: ${anonUpdateError.message}`);
              }
            }
            
            console.log("[useUnifiedFormSubmission]: Direct database update successful");
            return { success: true, usedFallback: true };
          } catch (fallbackError: any) {
            console.error("[useUnifiedFormSubmission]: Fallback approach failed:", fallbackError);
            throw fallbackError;
          }
        }
      }
    },
    onMutate: () => {
      setIsSubmitting(true);
      setError(null);
    },
    onSuccess: (data) => {
      console.log("[useUnifiedFormSubmission]: Submission successful:", data);
      setIsSubmitted(true);
      
      // Clear circuit breaker
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
        submissionTimeoutRef.current = null;
      }
      
      toast({
        title: mode === 'optician' ? "Formuläret har skickats in" : "Tack för dina svar!",
        description: data.usedFallback || data.usedAnonFallback
          ? "Dina svar har skickats in framgångsrikt via alternativ metod."
          : "Dina svar har skickats in framgångsrikt.",
      });
    },
    onError: (error: any) => {
      console.error("[useUnifiedFormSubmission]: Submission error:", error);
      
      // Reset submission state to allow retry
      setIsSubmitting(false);
      
      // Clear circuit breaker
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
        submissionTimeoutRef.current = null;
      }
      
      // Create a proper submission error object
      const submissionError: SubmissionError = error instanceof Error ? error : new Error(error?.message || "Ett oväntat fel uppstod.");
      
      // Add isAuthError flag if needed
      if (error.message?.includes('JWT') || 
          error.message?.includes('401') || 
          error.message?.includes('auktorisering') ||
          error.message?.includes('auth') ||
          error.isAuthError) {
        submissionError.isAuthError = true;
      }
      
      if (!submissionError.status) {
        // Set status and recoverable flag based on error type
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          submissionError.status = 0;
          submissionError.details = "Nätverksfel - Kunde inte ansluta till servern";
          submissionError.recoverable = true;
        } else if (error.message?.includes('timeout')) {
          submissionError.status = 408;
          submissionError.details = "Tidsgräns överskreds vid anslutning till servern";
          submissionError.recoverable = true;
        } else if (submissionError.isAuthError) {
          submissionError.status = 401;
          submissionError.details = "Auktoriseringsfel - Försöker med alternativ metod";
          submissionError.recoverable = true;
        } else {
          submissionError.status = 500;
          submissionError.recoverable = true;
        }
      }
      
      setError(submissionError);
      
      // Show a more detailed error message based on the type of error
      let errorMessage = submissionError.message || "Ett oväntat fel uppstod.";
      
      // Network error detection
      if (submissionError.message?.includes('Failed to fetch') || submissionError.message?.includes('NetworkError')) {
        errorMessage = "Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen.";
      } else if (submissionError.isAuthError) {
        errorMessage = "Ett auktoriseringsfel uppstod. Vi försöker med en alternativ metod. Vänligen försök igen.";
      }
      
      // Generic API error
      if (submissionError.status >= 500) {
        errorMessage = "Ett serverfel uppstod. Formuläret kunde inte skickas in just nu. Du kan försöka igen om en stund.";
      }
      
      toast({
        title: "Det gick inte att skicka in formuläret",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Main submission handler
  const handleSubmit = useCallback(async (
    values: Record<string, any>, 
    formTemplate: FormTemplateWithMeta | null,
    formattedAnswers?: any
  ) => {
    if (!token) {
      console.error("[useUnifiedFormSubmission]: Cannot submit form: No token provided");
      return false;
    }
    
    try {
      await submissionMutation.mutateAsync({ 
        values, 
        formTemplate, 
        formattedAnswers 
      });
      return true;
    } catch (error) {
      return false;
    }
  }, [token, submissionMutation]);

  // Retry submission handler
  const handleRetry = useCallback(async () => {
    if (!lastAttemptValues) {
      console.error("[useUnifiedFormSubmission]: No values to retry with");
      return false;
    }
    
    console.log("[useUnifiedFormSubmission]: Retrying submission with stored values");
    
    try {
      // Fix the type error by ensuring we pass the expected object structure
      await submissionMutation.mutateAsync(lastAttemptValues);
      return true;
    } catch (error) {
      return false;
    }
  }, [lastAttemptValues, submissionMutation]);

  return {
    isSubmitting,
    isSubmitted,
    error,
    submissionAttempts,
    supabaseLoading,
    
    // Main functions
    submitForm: handleSubmit,
    retrySubmission: handleRetry,
    resetError,
    
    // Raw mutation access (for advanced use cases)
    submissionMutation
  };
}
