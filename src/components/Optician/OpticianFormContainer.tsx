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
    console.log("[OpticianFormContainer/handleOpticianSubmit]: Submitting form with values:", values);
    console.log("[OpticianFormContainer/handleOpticianSubmit]: Initial formatted answers:", 
      formattedAnswers ? JSON.stringify(formattedAnswers, null, 2) : "none provided");
    
    // Make sure we're working with a valid formatted answers object
    if (formattedAnswers) {
      // Set the flag in the appropriate location
      if (formattedAnswers.formattedAnswers) {
        console.log("[OpticianFormContainer/handleOpticianSubmit]: Setting isOpticianSubmission flag in nested structure");
        formattedAnswers.formattedAnswers.isOpticianSubmission = true;
      } else {
        // Add isOpticianSubmission flag if formattedAnswers doesn't have the nested structure
        console.log("[OpticianFormContainer/handleOpticianSubmit]: Setting isOpticianSubmission flag at root level");
        formattedAnswers.isOpticianSubmission = true;
      }
    } else {
      console.error("[OpticianFormContainer/handleOpticianSubmit]: No formatted answers provided!");
    }
    
    console.log("[OpticianFormContainer/handleOpticianSubmit]: Final formatted answers to be submitted:", 
      formattedAnswers ? JSON.stringify(formattedAnswers, null, 2) : "none provided");
    
    // Also add metadata for the edge function to the values object
    const processedValues = {
      ...values,
      _metadata: {
        submittedBy: 'optician',
        autoSetStatus: 'ready'
      }
    };
    
    return onSubmit(processedValues, formTemplate, formattedAnswers);
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
