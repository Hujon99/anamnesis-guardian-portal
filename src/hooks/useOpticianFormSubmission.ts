
/**
 * This hook handles the submission of forms filled out by opticians.
 * It manages the submission state, error handling, and successful submission feedback.
 * Updated to work with FormTemplateWithMeta instead of just FormTemplate.
 */

import { useState } from "react";
import { useSupabaseClient } from "./useSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { FormTemplateWithMeta } from "./useFormTemplate";

export const useOpticianFormSubmission = (token: string | null) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const { supabase } = useSupabaseClient();
  
  const submission = useMutation({
    mutationFn: async (data: {
      values: Record<string, any>;
      formTemplate: FormTemplateWithMeta | null;
      formattedAnswers?: any;
    }) => {
      if (!token) {
        throw new Error("Ingen åtkomsttoken hittades");
      }
      
      if (!supabase) {
        throw new Error("Kunde inte ansluta till databasen");
      }
      
      if (!data.formTemplate) {
        throw new Error("Ingen formulärmall hittades");
      }
      
      const { values, formTemplate, formattedAnswers } = data;
      
      console.log("[useOpticianFormSubmission]: Submitting form with values:", values);
      console.log("[useOpticianFormSubmission]: Using formTemplate:", formTemplate);
      
      // Prepare submission data
      const submissionData = {
        answers: values,
        formatted_raw_data: formattedAnswers ? JSON.stringify(formattedAnswers) : null,
        status: "ready", // Set status to "ready" for optician-filled forms
        updated_at: new Date().toISOString()
      };
      
      console.log("[useOpticianFormSubmission]: Preparing submission data:", submissionData);
      
      // Update the entry with the form answers
      const { error } = await supabase
        .from("anamnes_entries")
        .update(submissionData)
        .eq("access_token", token);
      
      if (error) {
        console.error("[useOpticianFormSubmission]: Error submitting form:", error);
        throw new Error("Kunde inte skicka formuläret: " + error.message);
      }
      
      console.log("[useOpticianFormSubmission]: Form submitted successfully");
      
      // Set local state to indicate successful submission
      setLocalSubmitted(true);
      
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Formuläret har skickats in",
        description: "Tack för din ifyllda information",
      });
      
      setIsSubmitted(true);
    },
    onError: (error: Error) => {
      console.error("[useOpticianFormSubmission]: Mutation error:", error);
      
      toast({
        title: "Ett fel uppstod",
        description: error.message || "Kunde inte skicka in formuläret",
        variant: "destructive",
      });
    }
  });
  
  const handleFormSubmit = (
    values: Record<string, any>, 
    formTemplate: FormTemplateWithMeta | null,
    formattedAnswers?: any
  ) => {
    console.log("[useOpticianFormSubmission/handleFormSubmit]: Starting form submission");
    return submission.mutateAsync({ values, formTemplate, formattedAnswers });
  };
  
  return {
    isSubmitting: submission.isPending,
    submissionError: submission.error,
    isSubmitted,
    localSubmitted,
    handleFormSubmit
  };
};
