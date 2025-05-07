
/**
 * This hook unifies form submission handling for both patient and optician modes.
 * It provides a common interface but adapts to different submission methods based on mode.
 * Enhanced to handle JWT expiration errors and auto-refresh functionality.
 * Improved error handling and token refresh for both patient and optician modes.
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
}

export function useFormSubmissionManager({ 
  token, 
  mode,
  onSubmissionError
}: FormSubmissionManagerProps) {
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const { supabase, refreshClient } = useSupabaseClient();
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  
  // Use the standard patient form submission hook
  const patientSubmission = useFormSubmission();
  
  // Watch for JWT errors and try to handle them
  useEffect(() => {
    if (patientSubmission.error?.message?.includes('JWT')) {
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
        onSubmissionError(patientSubmission.error);
      }
    }
  }, [patientSubmission.error, refreshClient, onSubmissionError]);
  
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
  
  // Optician-specific mutation
  const opticianMutation = useMutation({
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
      
      if (!data.formTemplate) {
        throw new Error("Ingen formulärmall hittades");
      }
      
      const { values, formTemplate, formattedAnswers } = data;
      
      console.log("[useFormSubmissionManager]: Optician submitting form with values:", values);
      
      // Generate formatted raw data for better AI understanding
      let formattedRawData = null;
      
      try {
        if (formattedAnswers) {
          // If pre-formatted answers provided, use that
          formattedRawData = formattedAnswers;
        } else {
          // Otherwise generate from the template and values
          const formattedAnswersObj = extractFormattedAnswers(values);
          if (formattedAnswersObj) {
            formattedRawData = createOptimizedPromptInput(formTemplate.schema, formattedAnswersObj);
          } else {
            // Fallback to simple formatting
            formattedRawData = "Patientens anamnesinformation:\n\n";
            Object.entries(values)
              .filter(([key]) => !['formMetadata', 'metadata'].includes(key))
              .forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                  formattedRawData += `${key}: ${JSON.stringify(value)}\n`;
                }
              });
          }
        }
        
        console.log("[useFormSubmissionManager]: Generated formatted raw data:", formattedRawData?.substring(0, 100) + "...");
      } catch (error) {
        console.error("[useFormSubmissionManager]: Error generating formatted raw data:", error);
        // Continue with submission even if formatting fails
      }
      
      // Prepare submission data
      const submissionData = {
        answers: values,
        formatted_raw_data: formattedRawData,
        status: "ready", // Status already correctly set to "ready" for optician-filled forms
        updated_at: new Date().toISOString()
      };
      
      // IMPROVED: Added more robust error handling and retry mechanisms
      try {
        console.log("[useFormSubmissionManager]: Pre-emptively refreshing client before submission");
        // Always refresh the client before attempting submission
        await refreshClient();
        
        console.log("[useFormSubmissionManager]: Submitting form data to Supabase");
        // Update the entry with the form answers
        const { error } = await supabase
          .from("anamnes_entries")
          .update(submissionData)
          .eq("access_token", token);
        
        if (error) {
          console.error("[useFormSubmissionManager]: Error during submission:", error);
          
          // If we get an auth error, try to refresh and retry
          if (error.message?.includes('JWT') || 
              error.code === 'PGRST301' || 
              error.message?.includes('auth') || 
              error.message?.includes('token')) {
            
            console.log("[useFormSubmissionManager]: JWT/auth error detected, refreshing token and retrying");
            const refreshSuccess = await handleJwtError();
            
            if (!refreshSuccess) {
              const submissionError = new Error("Autentiseringsfel: Kunde inte förnya din session") as SubmissionError;
              submissionError.details = error.message;
              submissionError.status = 401;
              submissionError.recoverable = false;
              throw submissionError;
            }
            
            console.log("[useFormSubmissionManager]: Retrying submission after token refresh");
            // Try once more after refresh with delay to ensure the refresh completes
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { error: retryError } = await supabase
              .from("anamnes_entries")
              .update(submissionData)
              .eq("access_token", token);
              
            if (retryError) {
              console.error("[useFormSubmissionManager]: Submission retry failed:", retryError);
              const submissionError = new Error("Kunde inte skicka formuläret efter att ha förnyat sessionen: " + retryError.message) as SubmissionError;
              submissionError.details = retryError.message;
              submissionError.status = retryError.code === 'PGRST301' ? 401 : 500;
              submissionError.recoverable = false;
              throw submissionError;
            }
          } else {
            const submissionError = new Error("Kunde inte skicka formuläret: " + error.message) as SubmissionError;
            submissionError.details = error.message;
            submissionError.status = 500;
            submissionError.recoverable = true;
            throw submissionError;
          }
        }
        
        console.log("[useFormSubmissionManager]: Submission completed successfully");
      } catch (error: any) {
        // Create a more detailed error for the caller
        console.error("[useFormSubmissionManager]: Submission process error:", error);
        
        if (error.message?.includes('JWT') || error.message?.toLowerCase().includes('auth') || error.message?.includes('token')) {
          if (onSubmissionError) {
            const submissionError = new Error("Autentiseringsfel: " + error.message) as SubmissionError;
            submissionError.details = error.message;
            submissionError.status = 401;
            submissionError.recoverable = false;
            onSubmissionError(submissionError);
          }
        }
        throw error;
      }
      
      // Set local state to indicate successful submission
      setLocalSubmitted(true);
      console.log("[useFormSubmissionManager]: Successfully set form as submitted");
    },
    onSuccess: () => {
      toast({
        title: "Formuläret har skickats in",
        description: "Tack för din ifyllda information",
      });
    },
    onError: (error: Error) => {
      console.error("[useFormSubmissionManager]: Optician mutation error:", error);
      
      // If JWT error, try to handle it
      if (error.message?.includes('JWT') || 
          error.message?.toLowerCase().includes('auth') || 
          error.message?.includes('token')) {
        if (onSubmissionError) {
          const submissionError = error as SubmissionError;
          submissionError.status = 401;
          submissionError.recoverable = false;
          onSubmissionError(submissionError);
        }
      }
      
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Kunde inte skicka in formuläret",
        variant: "destructive",
      });
    }
  });

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
    
    console.log(`[useFormSubmissionManager]: Submitting form in ${mode} mode`);
    
    if (mode === 'optician') {
      // Use optician submission flow
      await opticianMutation.mutateAsync({ values, formTemplate, formattedAnswers });
      return !opticianMutation.error;
    } else {
      // Generate formatted raw data for patient submission
      let formattedText = formattedAnswers;
      
      // If no pre-formatted answers, try to generate them
      if (!formattedText && formTemplate) {
        try {
          const formattedAnswersObj = extractFormattedAnswers(values);
          if (formattedAnswersObj) {
            formattedText = createOptimizedPromptInput(formTemplate.schema, formattedAnswersObj);
          }
        } catch (error) {
          console.error("[useFormSubmissionManager]: Error generating formatted text for patient submission:", error);
          // Continue with submission even if formatting fails
        }
      }
      
      // Use patient submission flow
      return await patientSubmission.submitForm(token, values, formTemplate?.schema, formattedText);
    }
  }, [token, mode, opticianMutation, patientSubmission]);

  // Handle retry for submission errors
  const handleRetrySubmission = useCallback(async () => {
    if (mode === 'optician' && opticianMutation.error) {
      console.log("[useFormSubmissionManager]: Retrying optician submission");
      
      // If the error is JWT related, try to refresh first
      if (opticianMutation.error.message?.includes('JWT') || 
          opticianMutation.error.message?.toLowerCase().includes('auth') || 
          opticianMutation.error.message?.includes('token')) {
        
        const refreshSuccess = await handleJwtError();
        if (!refreshSuccess) {
          console.log("[useFormSubmissionManager]: Token refresh failed during retry");
          return false;
        }
      }
      
      opticianMutation.reset();
      return false; // Need to re-submit with complete data
    } else {
      console.log("[useFormSubmissionManager]: Retrying patient submission");
      return await patientSubmission.retrySubmission();
    }
  }, [mode, opticianMutation, patientSubmission, handleJwtError]);

  // Reset error handler
  const resetError = useCallback(() => {
    if (mode === 'optician') {
      opticianMutation.reset();
    } else {
      patientSubmission.resetError();
    }
  }, [mode, opticianMutation, patientSubmission]);
  
  // Determine submission error
  const submissionError = mode === 'optician' 
    ? (opticianMutation.error as SubmissionError | null)
    : patientSubmission.error;
  
  // Determine submission status
  const isSubmitting = mode === 'optician' 
    ? (opticianMutation.isPending || isRefreshingToken)
    : (patientSubmission.isSubmitting || isRefreshingToken);
  
  // Determine submitted status
  const isSubmitted = mode === 'optician'
    ? localSubmitted
    : patientSubmission.isSubmitted;
  
  return {
    isSubmitting,
    submissionError,
    isSubmitted,
    localSubmitted,
    submissionAttempts: mode === 'patient' ? patientSubmission.submissionAttempts : 0,
    handleFormSubmit,
    handleRetrySubmission,
    resetError
  };
}
