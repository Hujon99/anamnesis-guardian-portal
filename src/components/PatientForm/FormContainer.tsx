
/**
 * This component renders the form container, including the Toaster component
 * to ensure toast messages are properly displayed.
 */

import React from "react";
import { FormTemplate } from "@/types/anamnesis";
import { FormOrchestrator } from "./FormOrchestrator";
import { Toaster } from "@/components/ui/toaster";

interface FormContainerProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<any>;
  isSubmitting: boolean;
  isOpticianMode?: boolean;
}

const FormContainer: React.FC<FormContainerProps> = ({ 
  formTemplate, 
  onSubmit, 
  isSubmitting,
  isOpticianMode = false
}) => {
  console.log("[FormContainer]: Rendering form container with isOpticianMode:", isOpticianMode);
  
  const handleSubmit = async (values: any, formattedAnswers?: any) => {
    console.log("[FormContainer/handleSubmit]: Form submission EXPLICITLY triggered by user");
    console.log("[FormContainer/handleSubmit]: Form values:", values);
    console.log("[FormContainer/handleSubmit]: Formatted answers before submission:", 
      formattedAnswers ? JSON.stringify(formattedAnswers, null, 2) : "none provided");
    console.log("[FormContainer/handleSubmit]: isOpticianMode:", isOpticianMode);
    
    try {
      console.log("[FormContainer/handleSubmit]: Calling parent onSubmit handler");
      // Make sure to pass along the formatted answers to maintain the chain
      return await onSubmit(values, formattedAnswers);
    } catch (error) {
      console.error("[FormContainer/handleSubmit]: Error in form submission:", error);
      throw error;
    }
  };
  
  return (
    <>
      <FormOrchestrator
        formTemplate={formTemplate}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isOpticianMode={isOpticianMode}
      />
      <Toaster />
    </>
  );
};

export default FormContainer;
