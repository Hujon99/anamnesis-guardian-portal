/**
 * This hook manages the form submission process for patient anamnesis forms.
 * It handles submission state, error handling, and interacts with the API
 * to send the processed form data to the submit-form edge function.
 * Simplified to use a consistent, flat data structure that matches the optician mode.
 */

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { FormTemplate } from "@/types/anamnesis";
import { supabase } from "@/integrations/supabase/client";

export interface SubmissionError extends Error {
  status?: number;
  details?: string;
  recoverable?: boolean;
}

export const useFormSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);
  const [lastAttemptValues, setLastAttemptValues] = useState<Record<string, any> | null>(null);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);

  const resetError = () => {
    setError(null);
  };

  const retrySubmission = async (): Promise<boolean> => {
    if (!lastAttemptValues) {
      console.error("[useFormSubmission/retrySubmission]: No values to retry with");
      return false;
    }
    
    // Extract the stored values from last attempt
    const { token, values, formTemplate } = lastAttemptValues;
    console.log("[useFormSubmission/retrySubmission]: Retrying submission with stored values");
    return await submitForm(token, values, formTemplate);
  };

  const submitForm = async (
    token: string, 
    values: Record<string, any>, 
    formTemplate?: FormTemplate,
    preProcessedFormattedAnswers?: any
  ): Promise<boolean> => {
    console.log("[useFormSubmission/submitForm]: Starting form submission with simplified structure", { 
      hasToken: !!token, 
      valuesCount: Object.keys(values).length,
      hasTemplate: !!formTemplate,
      attemptCount: submissionAttempts + 1,
      hasFormattedRawData: !!values.formattedRawData || !!preProcessedFormattedAnswers
    });
    
    // Store values for potential retry
    setLastAttemptValues({ token, values, formTemplate });
    setSubmissionAttempts(prev => prev + 1);
    
    setIsSubmitting(true);
    setError(null);

    // Circuit breaker to prevent stuck states
    const submissionTimeout = setTimeout(() => {
      if (isSubmitting) {
        console.warn("[useFormSubmission/submitForm]: Submission taking too long, may be stuck");
      }
    }, 15000);

    try {
      // SIMPLIFICATION: Create a flat, consistent data structure similar to optician mode
      
      // Get formatted raw data from either provided parameter or values object
      let formattedRawData = preProcessedFormattedAnswers;
      if (!formattedRawData && values.formattedRawData) {
        formattedRawData = values.formattedRawData;
      }
      
      console.log("[useFormSubmission/submitForm]: Using formatted raw data:", {
        source: preProcessedFormattedAnswers ? "preProcessed" : (values.formattedRawData ? "values object" : "none"),
        length: formattedRawData?.length || 0,
        sample: formattedRawData ? formattedRawData.substring(0, 100) + "..." : "N/A"
      });
      
      // Clean up any metadata or unnecessary fields
      const cleanedValues = { ...values };
      
      // Handle conditional fields - filter out values that are not needed
      for (const key in cleanedValues) {
        // Skip metadata fields
        if (key.startsWith('_')) continue;
        
        // If this is a follow-up field (_for_), check if parent condition is met
        if (key.includes('_for_')) {
          const [parentId, parentValue] = key.split('_for_');
          const normalizedParentValue = parentValue.replace(/_/g, ' ');
          
          const parentFieldValue = values[parentId];
          let shouldKeep = false;
          
          // Check if parent field has this value selected
          if (Array.isArray(parentFieldValue)) {
            // For checkboxes, see if the parent value is in the array
            shouldKeep = parentFieldValue.includes(normalizedParentValue);
          } else {
            // For radio/select, check if equal
            shouldKeep = parentFieldValue === normalizedParentValue;
          }
          
          if (!shouldKeep) {
            console.log(`[useFormSubmission/submitForm]: Removing unused follow-up field "${key}"`);
            delete cleanedValues[key];
          }
        }
      }
      
      // SIMPLIFIED APPROACH: Create a flat structure matching the optician mode
      // This is the key simplification that makes both modes consistent
      const submissionData = {
        // Include answers directly at top level
        ...cleanedValues,
        
        // Always include formatted_raw_data (snake_case for database compatibility)
        formatted_raw_data: formattedRawData,
        
        // Set status to "submitted"
        status: "submitted",
        
        // Update timestamp
        updated_at: new Date().toISOString()
      };

      console.log("[useFormSubmission/submitForm]: Simplified submission data structure:", {
        directAnswersKeys: Object.keys(submissionData).slice(0, 5),
        hasFormattedRawData: !!submissionData.formatted_raw_data,
        formattedRawDataLength: submissionData.formatted_raw_data?.length || 0,
        status: submissionData.status
      });
      
      // Submit the form using the edge function
      console.log("[useFormSubmission/submitForm]: Calling supabase edge function 'submit-form'");
      
      // Log current Supabase URL to verify edge function endpoint
      console.log("[useFormSubmission/submitForm]: Using Supabase URL:", supabase.functions.url);
      
      try {
        // Attempt direct invocation with clear payload structure
        console.log("[useFormSubmission/submitForm]: Sending data to edge function with payload:", {
          token,
          answersStructure: {
            hasDirectValues: true,
            hasFormattedRawData: !!submissionData.formatted_raw_data,
            status: submissionData.status
          }
        });
        
        const response = await supabase.functions.invoke('submit-form', {
          body: { 
            token,
            // Simplified: Just send the answers directly, matching optician flow
            answers: submissionData
          }
        });
        
        console.log("[useFormSubmission/submitForm]: Edge function response:", {
          hasError: !!response.error,
          hasData: !!response.data,
          status: response.error?.status || 200,
          data: response.data ? JSON.stringify(response.data).substring(0, 100) : null,
          error: response.error ? JSON.stringify(response.error).substring(0, 100) : null
        });
        
        // Process the response
        if (response.error) {
          console.error("[useFormSubmission/submitForm]: Edge function returned error:", response.error);
          
          // Create a more detailed error
          const submissionError: SubmissionError = new Error(
            response.error.message || "Ett fel uppstod vid formulärinskickning"
          );
          
          submissionError.status = response.error.status;
          submissionError.details = response.error.details || response.error.message;
          submissionError.recoverable = response.error.status !== 404 && response.error.status !== 410 && response.error.status !== 401;
          
          throw submissionError;
        }

        console.log("[useFormSubmission/submitForm]: Edge function invocation successful:", response.data);
        
        // Success handling
        setIsSubmitted(true);
        
        toast({
          title: "Tack för dina svar!",
          description: "Dina svar har skickats in framgångsrikt.",
        });
        
        clearTimeout(submissionTimeout);
        return true;
      } catch (invocationError: any) {
        // Specific error handling for edge function invocation failures
        console.error("[useFormSubmission/submitForm]: Edge function invocation error:", invocationError);
        
        // Add fallback approach if the edge function fails
        if (invocationError.message?.includes('Failed to fetch') || invocationError.message?.includes('NetworkError')) {
          console.log("[useFormSubmission/submitForm]: Network error detected, attempting direct database update");
          
          try {
            // Attempt direct database update as fallback
            const { error: directUpdateError } = await supabase
              .from("anamnes_entries")
              .update(submissionData)
              .eq("access_token", token);
            
            if (directUpdateError) {
              console.error("[useFormSubmission/submitForm]: Direct database update failed:", directUpdateError);
              throw new Error(`Fallback database update failed: ${directUpdateError.message}`);
            }
            
            console.log("[useFormSubmission/submitForm]: Direct database update successful");
            
            // Success handling for fallback
            setIsSubmitted(true);
            
            toast({
              title: "Tack för dina svar!",
              description: "Dina svar har skickats in framgångsrikt via alternativ metod.",
            });
            
            clearTimeout(submissionTimeout);
            return true;
          } catch (fallbackError) {
            console.error("[useFormSubmission/submitForm]: Fallback approach failed:", fallbackError);
            throw fallbackError;
          }
        }
        
        // Re-throw the original error if not a network error or fallback failed
        throw invocationError;
      }
    } catch (err: any) {
      // Enhanced error handling
      console.error("[useFormSubmission/submitForm]: Form submission error:", err);
      
      // Create a proper submission error object
      const submissionError: SubmissionError = err instanceof Error ? err : new Error(err?.message || "Ett oväntat fel uppstod.");
      
      if (!submissionError.status) {
        // Set status and recoverable flag based on error type
        if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
          submissionError.status = 0;
          submissionError.details = "Nätverksfel - Kunde inte ansluta till servern";
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
      
      clearTimeout(submissionTimeout);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    isSubmitted,
    error,
    submitForm,
    retrySubmission,
    resetError,
    submissionAttempts
  };
};
