
/**
 * This hook manages the form submission process for patient anamnesis forms.
 * It handles submission state, error handling, and interacts with the API
 * to send the processed form data to the submit-form edge function.
 * Enhanced with better error handling, detailed logging for debugging,
 * payload validation, and robust recovery mechanisms for failed submissions.
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
    // Validate inputs before proceeding
    if (!token) {
      console.error("[useFormSubmission/submitForm]: Missing token");
      const submissionError = new Error("Missing token") as SubmissionError;
      submissionError.recoverable = false;
      setError(submissionError);
      return false;
    }
    
    if (!values || typeof values !== 'object') {
      console.error("[useFormSubmission/submitForm]: Invalid form values:", values);
      const submissionError = new Error("Invalid form values") as SubmissionError;
      submissionError.recoverable = false;
      setError(submissionError);
      return false;
    }
    
    // Debug information
    console.log("[useFormSubmission/submitForm]: Starting submission with token:", token.substring(0, 6) + "...");
    console.log("[useFormSubmission/submitForm]: Form values structure:", {
      keys: Object.keys(values),
      hasMetadata: !!values._metadata,
      valueTypes: Object.entries(values).map(([k, v]) => `${k}: ${Array.isArray(v) ? 'array' : typeof v}`).join(', ')
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
      
      // Prepare the submission data, using the pre-processed data if available
      const submissionData = formTemplate 
        ? prepareFormSubmission(formTemplate, cleanedValues, preProcessedFormattedAnswers, isOpticianSubmission)
        : { answers: cleanedValues }; // Fallback for backward compatibility

      // Verify we have valid submission data
      if (!submissionData) {
        throw new Error("Failed to prepare submission data");
      }
      
      // More detailed logging of the actual data structure being sent
      console.log("[useFormSubmission/submitForm]: Prepared submission data:", {
        hasRawAnswers: !!submissionData.rawAnswers,
        hasFormattedAnswers: !!submissionData.formattedAnswers,
        dataStructure: Object.keys(submissionData).join(', '),
        tokenLength: token.length
      });
      
      // Double check that we have the necessary data
      if (typeof submissionData !== 'object' || Object.keys(submissionData).length === 0) {
        throw new Error("Submission data is empty or invalid");
      }
      
      // Create the final payload for the edge function
      const edgeFunctionPayload = {
        token,
        answers: submissionData
      };
      
      console.log("[useFormSubmission/submitForm]: Edge function payload structure:", {
        hasToken: !!edgeFunctionPayload.token,
        hasAnswers: !!edgeFunctionPayload.answers,
        payloadSize: JSON.stringify(edgeFunctionPayload).length
      });
      
      console.log("[useFormSubmission/submitForm]: Calling supabase edge function 'submit-form'");
      
      // Submit the form using the edge function with improved error handling
      // More robust error handling with retries
      let retryCount = 0;
      const maxRetries = 2;
      let response: any = null;
      let responseError: any = null;
      
      while (retryCount <= maxRetries) {
        try {
          console.log("[useFormSubmission/submitForm]: Sending data to edge function, attempt", retryCount + 1);
          
          // Modified: Simplified headers by removing cache-control and pragma
          const functionResponse = await supabase.functions.invoke('submit-form', {
            body: edgeFunctionPayload,
            headers: {
              'X-Client-Info': `useFormSubmission/${retryCount+1}`
            }
          });
          
          response = functionResponse;
          
          // Check for errors from the edge function
          if (response.error) {
            responseError = response.error;
            console.warn(`[useFormSubmission/submitForm]: Error in attempt ${retryCount + 1}/${maxRetries + 1}:`, responseError);
            
            // If we've reached max retries, break and handle the error
            if (retryCount >= maxRetries) {
              break;
            }
            
            // Otherwise, increment retry counter and continue
            retryCount++;
            
            // Wait before retrying (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount)));
            console.log(`[useFormSubmission/submitForm]: Retrying submission, attempt ${retryCount + 1}/${maxRetries + 1}`);
          } else {
            // Success! Break the retry loop
            console.log("[useFormSubmission/submitForm]: Edge function responded with success");
            responseError = null;
            break;
          }
        } catch (invocationError: any) {
          console.error("[useFormSubmission/submitForm]: Function invocation error:", invocationError);
          
          // Check if this is likely a CORS issue
          if (invocationError.message?.includes('NetworkError') || 
              invocationError.message?.includes('Failed to fetch') ||
              !invocationError.status) {
            console.error("[useFormSubmission/submitForm]: Possible CORS or network issue detected");
          }
          
          responseError = invocationError;
          
          if (retryCount >= maxRetries) {
            break;
          }
          
          retryCount++;
          
          // Wait before retrying
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount)));
          console.log(`[useFormSubmission/submitForm]: Retrying after error, attempt ${retryCount + 1}/${maxRetries + 1}`);
        }
      }

      // If we still have an error after all retries
      if (responseError || !response) {
        const errorMessage = responseError?.message || "Failed to get response after multiple attempts";
        console.error("[useFormSubmission/submitForm]: Form submission error after all retries:", errorMessage);
        
        // Create a more detailed error
        const submissionError: SubmissionError = new Error(errorMessage);
        submissionError.status = responseError?.status || 500;
        submissionError.details = responseError?.details || responseError?.message;
        submissionError.recoverable = true; // Set most errors as recoverable for better UX
        
        throw submissionError;
      }

      // Check if the response data indicates a successful submission
      if (response.data?.success) {
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
      } else {
        // The API returned a response but not a success status
        console.error("[useFormSubmission/submitForm]: Form submission response didn't indicate success:", response.data);
        throw new Error(response.data?.error || "Oväntat svar från servern");
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
          submissionError.details = "Nätverksfel - Kunde inte ansluta till servern. Möjligt CORS-problem.";
          submissionError.recoverable = true;
        } else if (err.message?.includes('JWT')) {
          submissionError.status = 401;
          submissionError.details = "Autentiseringsfel - JWT-token har gått ut eller är ogiltig";
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
      } else if (submissionError.message?.includes('JWT')) {
        errorMessage = "Din session har gått ut. Vänligen ladda om sidan och försök igen.";
      } else if (submissionError.status >= 500) {
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
