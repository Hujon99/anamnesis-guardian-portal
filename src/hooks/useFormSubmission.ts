
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

  const submitForm = async (token: string, values: Record<string, any>, formTemplate?: FormTemplate) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare the submission data
      const submissionData = formTemplate 
        ? prepareFormSubmission(formTemplate, values)
        : { answers: values }; // Fallback for backward compatibility

      console.log("Submitting form with data:", JSON.stringify(submissionData, null, 2));
      
      // Submit the form using the edge function
      const response = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: submissionData
        }
      });

      // Process the response
      if (response.error) {
        throw new Error(
          response.error.message || "Ett fel uppstod vid formulärinskickning"
        );
      }

      // Success handling
      setIsSubmitted(true);
      
      toast({
        title: "Tack för dina svar!",
        description: "Dina svar har skickats in framgångsrikt.",
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
