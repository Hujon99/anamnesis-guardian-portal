
/**
 * This hook manages the form submission process for patient anamnesis forms.
 * It handles submission state, error handling, and interacts with the API
 * to send the processed form data to the submit-form edge function.
 * Enhanced with better error handling, detailed logging for debugging.
 * Now includes conditional validation for form submissions.
 */

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { prepareFormSubmission } from "@/utils/formSubmissionUtils";
import { FormTemplate } from "@/types/anamnesis";
import { supabase } from "@/integrations/supabase/client";

export const useFormSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
      sampleKeys: Object.keys(values).slice(0, 5)
    });
    
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
      
      // Prepare the submission data, using the pre-processed data if available
      const submissionData = formTemplate 
        ? prepareFormSubmission(formTemplate, cleanedValues, preProcessedFormattedAnswers, isOpticianSubmission)
        : { answers: cleanedValues }; // Fallback for backward compatibility

      console.log("[useFormSubmission/submitForm]: Submission data prepared:", {
        hasRawAnswers: !!submissionData.rawAnswers,
        hasFormattedAnswers: !!submissionData.formattedAnswers,
        hasMetadata: !!submissionData.metadata,
        rawAnswersKeys: submissionData.rawAnswers ? Object.keys(submissionData.rawAnswers).slice(0, 3) : []
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
          
          response = await supabase.functions.invoke('submit-form', {
            body: { 
              token,
              answers: submissionData
            }
          });
          
          console.log("[useFormSubmission/submitForm]: Edge function response:", {
            hasError: !!response.error,
            hasData: !!response.data,
            status: response.error?.status || 200
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
        } catch (invocationError) {
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
        throw new Error(
          response.error.message || "Ett fel uppstod vid formulärinskickning"
        );
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
      // Error handling
      console.error("[useFormSubmission/submitForm]: Form submission error:", err);
      setError(err);
      
      // Show a more detailed error message based on the type of error
      let errorMessage = err.message || "Ett oväntat fel uppstod.";
      
      // Network error detection
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = "Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen.";
      }
      
      // Generic API error
      if (err.status >= 500) {
        errorMessage = "Ett serverfel uppstod. Försök igen senare.";
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
  };
};
