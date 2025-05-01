
/**
 * This hook manages the form submission process for patient anamnesis forms.
 * It handles submission state, error handling, and interacts with the API
 * to send the processed form data to the submit-form edge function.
 * Enhanced with better error handling, detailed logging for debugging,
 * and robust recovery mechanisms for failed submissions.
 * Updated to use a simplified, consistent data structure matching the optician mode.
 */

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { prepareFormSubmission } from "@/utils/formSubmissionUtils";
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
    console.log("[useFormSubmission/submitForm]: Starting form submission", { 
      hasToken: !!token, 
      valuesCount: Object.keys(values).length,
      hasTemplate: !!formTemplate,
      sampleKeys: Object.keys(values).slice(0, 5),
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
      // Extract metadata for optician submissions if present
      const isOpticianSubmission = values._metadata?.submittedBy === 'optician';
      console.log("[useFormSubmission/submitForm]: isOpticianSubmission:", isOpticianSubmission);
      
      // Handle conditional fields - filter out values that are not needed
      // If values contain keys that have parent-child relationship in conditional fields,
      // make sure we only include necessary ones
      const cleanedValues = { ...values };
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
      
      // Ensure we preserve formatted raw data if it exists
      const formattedRawData = cleanedValues.formattedRawData || preProcessedFormattedAnswers;
      
      // Prepare the submission data in a SIMPLIFIED format - more similar to optician flow
      // This simplifies what we send to the edge function
      const submissionData = {
        // Include the raw answers directly
        ...cleanedValues,
        
        // Ensure formatted_raw_data is set directly on the answers object (snake_case for DB compatibility)
        formatted_raw_data: formattedRawData,
        
        // Also include camelCase version for backward compatibility
        formattedRawData: formattedRawData
      };

      console.log("[useFormSubmission/submitForm]: Simplified submission data prepared:", {
        directAnswersKeys: Object.keys(submissionData).slice(0, 5),
        hasFormattedRawData: !!submissionData.formattedRawData,
        hasFormatted_raw_data: !!submissionData.formatted_raw_data,
        formattedRawDataLength: submissionData.formattedRawData?.length || 0
      });
      
      // Submit the form using the edge function
      console.log("[useFormSubmission/submitForm]: Calling supabase edge function 'submit-form'");
                 
      // More robust error handling with retries
      let retryCount = 0;
      const maxRetries = 2;
      let response;
      
      while (retryCount <= maxRetries) {
        try {
          console.log("[useFormSubmission/submitForm]: Sending data to edge function, attempt", retryCount + 1);
          
          // More validation before sending
          if (!submissionData || 
              (typeof submissionData === 'object' && Object.keys(submissionData).length === 0)) {
            throw new Error("Submission data is empty or invalid");
          }
          
          if (!token || typeof token !== 'string') {
            throw new Error("Invalid token format");
          }
          
          response = await supabase.functions.invoke('submit-form', {
            body: { 
              token,
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
          
          // If successful, break the retry loop
          if (!response.error) break;
          
          // If there was an error, log it and retry
          console.warn(`[useFormSubmission/submitForm]: Error attempt ${retryCount + 1}/${maxRetries + 1}:`, response.error);
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount)));
            console.log(`[useFormSubmission/submitForm]: Retrying submission, attempt ${retryCount + 1}/${maxRetries + 1}`);
          }
        } catch (invocationError: any) {
          console.error("[useFormSubmission/submitForm]: Function invocation error:", invocationError);
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Wait before retrying
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount)));
            console.log(`[useFormSubmission/submitForm]: Retrying after error, attempt ${retryCount + 1}/${maxRetries + 1}`);
          } else {
            throw invocationError;
          }
        }
      }

      // No response after all retries
      if (!response) {
        throw new Error("Failed to get response after multiple attempts");
      }

      console.log("[useFormSubmission/submitForm]: Response received from edge function:", response);

      // Process the response
      if (response.error) {
        console.error("[useFormSubmission/submitForm]: Form submission error after retries:", response.error);
        
        // Create a more detailed error
        const submissionError: SubmissionError = new Error(
          response.error.message || "Ett fel uppstod vid formulärinskickning"
        );
        
        submissionError.status = response.error.status;
        submissionError.details = response.error.details || response.error.message;
        submissionError.recoverable = response.error.status !== 404 && response.error.status !== 410 && response.error.status !== 401;
        
        throw submissionError;
      }

      console.log("[useFormSubmission/submitForm]: Form submission successful:", response.data);

      // Success handling
      setIsSubmitted(true);
      
      toast({
        title: "Tack för dina svar!",
        description: isOpticianSubmission 
          ? "Formuläret har markerats som färdigt och statusen har uppdaterats." 
          : "Dina svar har skickats in framgångsrikt.",
      });
      
      clearTimeout(submissionTimeout);
      return true;
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
