
/**
 * This hook manages form submission specifically for optician-completed anamnesis forms.
 * It handles submission state, navigation after submission, and automatically sets the
 * appropriate status for optician-completed forms.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import { FormTemplate } from "@/types/anamnesis";
import { toast } from "sonner";

export const useOpticianFormSubmission = (token: string | null) => {
  const navigate = useNavigate();
  const [localSubmitted, setLocalSubmitted] = useState(false);
  
  const { 
    isSubmitting, 
    error: submissionError, 
    isSubmitted, 
    submitForm 
  } = useFormSubmission();

  // Handle form submission with form template
  const handleFormSubmit = async (values: any, formTemplate?: FormTemplate, formattedAnswers?: any): Promise<void> => {
    if (!token) {
      console.error("[useOpticianFormSubmission/handleFormSubmit]: No token available for submission");
      toast.error("Missing token for form submission");
      return;
    }
    
    console.log("[useOpticianFormSubmission/handleFormSubmit]: Starting form submission with values:", values);
    console.log("[useOpticianFormSubmission/handleFormSubmit]: Formatted answers:", formattedAnswers);
    console.log("[useOpticianFormSubmission/handleFormSubmit]: Token:", token);
    
    // For optician submissions, we'll set some additional metadata
    const opticianSubmissionData = {
      ...values,
      _metadata: {
        submittedBy: "optician",
        autoSetStatus: "ready" // This will be used by the submit-form function to set the status
      }
    };
    
    console.log("[useOpticianFormSubmission/handleFormSubmit]: Submitting optician form with data:", opticianSubmissionData);
    
    try {
      // Pass the optician metadata along with the form values
      const result = await submitForm(token, opticianSubmissionData, formTemplate, formattedAnswers);
      console.log("[useOpticianFormSubmission/handleFormSubmit]: Submit form result:", result);
      
      // Set local submission state on success
      if (result) {
        console.log("[useOpticianFormSubmission/handleFormSubmit]: Form submission successful, setting localSubmitted to true");
        setLocalSubmitted(true);
        
        toast.success("Formuläret har fyllts i", {
          description: "Patientens anamnes har markerats som klar för undersökning",
        });
        
        // After a short delay, navigate to the dashboard to show the updated entry
        setTimeout(() => {
          console.log("[useOpticianFormSubmission/handleFormSubmit]: Navigating to dashboard");
          navigate('/dashboard');
        }, 2000);
      } else {
        console.error("[useOpticianFormSubmission/handleFormSubmit]: Form submission failed");
        toast.error("Något gick fel", {
          description: "Formuläret kunde inte skickas in, försök igen",
        });
      }
    } catch (error) {
      console.error("[useOpticianFormSubmission/handleFormSubmit]: Error during form submission:", error);
      toast.error("Ett fel uppstod", {
        description: "Kunde inte skicka in formuläret på grund av ett tekniskt fel",
      });
    }
  };

  return {
    isSubmitting,
    submissionError,
    isSubmitted,
    localSubmitted,
    handleFormSubmit
  };
};
