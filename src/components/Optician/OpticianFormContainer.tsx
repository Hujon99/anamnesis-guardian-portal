
/**
 * This component serves as the main container for the optician form.
 * It handles displaying the form template and manages form submission.
 */

import React from "react";
import FormContainer from "@/components/PatientForm/FormContainer";
import { FormTemplate } from "@/types/anamnesis";
import OpticianFormHeader from "./OpticianFormHeader";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";

interface OpticianFormContainerProps {
  formTemplate: FormTemplate | null;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
  onRetry: () => void;
}

const OpticianFormContainer: React.FC<OpticianFormContainerProps> = ({ 
  formTemplate,
  onSubmit,
  isSubmitting,
  onRetry
}) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <OpticianFormHeader />
        
        {formTemplate ? (
          <FormContainer
            formTemplate={formTemplate}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            isOpticianMode={true}
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
