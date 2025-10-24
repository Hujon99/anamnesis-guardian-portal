
/**
 * This component orchestrates the entire form flow, setting up the context provider
 * and rendering the appropriate form layout. It serves as the top-level component
 * for the patient anamnesis form.
 * Enhanced to support form values change events for auto-save functionality.
 */

import React, { useEffect } from "react";
import { FormTemplate } from "@/types/anamnesis";
import { Card } from "@/components/ui/card";
import { FormLayout } from "@/components/PatientForm/FormLayout";
import { FormContextProvider } from "@/contexts/FormContext";
import { useFormSessionTracking } from "@/hooks/useFormSessionTracking";

interface FormOrchestratorProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
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

export const FormOrchestrator: React.FC<FormOrchestratorProps> = ({
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
  // Initialize form session tracking
  const tracking = useFormSessionTracking({
    entryId,
    organizationId: organizationId || 'unknown',
    token
  });
  
  return (
    <FormContextProvider 
      formTemplate={formTemplate} 
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      isOpticianMode={isOpticianMode}
      initialValues={initialValues}
      onFormValuesChange={onFormValuesChange}
      tracking={tracking}
      useTouchFriendly={useTouchFriendly}
    >
      <Card>
        <FormLayout createdByName={createdByName} />
      </Card>
    </FormContextProvider>
  );
};
