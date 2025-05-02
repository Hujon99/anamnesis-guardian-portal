
/**
 * This component orchestrates the entire form flow, setting up the context provider
 * and rendering the appropriate form layout. It serves as the top-level component
 * for the patient anamnesis form.
 * Enhanced to support form values change events for auto-save functionality.
 * Now passes formatted data through the component hierarchy.
 */

import React, { useEffect } from "react";
import { FormTemplate } from "@/types/anamnesis";
import { Card } from "@/components/ui/card";
import { FormLayout } from "@/components/PatientForm/FormLayout";
import { FormContextProvider } from "@/contexts/FormContext";

interface FormOrchestratorProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
  isOpticianMode?: boolean;
  initialValues?: Record<string, any> | null;
  createdByName?: string | null;
  onFormValuesChange?: (values: Record<string, any>) => void;
}

export const FormOrchestrator: React.FC<FormOrchestratorProps> = ({
  formTemplate,
  onSubmit,
  isSubmitting,
  isOpticianMode = false,
  initialValues = null,
  createdByName = null,
  onFormValuesChange
}) => {
  // Add detailed logging when the component mounts/renders
  useEffect(() => {
    console.log("[FormOrchestrator]: Rendering with formTemplate:", {
      title: formTemplate.title,
      sectionCount: formTemplate.sections?.length || 0,
      isSubmitting: isSubmitting,
      isOpticianMode: isOpticianMode,
      hasInitialValues: !!initialValues,
      createdByName: createdByName || 'N/A'
    });
  }, [formTemplate, isSubmitting, isOpticianMode, initialValues, createdByName]);

  console.log("[FormOrchestrator/RENDER]: About to render form context provider");
  
  return (
    <FormContextProvider 
      formTemplate={formTemplate} 
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      isOpticianMode={isOpticianMode}
      initialValues={initialValues}
      onFormValuesChange={onFormValuesChange}
    >
      <Card>
        <FormLayout createdByName={createdByName} />
      </Card>
    </FormContextProvider>
  );
};
