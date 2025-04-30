
/**
 * This hook manages the form submission process for patient anamnesis forms.
 * It handles submission state, error handling, and interacts with the API
 * to send the processed form data to the submit-form edge function.
 * Enhanced with better error handling and detailed logging for debugging.
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
      hasTemplate: !!formTemplate 
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
      
      // Prepare the submission data, using the pre-processed data if available
      const submissionData = formTemplate 
        ? prepareFormSubmission(formTemplate, values, preProcessedFormattedAnswers, isOpticianSubmission)
        : { answers: values }; // Fallback for backward compatibility

      console.log("[useFormSubmission/submitForm]: Submission data prepared");
      
      // Submit the form using the edge function
      console.log("[useFormSubmission/submitForm]: Calling supabase edge function 'submit-form'");
      const response = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: submissionData
        }
      });

      console.log("[useFormSubmission/submitForm]: Response received from edge function:", response);

      // Process the response
      if (response.error) {
        console.error("[useFormSubmission/submitForm]: Form submission error:", response.error);
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
      
      toast({
        title: "Det gick inte att skicka in formuläret",
        description: err.message || "Ett oväntat fel uppstod.",
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
