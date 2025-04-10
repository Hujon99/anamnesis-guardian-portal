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
  // onSubmit: (values: any, formattedAnswers?: any) => Promise<void>; // Remove if unused
  // isSubmitting: boolean; // Remove if unused
}

export const FormWrapper: React.FC<FormWrapperProps> = ({
  formTemplate,
  // onSubmit, // This prop is no longer used by FormOrchestrator
  // isSubmitting // This prop is no longer used by FormOrchestrator
}) => {
  // Note: The onSubmit and isSubmitting props received by FormWrapper
  // are now unused when calling FormOrchestrator.
  // If FormWrapper is still used, its purpose needs re-evaluation
  // in the context of the new submission flow handled by FormContainer.

  return (
    <FormOrchestrator
      formTemplate={formTemplate}
      // REMOVED: onSubmit={onSubmit}
      // REMOVED: isSubmitting={isSubmitting}
      // isOpticianMode is implicitly false here, add if needed
    />
  );
};
