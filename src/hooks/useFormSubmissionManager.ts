
/**
 * This hook unifies form submission handling for both patient and optician modes.
 * It provides a common interface but adapts to different submission methods based on mode.
 * Enhanced to handle JWT expiration errors and auto-refresh functionality.
 * Improved error handling and token refresh for both patient and optician modes.
 * UNIFIED: Now both patient and optician modes use the same robust edge function approach.
 */

import { useState, useCallback, useEffect } from 'react';
import { useFormSubmission } from './useFormSubmission';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import { FormTemplateWithMeta } from './useFormTemplate';
import { createOptimizedPromptInput, extractFormattedAnswers } from "@/utils/anamnesisTextUtils";

// Export the SubmissionError type for use in other components
// Using 'export type' syntax to comply with isolatedModules
export type { SubmissionError } from './useFormSubmission';

// Define the SubmissionError type in this file to avoid TypeScript errors
type SubmissionError = Error & {
  details?: string;
  status?: number;
  recoverable?: boolean;
};

export type SubmissionMode = 'patient' | 'optician';

interface FormSubmissionManagerProps {
  token: string | null;
  mode: SubmissionMode;
  onSubmissionError?: (error: SubmissionError) => void;
  onSubmitSuccess?: () => void;
}

export function useFormSubmissionManager({ 
  token, 
  mode,
  onSubmissionError,
  onSubmitSuccess
}: FormSubmissionManagerProps) {
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const { supabase, refreshClient } = useSupabaseClient();
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  
  // Use the standard patient form submission hook for both modes
  const formSubmission = useFormSubmission();
  
  // Watch for JWT errors and try to handle them
  useEffect(() => {
    if (formSubmission.error?.message?.includes('JWT')) {
      console.log("[useFormSubmissionManager]: JWT error detected, attempting to refresh client");
      setIsRefreshingToken(true);
      
      refreshClient(true)
        .then(() => {
          console.log("[useFormSubmissionManager]: Client refreshed successfully");
        })
        .catch(error => {
          console.error("[useFormSubmissionManager]: Failed to refresh client:", error);
        })
        .finally(() => {
          setIsRefreshingToken(false);
        });
      
      if (onSubmissionError) {
        onSubmissionError(formSubmission.error);
      }
    }
  }, [formSubmission.error, refreshClient, onSubmissionError]);
  
  // Handle JWT errors for both modes
  const handleJwtError = useCallback(async () => {
    console.log("[useFormSubmissionManager]: Handling JWT error, refreshing client");
    setIsRefreshingToken(true);
    
    try {
      // Try to refresh the client once
      await refreshClient(true);
      console.log("[useFormSubmissionManager]: Client refresh successful");
      return true;
    } catch (error) {
      console.error("[useFormSubmissionManager]: Failed to refresh client:", error);
      return false;
    } finally {
      setIsRefreshingToken(false);
    }
  }, [refreshClient]);

  // Unified submission handler
  const handleFormSubmit = useCallback(async (
    values: Record<string, any>, 
    formTemplate: FormTemplateWithMeta | null,
    formattedAnswers?: any
  ) => {
    if (!token) {
      console.error("[useFormSubmissionManager]: Cannot submit form: No token provided");
      return false;
    }
    
    console.log(`[useFormSubmissionManager]: Submitting form in ${mode} mode using edge function approach`);
    
    // Generate formatted raw data for submission
    let formattedText = formattedAnswers;
    
    // If no pre-formatted answers, try to generate them
    if (!formattedText && formTemplate) {
      try {
        const formattedAnswersObj = extractFormattedAnswers(values);
        if (formattedAnswersObj) {
          formattedText = createOptimizedPromptInput(formTemplate.schema, formattedAnswersObj);
        }
      } catch (error) {
        console.error("[useFormSubmissionManager]: Error generating formatted text:", error);
        // Continue with submission even if formatting fails
      }
    }
    
    // For optician mode, modify the values to include metadata
    let submissionValues = { ...values };
    if (mode === 'optician') {
      console.log("[useFormSubmissionManager]: Adding optician metadata to submission");
      
      // Add metadata to indicate this is an optician submission
      // The edge function will use this to set the correct status
      submissionValues._metadata = {
        submittedBy: 'optician',
        autoSetStatus: 'ready'
      };
    }
    
    // Use the same form submission method for both modes
    const result = await formSubmission.submitForm(
      token, 
      submissionValues, 
      formTemplate?.schema,
      formattedText,
      mode === 'optician' // Add flag to indicate if it's an optician submission
    );
    
    if (result?.success) {
      setLocalSubmitted(true);
      
      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    }
    
    return result;
  }, [token, mode, formSubmission]);

  // Handle retry for submission errors
  const handleRetrySubmission = useCallback(async () => {
    console.log(`[useFormSubmissionManager]: Retrying submission in ${mode} mode`);
    
    // Try to refresh JWT if needed
    if (formSubmission.error?.message?.includes('JWT')) {
      const refreshSuccess = await handleJwtError();
      if (!refreshSuccess) {
        console.log("[useFormSubmissionManager]: Token refresh failed during retry");
        return { success: false };
      }
    }
    
    return await formSubmission.retrySubmission();
  }, [mode, formSubmission, handleJwtError]);

  // Reset error handler
  const resetError = useCallback(() => {
    formSubmission.resetError();
  }, [formSubmission]);
  
  // Determine submission status
  const isSubmitting = formSubmission.isSubmitting || isRefreshingToken;
  
  // Determine submitted status
  const isSubmitted = mode === 'optician'
    ? localSubmitted
    : formSubmission.isSubmitted;
  
  return {
    isSubmitting,
    submissionError: formSubmission.error,
    isSubmitted,
    localSubmitted,
    submissionAttempts: formSubmission.submissionAttempts,
    handleFormSubmit,
    handleRetrySubmission,
    resetError
  };
}
