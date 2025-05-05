
/**
 * This component renders the form container, including the Toaster component
 * to ensure toast messages are properly displayed. It also adds additional
 * validation of the form template structure to prevent rendering errors.
 * Enhanced to handle the new template structure with dynamic follow-up questions
 * and to support form values change events for auto-save.
 */

import React from "react";
import { FormTemplate } from "@/types/anamnesis";
import { FormOrchestrator } from "./FormOrchestrator";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";

interface FormContainerProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<any>;
  isSubmitting: boolean;
  isOpticianMode?: boolean;
  initialValues?: Record<string, any> | null;
  createdByName?: string | null;
  onFormValuesChange?: (values: Record<string, any>) => void;
}

const FormContainer: React.FC<FormContainerProps> = ({ 
  formTemplate, 
  onSubmit, 
  isSubmitting,
  isOpticianMode = false,
  initialValues = null,
  createdByName = null,
  onFormValuesChange
}) => {
  console.log("[FormContainer]: Rendering form container with isOpticianMode:", isOpticianMode);
  console.log("[FormContainer]: Initializing with values:", initialValues);
  console.log("[FormContainer]: Created by:", createdByName);
  
  // More detailed template logging
  if (formTemplate) {

  } else {
    console.error("[FormContainer]: Form template is null or undefined!");
  }
  
  // Validate the form template structure before rendering
  const isValidTemplate = React.useMemo(() => {
    if (!formTemplate) {
      console.error("[FormContainer]: Form template is null or undefined!");
      return false;
    }
    
    if (!formTemplate.sections || !Array.isArray(formTemplate.sections)) {
      console.error("[FormContainer]: Form template has no sections array or sections is not an array!");
      return false;
    }
    
    // Check if any sections have questions
    const hasQuestions = formTemplate.sections.some(section => 
      section.questions && Array.isArray(section.questions) && section.questions.length > 0
    );
    
    if (!hasQuestions) {
      console.error("[FormContainer]: Form template has no questions in any section!");
      return false;
    }
    
    // Success - template structure is valid
    // console.log("[FormContainer]: Template structure validation passed!");
    
    return true;
  }, [formTemplate]);
  
  const handleSubmit = async (values: any, formattedAnswers?: any) => {
    // console.log("[FormContainer/handleSubmit]: Form submission EXPLICITLY triggered by user");
    // console.log("[FormContainer/handleSubmit]: Form values:", values);
    // console.log("[FormContainer/handleSubmit]: Formatted answers:", formattedAnswers);
    
    try {
      // console.log("[FormContainer/handleSubmit]: Calling parent onSubmit handler");
      return await onSubmit(values, formattedAnswers);
    } catch (error) {
      console.error("[FormContainer/handleSubmit]: Error in form submission:", error);
      throw error;
    }
  };
  
  const handleValuesChange = (values: Record<string, any>) => {
    // console.log("[FormContainer]: Form values changed");
    if (onFormValuesChange) {
      onFormValuesChange(values);
    }
  };
  
  // Render decision logging
  // console.log(`[FormContainer/RENDER]: About to render. Template valid: ${isValidTemplate}`);
  
  // If the template is not valid, show an error
  if (!isValidTemplate) {
    // console.log("[FormContainer/RENDER]: Rendering error card due to invalid template");
    return (
      <ErrorCard 
        error="Formulärstrukturen är ogiltig" 
        errorCode="invalid_template"
        diagnosticInfo={`Template: ${JSON.stringify(formTemplate, null, 2)}`}
        onRetry={() => window.location.reload()}
      />
    );
  }
  
  // console.log("[FormContainer/RENDER]: Rendering FormOrchestrator");
  return (
    <>
      <FormOrchestrator
        formTemplate={formTemplate}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isOpticianMode={isOpticianMode}
        initialValues={initialValues}
        createdByName={createdByName}
        onFormValuesChange={handleValuesChange}
      />
      <Toaster />
      <SonnerToaster position="top-center" />
    </>
  );
};

export default FormContainer;
