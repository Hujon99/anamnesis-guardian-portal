
/**
 * This component renders the form container specifically for opticians to fill out
 * patient anamnesis forms. It includes the form header, form content, and ensures
 * that the form is submitted with the appropriate optician flags.
 */

import React from "react";
import { FormTemplate } from "@/types/anamnesis";
import FormContainer from "@/components/PatientForm/FormContainer";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface OpticianFormContainerProps {
  formTemplate: FormTemplate;
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
  if (!formTemplate) {
    return (
      <Card className="p-4">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Laddar formulär...</p>
        </div>
      </Card>
    );
  }

  // This wrapper ensures that the form is submitted with the optician flag
  const handleOpticianSubmit = async (values: any, formattedAnswers?: any) => {
    console.log("[OpticianFormContainer/handleOpticianSubmit]: Submitting form with formatted answers:", formattedAnswers);
    
    // Make sure we mark this as an optician submission
    if (formattedAnswers) {
      if (formattedAnswers.formattedAnswers) {
        formattedAnswers.formattedAnswers.isOpticianSubmission = true;
      } else {
        // Add isOpticianSubmission flag if formattedAnswers doesn't have the nested structure
        formattedAnswers.isOpticianSubmission = true;
      }
    }
    
    return onSubmit(values, formattedAnswers);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-4">Ifyllnad av anamnesen i butik</h2>
        <p className="text-muted-foreground mb-6">
          Du fyller nu i anamnesen direkt i butiken. Patientens svar kommer att sparas och kan användas 
          som underlag för synundersökningen.
        </p>
      </Card>
      
      <FormContainer 
        formTemplate={formTemplate}
        onSubmit={handleOpticianSubmit}
        isSubmitting={isSubmitting}
        isOpticianMode={true}
      />
    </div>
  );
};

export default OpticianFormContainer;
