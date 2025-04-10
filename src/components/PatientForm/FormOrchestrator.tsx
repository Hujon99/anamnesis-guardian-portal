/**
 * This component orchestrates the entire form flow, setting up the context provider
 * and rendering the appropriate form layout. It serves as the top-level component
 * for the patient anamnesis form.
 */

import React from "react";
import { FormTemplate } from "@/types/anamnesis";
import { Card } from "@/components/ui/card";
import { FormLayout } from "@/components/PatientForm/FormLayout";
import { FormContextProvider } from "@/contexts/FormContext";

interface FormOrchestratorProps {
  formTemplate: FormTemplate;
  isOpticianMode?: boolean;
}

export const FormOrchestrator: React.FC<FormOrchestratorProps> = ({
  formTemplate,
  isOpticianMode = false
}) => {
  return (
    <FormContextProvider
      formTemplate={formTemplate}
      isOpticianMode={isOpticianMode}
    >
      <Card>
        <FormLayout isSubmitting={false} onSubmitTrigger={() => console.warn("Default onSubmitTrigger called in Orchestrator")} />
      </Card>
    </FormContextProvider>
  );
};
