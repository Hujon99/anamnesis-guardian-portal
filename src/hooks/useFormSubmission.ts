
/**
 * This hook handles form submission through the edge function.
 * It provides error handling, retry logic, and manages submission state.
 * Enhanced to handle both patient and optician submissions.
 */

import { useState, useCallback } from 'react';
import { useSupabaseClient } from './useSupabaseClient';
import { useTokenManager } from './useTokenManager'; 
import { toast } from '@/components/ui/use-toast';
import { FormTemplate } from '@/types/anamnesis';
import { prepareFormSubmission } from '@/utils/formSubmissionUtils';

export type SubmissionError = Error & {
  details?: string;
  status?: number;
  recoverable?: boolean;
};

// Store last submission data for retry
let lastSubmissionData: {
  token: string;
  values: Record<string, any>;
  schema?: FormTemplate;
  formattedText?: string;
  isOptician?: boolean;
} | null = null;

export function useFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const { supabase } = useSupabaseClient();
  const tokenManager = useTokenManager();

  // Reset the error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Submit the form to the edge function
  const submitForm = useCallback(async (
    token: string,
    values: Record<string, any>,
    schema?: FormTemplate,
    formattedText?: string,
    isOptician?: boolean
  ) => {
    // Store submission data for retry
    lastSubmissionData = { token, values, schema, formattedText, isOptician };
    setSubmissionAttempts(prev => prev + 1);
    
    // If already submitted, just return success
    if (isSubmitted) {
      return true;
    }

    setIsSubmitting(true);
    setError(null);
    
    console.log(`[useFormSubmission]: Submitting form${isOptician ? ' (optician mode)' : ''}...`);

    try {
      if (!supabase) {
        throw new Error("Supabase client is not initialized");
      }

      // Prepare the form data with either approach
      const formattedFormData = schema 
        ? prepareFormSubmission(schema, values, { formattedAnswers: formattedText }, isOptician) 
        : values;

      // Add isOptician flag to the submission data
      if (isOptician) {
        console.log("[useFormSubmission]: Adding optician flag to submission data");
        formattedFormData._isOptician = true;
      }
      
      console.log("[useFormSubmission]: Calling submit-form edge function with token", token.substring(0, 6) + "...");
      
      // Use the edge function to submit the form (same for both patient and optician)
      const { data, error } = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: formattedFormData
        }
      });
      
      if (error) {
        console.error("[useFormSubmission]: Edge function error:", error);
        const submissionError = new Error(`Fel vid inskickning: ${error.message}`) as SubmissionError;
        submissionError.details = error.message;
        setError(submissionError);
        throw submissionError;
      }
      
      if (data?.error) {
        console.error("[useFormSubmission]: Data error:", data.error);
        const submissionError = new Error(`Fel vid inskickning: ${data.error}`) as SubmissionError;
        submissionError.details = data.error;
        
        // Check for specific error types for better handling
        if (data.error.toLowerCase().includes('token')) {
          submissionError.status = 401;
          submissionError.recoverable = false;
        }
        
        setError(submissionError);
        throw submissionError;
      }

      console.log("[useFormSubmission]: Submission successful:", data);
      
      // Mark form as submitted
      setIsSubmitted(true);
      
      // Show success toast
      toast({
        title: "Formuläret har skickats in", 
        description: "Tack för din ifyllda information"
      });
      
      return true;
    } catch (e) {
      console.error("[useFormSubmission]: Catch block error:", e);
      
      // Create an error object if it's not already one
      const submissionError = e instanceof Error 
        ? e as SubmissionError
        : new Error(`Ett fel uppstod: ${String(e)}`) as SubmissionError;
      
      // Set default properties if not already set
      if (!submissionError.status) submissionError.status = 500;
      if (submissionError.recoverable === undefined) submissionError.recoverable = true;
      
      setError(submissionError);
      
      // Show error toast if not a token error (those are handled separately)
      if (!submissionError.message.toLowerCase().includes('token')) {
        toast({
          title: "Ett fel uppstod",
          description: submissionError.message,
          variant: "destructive",
        });
      }
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [supabase, isSubmitted, tokenManager]);

  // Retry submission with the last data
  const retrySubmission = useCallback(async () => {
    if (!lastSubmissionData) {
      console.error("[useFormSubmission]: No submission data for retry");
      return false;
    }
    
    const { token, values, schema, formattedText, isOptician } = lastSubmissionData;
    console.log("[useFormSubmission]: Retrying submission...");
    
    // Clear previous error
    setError(null);
    
    return await submitForm(token, values, schema, formattedText, isOptician);
  }, [submitForm]);

  return {
    isSubmitting,
    isSubmitted,
    error,
    submissionAttempts,
    submitForm,
    retrySubmission,
    resetError
  };
}
