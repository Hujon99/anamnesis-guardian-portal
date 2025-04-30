
/**
 * This component serves as the main container for the optician form.
 * It handles displaying the form template and manages form submission.
 * Updated to work with the new FormTemplateWithMeta structure.
 */

import React from "react";
import FormContainer from "@/components/PatientForm/FormContainer";
import { FormTemplate } from "@/types/anamnesis";
import OpticianFormHeader from "./OpticianFormHeader";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import { FormTemplateWithMeta } from "@/hooks/useFormTemplate";

interface OpticianFormContainerProps {
  formTemplate: FormTemplateWithMeta | null;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
  onRetry: () => void;
  initialValues?: Record<string, any> | null;
  createdByName?: string | null;
}

const OpticianFormContainer: React.FC<OpticianFormContainerProps> = ({ 
  formTemplate,
  onSubmit,
  isSubmitting,
  onRetry,
  initialValues = null,
  createdByName = null
}) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <OpticianFormHeader />
        
        {formTemplate ? (
          <FormContainer
            formTemplate={formTemplate.schema}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            isOpticianMode={true}
            initialValues={initialValues}
            createdByName={createdByName}
          />
        ) : (
          <ErrorCard 
            error="Kunde inte ladda formulärmallen" 
            errorCode="" 
            diagnosticInfo="" 
            onRetry={onRetry} 
          />
        )}
      </div>
    </div>
  );
};

export default OpticianFormContainer;
