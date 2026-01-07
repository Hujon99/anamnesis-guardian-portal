/**
 * This hook handles form submission through the edge function.
 * It provides error handling, retry logic, and manages submission state.
 * Enhanced to handle both patient and optician submissions.
 * 
 * LOGGING: All submission errors are logged to form_session_logs for debugging.
 * This includes edge function errors, network errors, and retry attempts.
 */

import { useState, useCallback } from 'react';
import { useSupabaseClient } from './useSupabaseClient';
import { useTokenManager } from './useTokenManager'; 
import { toast } from '@/components/ui/use-toast';
import { FormTemplate } from '@/types/anamnesis';
import { prepareFormSubmission } from '@/utils/formSubmissionUtils';
import { v4 as uuidv4 } from 'uuid';

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
  kioskCustomerData?: { personalNumber: string; fullName: string } | null;
  sessionId?: string;
} | null = null;

/**
 * Categorize error type for better tracking
 */
function categorizeError(error: unknown): string {
  if (error instanceof TypeError && String(error).includes('fetch')) {
    return 'NetworkError';
  }
  if (String(error).toLowerCase().includes('timeout')) {
    return 'TimeoutError';
  }
  if (String(error).toLowerCase().includes('token') || String(error).toLowerCase().includes('jwt')) {
    return 'AuthError';
  }
  if (error instanceof Error) {
    return error.name || 'SubmissionError';
  }
  return 'UnknownError';
}

export function useFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const { supabase } = useSupabaseClient();
  const tokenManager = useTokenManager();

  /**
   * Log submission error to form_session_logs for debugging
   */
  const logSubmissionError = useCallback(async (
    eventType: 'submission_error' | 'edge_function_error' | 'submission_retry',
    errorMessage: string,
    errorType: string,
    context: Record<string, unknown> = {}
  ) => {
    try {
      // Use anonymous client for logging (patient submissions have no auth)
      const { createClient } = await import('@supabase/supabase-js');
      const anonClient = createClient(
        'https://jawtwwwelxaaprzsqfyp.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd3R3d3dlbHhhYXByenNxZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDMzMTYsImV4cCI6MjA1ODA3OTMxNn0.FAAh0QpAM18T2pDrohTUBUMcNez8dnmIu3bpRoa8Yhk'
      );
      
      await anonClient.from('form_session_logs').insert({
        session_id: lastSubmissionData?.sessionId || uuidv4(),
        entry_id: null, // We don't have entry_id at this point
        organization_id: 'unknown', // Patient submissions don't have org context
        event_type: eventType,
        error_message: errorMessage,
        error_type: errorType,
        event_data: {
          ...context,
          token_prefix: lastSubmissionData?.token?.substring(0, 8) || null,
          is_optician: lastSubmissionData?.isOptician || false,
          attempt_number: submissionAttempts,
          timestamp: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
        },
        device_type: typeof navigator !== 'undefined' 
          ? (/Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop')
          : null,
        browser: typeof navigator !== 'undefined'
          ? navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[1] || 'unknown'
          : null
      });
      
      console.debug('[useFormSubmission] Error logged to database:', eventType);
    } catch (logError) {
      // Don't fail the main operation if logging fails
      console.debug('[useFormSubmission] Failed to log error to database:', logError);
    }
  }, [submissionAttempts]);

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
    isOptician?: boolean,
    kioskCustomerData?: { personalNumber: string; fullName: string } | null
  ): Promise<{ success: boolean; entryId?: string }> => {
    // Generate session ID for tracking this submission attempt
    const sessionId = lastSubmissionData?.sessionId || uuidv4();
    
    // Store submission data for retry
    lastSubmissionData = { token, values, schema, formattedText, isOptician, kioskCustomerData, sessionId };
    setSubmissionAttempts(prev => prev + 1);
    
    // If already submitted, just return success
    if (isSubmitted) {
      return { success: true };
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
      
      // FIXED: Send data in correct format - spread formData directly instead of wrapping in "answers"
      const { data, error } = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          ...formattedFormData,  // Spread the data directly instead of wrapping in "answers"
          ...(kioskCustomerData && {
            kiosk_customer_data: {
              personalNumber: kioskCustomerData.personalNumber,
              fullName: kioskCustomerData.fullName
            }
          })
        }
      });
      
      if (error) {
        console.error("[useFormSubmission]: Edge function error:", error);
        
        // Log edge function error to database
        await logSubmissionError(
          'edge_function_error',
          error.message,
          'EdgeFunctionError',
          { edge_function: 'submit-form' }
        );
        
        const submissionError = new Error(`Fel vid inskickning: ${error.message}`) as SubmissionError;
        submissionError.details = error.message;
        setError(submissionError);
        throw submissionError;
      }
      
      if (data?.error) {
        console.error("[useFormSubmission]: Data error:", data.error);
        
        // Log data error to database
        await logSubmissionError(
          'submission_error',
          data.error,
          'DataError',
          { response_data: data }
        );
        
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
      
      // Return success result with entryId
      return { success: true, entryId: data?.entryId };
    } catch (e) {
      console.error("[useFormSubmission]: Catch block error:", e);
      
      // Log the error to database for tracking
      const errorType = categorizeError(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      
      // Only log if we haven't already logged above (edge function or data errors)
      if (errorType !== 'EdgeFunctionError' && !errorMessage.includes('Fel vid inskickning')) {
        await logSubmissionError(
          'submission_error',
          errorMessage,
          errorType,
          { stack: e instanceof Error ? e.stack : undefined }
        );
      }
      
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
      
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  }, [supabase, isSubmitted, tokenManager, logSubmissionError]);

  // Retry submission with the last data
  const retrySubmission = useCallback(async (): Promise<{ success: boolean; entryId?: string }> => {
    if (!lastSubmissionData) {
      console.error("[useFormSubmission]: No submission data for retry");
      return { success: false };
    }
    
    const { token, values, schema, formattedText, isOptician, kioskCustomerData } = lastSubmissionData;
    console.log("[useFormSubmission]: Retrying submission...");
    
    // Log retry attempt to database
    await logSubmissionError(
      'submission_retry',
      'User initiated retry',
      'RetryAttempt',
      { previous_attempts: submissionAttempts }
    );
    
    // Clear previous error
    setError(null);
    
    return await submitForm(token, values, schema, formattedText, isOptician, kioskCustomerData);
  }, [submitForm, logSubmissionError, submissionAttempts]);

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
