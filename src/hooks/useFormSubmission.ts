
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
      // Log the size of the user values
      console.log(`Submitting form with ${Object.keys(values).length} user values`);
      console.log("User values keys:", Object.keys(values));
      
      // Prepare the submission data
      const submissionData = formTemplate 
        ? prepareFormSubmission(formTemplate, values)
        : { answers: values }; // Fallback for backward compatibility

      // Log submission statistics
      if (formTemplate) {
        console.log("Form template sections:", formTemplate.sections.length);
        const totalQuestions = formTemplate.sections.reduce(
          (sum, section) => sum + section.questions.length, 0
        );
        console.log("Total questions in template:", totalQuestions);
        
        // Log formatted answers stats
        if (submissionData.formattedAnswers) {
          console.log(
            "Formatted sections:", 
            submissionData.formattedAnswers.answeredSections.length
          );
          const totalAnswers = submissionData.formattedAnswers.answeredSections.reduce(
            (sum, section) => sum + section.responses.length, 0
          );
          console.log("Total formatted answers:", totalAnswers);
        }
      }
      
      console.log("Submission data prepared, sending to edge function");
      
      // Submit the form using the edge function
      const response = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: submissionData
        }
      });

      // Process the response
      if (response.error) {
        console.error("Edge function returned error:", response.error);
        throw new Error(
          response.error.message || "Ett fel uppstod vid formulärinskickning"
        );
      }

      console.log("Form submitted successfully:", response.data);

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
