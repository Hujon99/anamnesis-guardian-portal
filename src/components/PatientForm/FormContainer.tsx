
/**
 * This component renders the form container, including the Toaster component
 * to ensure toast messages are properly displayed. It also adds additional
 * validation of the form template structure to prevent rendering errors.
 * Enhanced to handle the new template structure with dynamic follow-up questions,
 * to support form values change events for auto-save, and to provide better
 * error handling with improved diagnostics.
 */

import React, { useEffect } from "react";
import { FormTemplate } from "@/types/anamnesis";
import { FormOrchestrator } from "./FormOrchestrator";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import { toast } from "@/components/ui/use-toast";

interface FormContainerProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<any>;
  isSubmitting: boolean;
  isOpticianMode?: boolean;
  initialValues?: Record<string, any> | null;
  createdByName?: string | null;
  onFormValuesChange?: (values: Record<string, any>) => void;
  entryId?: string | null;
  token?: string | null;
  organizationId?: string;
  useTouchFriendly?: boolean;
}

const FormContainer: React.FC<FormContainerProps> = ({ 
  formTemplate, 
  onSubmit, 
  isSubmitting,
  isOpticianMode = false,
  initialValues = null,
  createdByName = null,
  onFormValuesChange,
  entryId = null,
  token = null,
  organizationId,
  useTouchFriendly = false
}) => {
  
  // Validate template once on mount to provide a better user experience
  useEffect(() => {
    if (!formTemplate) {
      console.error("[FormContainer]: Form template is missing");
    } else if (!formTemplate.sections || !Array.isArray(formTemplate.sections)) {
      console.error("[FormContainer]: Form template has invalid sections array");
    }
  }, [formTemplate]);
  
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
    
    return true;
  }, [formTemplate]);
  
  const handleSubmit = async (values: any, formattedAnswers?: any) => {
    try {
      // Show a toast to inform the user the submission is in progress
      toast({
        title: "Skickar in formuläret...",
        duration: 10000, // Long duration in case submission takes time
      });
      
      const result = await onSubmit(values, formattedAnswers);
      
      // Dismiss any previous toast
      toast.dismiss();
      
      return result;
    } catch (error) {
      console.error("[FormContainer/handleSubmit]: Error in form submission:", error);
      
      // Dismiss any previous toast
      toast.dismiss();
      
      // Show error toast
      toast.error("Det uppstod ett fel vid inskickning av formuläret", {
        description: error.message || "Försök igen om en stund",
      });
      
      throw error;
    }
  };
  
  const handleValuesChange = (values: Record<string, any>) => {
    if (onFormValuesChange) {
      onFormValuesChange(values);
    }
  };
  
  // If the template is not valid, show an error
  if (!isValidTemplate) {
    return (
      <ErrorCard 
        error="Formulärstrukturen är ogiltig" 
        errorCode="invalid_template"
        diagnosticInfo={`Template: ${formTemplate ? JSON.stringify({
          title: formTemplate.title,
          sections: formTemplate.sections ? `${formTemplate.sections.length} sections` : "no sections",
          hasQuestions: formTemplate.sections?.some(s => s.questions && s.questions.length > 0)
        }) : "null"}`}
        onRetry={() => window.location.reload()}
      />
    );
  }
  
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
        entryId={entryId}
        token={token}
        organizationId={organizationId}
        useTouchFriendly={useTouchFriendly}
      />
      <Toaster />
      <SonnerToaster position="top-center" />
    </>
  );
};

export default FormContainer;
