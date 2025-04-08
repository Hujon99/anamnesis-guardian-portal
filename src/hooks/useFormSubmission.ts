
/**
 * This hook manages the form submission process for patient anamnesis forms.
 * It handles submission state, error handling, and interacts with the API
 * to send the processed form data to the submit-form edge function.
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
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Extract metadata for optician submissions if present
      const isOpticianSubmission = values._metadata?.submittedBy === 'optician';
      const autoSetStatus = values._metadata?.autoSetStatus;
      let metadata = values._metadata;
      
      // Remove _metadata from values to prevent it from being included in answers
      if (values._metadata) {
        const { _metadata, ...restValues } = values;
        values = restValues;
      }
      
      // Prepare the submission data, using the pre-processed data if available
      const submissionData = formTemplate 
        ? prepareFormSubmission(formTemplate, values, preProcessedFormattedAnswers, isOpticianSubmission)
        : { answers: values }; // Fallback for backward compatibility

      console.log("Submitting form with data:", JSON.stringify(submissionData, null, 2));
      console.log("Token:", token);
      console.log("isOpticianSubmission:", isOpticianSubmission);
      console.log("autoSetStatus:", autoSetStatus);
      
      // Reattach metadata for the edge function to process
      if (isOpticianSubmission) {
        submissionData._metadata = metadata;
      }
      
      // Submit the form using the edge function
      const response = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: submissionData
        }
      });

      // Process the response
      if (response.error) {
        console.error("Form submission error:", response.error);
        throw new Error(
          response.error.message || "Ett fel uppstod vid formulärinskickning"
        );
      }

      console.log("Form submission response:", response.data);

      // Success handling
      setIsSubmitted(true);
      
      toast({
        title: "Tack för dina svar!",
        description: isOpticianSubmission 
          ? "Formuläret har markerats som färdigt och statusen har uppdaterats." 
          : "Dina svar har skickats in framgångsrikt.",
      });
      
      return true;
    } catch (err: any) {
      // Error handling
      console.error("Form submission error:", err);
      setError(err);
      
      toast({
        title: "Det gick inte att skicka in formuläret",
        description: err.message || "Ett oväntat fel uppstod.",
        variant: "destructive",
      });
      
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
