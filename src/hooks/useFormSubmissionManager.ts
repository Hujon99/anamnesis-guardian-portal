/**
 * This hook unifies form submission handling for both patient and optician modes.
 * It provides a common interface but adapts to different submission methods based on mode.
 * Simplified to ensure consistent data structure between patient and optician modes.
 */

import { useState, useCallback } from 'react';
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
  recoverable?: boolean;
};

export type SubmissionMode = 'patient' | 'optician';

interface FormSubmissionManagerProps {
  token: string | null;
  mode: SubmissionMode;
}

export function useFormSubmissionManager({ token, mode }: FormSubmissionManagerProps) {
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const { supabase } = useSupabaseClient();
  
  // Use the standard patient form submission hook
  const patientSubmission = useFormSubmission();
  
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
      
      // SIMPLIFIED: Use a flat structure with formatted_raw_data at the top level
      const submissionData = {
        // Include the direct answers
        ...values,
        // Always include formatted_raw_data for database (snake_case)
        formatted_raw_data: formattedRawData,
        // Set status to "ready" for optician-filled forms
        status: "ready",
        updated_at: new Date().toISOString()
      };
      
      console.log("[useFormSubmissionManager]: Optician submission data:", {
        hasDirectAnswers: true,
        directAnswersCount: Object.keys(values).length,
        hasFormattedRawData: !!submissionData.formatted_raw_data,
        formattedRawDataLength: submissionData.formatted_raw_data?.length || 0,
      });
      
      // Update the entry with the form answers
      const { error } = await supabase
        .from("anamnes_entries")
        .update(submissionData)
        .eq("access_token", token);
      
      if (error) {
        const submissionError = new Error("Kunde inte skicka formuläret: " + error.message) as SubmissionError;
        submissionError.details = error.message;
        submissionError.recoverable = true;
        throw submissionError;
      }
      
      // Set local state to indicate successful submission
      setLocalSubmitted(true);
    },
    onSuccess: () => {
      toast({
        title: "Formuläret har skickats in",
        description: "Tack för din ifyllda information",
      });
    },
    onError: (error: Error) => {
      console.error("[useFormSubmissionManager]: Optician mutation error:", error);
      
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
      // Use optician submission flow - direct database update
      await opticianMutation.mutateAsync({ values, formTemplate, formattedAnswers });
      return !opticianMutation.error;
    } else {
      // Generate formatted raw data for patient submission if not already provided
      let formattedRawData = formattedAnswers;
      
      // If no pre-formatted answers, try to generate them
      if (!formattedRawData && formTemplate) {
        try {
          const formattedAnswersObj = extractFormattedAnswers(values);
          if (formattedAnswersObj) {
            formattedRawData = createOptimizedPromptInput(formTemplate.schema, formattedAnswersObj);
            console.log("[useFormSubmissionManager]: Generated formatted raw data for patient submission:", 
              formattedRawData?.substring(0, 100) + "...");
          }
        } catch (error) {
          console.error("[useFormSubmissionManager]: Error generating formatted text for patient submission:", error);
          // Continue with submission even if formatting fails
        }
      }
      
      // SIMPLIFIED: Create a flat structure with formatted_raw_data at the top level
      // This matches what the optician mode sends
      const enhancedValues = {
        ...values,
        formatted_raw_data: formattedRawData   // snake_case for database
      };
      
      console.log("[useFormSubmissionManager]: Patient submission using simplified approach:", {
        hasFormattedRawData: !!enhancedValues.formatted_raw_data,
        dataLength: formattedRawData?.length || 0
      });
      
      // Use patient submission flow with enhanced values
      return await patientSubmission.submitForm(
        token,
        enhancedValues,
        formTemplate?.schema,
        formattedRawData // Pass formatted data explicitly as backup
      );
    }
  }, [token, mode, opticianMutation, patientSubmission]);

  // Retry submission handler
  const handleRetrySubmission = useCallback(async () => {
    if (mode === 'optician' && opticianMutation.error) {
      console.log("[useFormSubmissionManager]: Retrying optician submission");
      opticianMutation.reset();
      return false; // Need to re-submit with complete data
    } else {
      console.log("[useFormSubmissionManager]: Retrying patient submission");
      return await patientSubmission.retrySubmission();
    }
  }, [mode, opticianMutation, patientSubmission]);

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
    ? opticianMutation.isPending 
    : patientSubmission.isSubmitting;
  
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
