
/**
 * This hook handles the form submission process for patient anamnesis forms.
 * It encapsulates the form submission logic, status tracking, and error handling.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type FormSubmissionState = {
  isSubmitting: boolean;
  error: string | null;
  isSubmitted: boolean;
};

type FormSubmissionResult = FormSubmissionState & {
  submitForm: (token: string, values: any) => Promise<void>;
};

export const useFormSubmission = (): FormSubmissionResult => {
  const [state, setState] = useState<FormSubmissionState>({
    isSubmitting: false,
    error: null,
    isSubmitted: false
  });

  const submitForm = async (token: string, values: any) => {
    if (!token) return;
    
    try {
      setState(prev => ({ ...prev, isSubmitting: true, error: null }));
      
      const formMetadata = {
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      };
      
      // Submit the form using the edge function
      const response = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: values,
          formData: formMetadata
        }
      });

      if (response.error) {
        // Handle specific error cases
        if (response.error.message.includes('gått ut') || response.data?.status === 'expired') {
          setState(prev => ({
            ...prev,
            isSubmitting: false,
            error: "Länken har gått ut",
            isSubmitted: false
          }));
        } else {
          setState(prev => ({
            ...prev,
            isSubmitting: false,
            error: response.error.message || "Det gick inte att skicka formuläret.",
            isSubmitted: false
          }));
        }
        return;
      }

      // Form submitted successfully
      setState({
        isSubmitting: false,
        error: null,
        isSubmitted: true
      });
      
    } catch (err) {
      console.error("Error submitting form:", err);
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: "Ett tekniskt fel uppstod vid inskickning. Försök igen senare.",
        isSubmitted: false
      }));
    }
  };

  return { ...state, submitForm };
};
