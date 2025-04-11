
/**
 * This component is now a thin wrapper around FormOrchestrator for backwards compatibility.
 * It uses the new context-based form architecture for improved maintainability
 * and performance while maintaining the same public API.
 */

import React from "react";
import { FormTemplate } from "@/types/anamnesis";
import { FormOrchestrator } from "./FormOrchestrator";

interface FormWrapperProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
}

export const FormWrapper: React.FC<FormWrapperProps> = ({
  formTemplate,
  onSubmit,
  isSubmitting
}) => {
  return (
    <FormOrchestrator
      formTemplate={formTemplate}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
};
