
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
  
  return (
    <>
      <FormOrchestrator
        formTemplate={formTemplate}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        isOpticianMode={isOpticianMode}
      />
      <Toaster />
    </>
  );
};

export default FormContainer;
