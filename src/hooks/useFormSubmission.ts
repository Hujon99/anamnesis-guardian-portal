
/**
 * This hook manages the form submission process for patient anamnesis forms.
 * It handles submission state, error handling, and interacts with the API
 * to send the processed form data.
 */

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { prepareFormSubmission } from "@/utils/formSubmissionUtils";
import { FormTemplate } from "@/types/anamnesis";

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

      // Call the submit-form edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-form`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            token,
            answers: submissionData,
          }),
        }
      );

      // Process the response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Ett fel uppstod (${response.status})`
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
