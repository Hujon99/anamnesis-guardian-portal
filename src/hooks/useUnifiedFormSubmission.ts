
/**
 * This hook provides a unified approach to form submission for both patient and optician modes.
 * It handles the entire submission lifecycle including state management, error handling,
 * retries, and fallback mechanisms. The hook ensures that both modes use the same
 * consistent data structure and approach for better reliability.
 */

import { useState, useCallback } from 'react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import { FormTemplateWithMeta } from './useFormTemplate';
import { createOptimizedPromptInput, extractFormattedAnswers } from "@/utils/anamnesisTextUtils";
import { SUPABASE_URL } from "@/integrations/supabase/client";

// Define submission related types
export type SubmissionMode = 'patient' | 'optician';

export interface SubmissionError extends Error {
  status?: number;
  details?: string;
  recoverable?: boolean;
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
  const { supabase, isLoading: supabaseLoading } = useSupabaseClient();
  
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
      
      if (!supabase) {
        throw new Error("Kunde inte ansluta till databasen");
      }
      
      const { values, formTemplate, formattedAnswers } = data;
      
      // Store values for potential retry
      setLastAttemptValues({ token, values, formTemplate, formattedAnswers });
      setSubmissionAttempts(prev => prev + 1);
      
      console.log(`[useUnifiedFormSubmission]: Starting submission in ${mode} mode with token: ${token.substring(0, 6)}...`);
      console.log(`[useUnifiedFormSubmission]: Submission attempt #${submissionAttempts + 1}`);
      
      // Generate formatted raw data if not already provided
      let formattedRawData = formattedAnswers;
      
      if (!formattedRawData && formTemplate) {
        try {
          const formattedAnswersObj = extractFormattedAnswers(values);
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
      
      // UNIFIED APPROACH: Use a consistent flat data structure for both modes
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
      
      console.log("[useUnifiedFormSubmission]: Unified submission data structure:", {
        mode,
        directAnswersCount: Object.keys(values).length,
        hasFormattedRawData: !!submissionData.formatted_raw_data,
        formattedRawDataLength: submissionData.formatted_raw_data?.length || 0,
        status: submissionData.status
      });
      
      // CONSISTENT SUBMISSION APPROACH: Try edge function first, then fall back to direct update
      try {
        console.log("[useUnifiedFormSubmission]: Using Supabase URL:", SUPABASE_URL);
        console.log("[useUnifiedFormSubmission]: Attempting to call submit-form edge function");
        
        // Set up circuit breaker with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Edge function timeout after 8 seconds")), 8000);
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
        
        // FALLBACK: Use direct database update if edge function fails
        try {
          console.log("[useUnifiedFormSubmission]: Attempting direct database update as fallback");
          
          const { error: directUpdateError } = await supabase
            .from("anamnes_entries")
            .update(submissionData)
            .eq("access_token", token);
          
          if (directUpdateError) {
            console.error("[useUnifiedFormSubmission]: Direct update error:", directUpdateError);
            throw new Error(`Direct database update failed: ${directUpdateError.message}`);
          }
          
          console.log("[useUnifiedFormSubmission]: Direct database update successful");
          return { success: true, usedFallback: true };
        } catch (fallbackError: any) {
          console.error("[useUnifiedFormSubmission]: Fallback approach failed:", fallbackError);
          throw fallbackError;
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
      
      toast({
        title: "Tack för dina svar!",
        description: data.usedFallback 
          ? "Dina svar har skickats in framgångsrikt via alternativ metod."
          : "Dina svar har skickats in framgångsrikt.",
      });
    },
    onError: (error: any) => {
      console.error("[useUnifiedFormSubmission]: Submission error:", error);
      
      // Create a proper submission error object
      const submissionError: SubmissionError = error instanceof Error ? error : new Error(error?.message || "Ett oväntat fel uppstod.");
      
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
      await submissionMutation.mutateAsync({ values, formTemplate, formattedAnswers });
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
    
    // Extract the stored values from last attempt
    const { token, values, formTemplate, formattedAnswers } = lastAttemptValues;
    console.log("[useUnifiedFormSubmission]: Retrying submission with stored values");
    
    try {
      await submissionMutation.mutateAsync({ values, formTemplate, formattedAnswers });
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
