
/**
 * This component serves as a container for the patient form.
 * It handles the form state and renders the appropriate form content.
 */

import React from "react";
import { FormWrapper } from "@/components/PatientForm/FormWrapper";
import { FormTemplate } from "@/types/anamnesis";
import { Loader2 } from "lucide-react";

interface FormContainerProps {
  formTemplate: FormTemplate | null;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
}

const FormContainer: React.FC<FormContainerProps> = ({
  formTemplate,
  onSubmit,
  isSubmitting
}) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {formTemplate ? (
          <FormWrapper 
            formTemplate={formTemplate}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">Laddar formulärmall...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormContainer;
