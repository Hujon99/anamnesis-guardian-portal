
/**
 * This hook unifies form submission handling for both patient and optician modes.
 * It provides a common interface but adapts to different submission methods based on mode.
 */

import { useState, useCallback } from 'react';
import { useFormSubmission } from './useFormSubmission';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import { FormTemplateWithMeta } from './useFormTemplate';

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
      
      // Prepare submission data
      const submissionData = {
        answers: values,
        formatted_raw_data: formattedAnswers ? JSON.stringify(formattedAnswers) : null,
        status: "ready", // Set status to "ready" for optician-filled forms
        updated_at: new Date().toISOString()
      };
      
      // Update the entry with the form answers
      const { error } = await supabase
        .from("anamnes_entries")
        .update(submissionData)
        .eq("access_token", token);
      
      if (error) {
        throw new Error("Kunde inte skicka formuläret: " + error.message);
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
      // Use optician submission flow
      await opticianMutation.mutateAsync({ values, formTemplate, formattedAnswers });
      return !opticianMutation.error;
    } else {
      // Use patient submission flow
      return await patientSubmission.submitForm(token, values, formTemplate?.schema, formattedAnswers);
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
    ? (opticianMutation.error as Error) || null
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
