/**
 * This component renders the form container specifically for opticians to fill out
 * patient anamnesis forms. It includes the form header, form content, and ensures
 * that the form is submitted with the appropriate optician flags.
 */

import React, { useState } from "react";
import { FormTemplate, FormattedAnswerData } from "@/types/anamnesis";
import FormContainer from "@/components/PatientForm/FormContainer";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useFormContext } from "@/contexts/FormContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface OpticianFormContainerProps {
  formTemplate: FormTemplate;
  token: string;
  onRetry?: () => void;
  onSuccess?: (data: any) => void;
}

const OpticianFormContainer: React.FC<OpticianFormContainerProps> = ({
  formTemplate,
  token,
  onRetry,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { finalizeSubmissionData, form } = useFormContext();
  const { handleSubmit: RHFhandleSubmit } = form;

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

  const handleValidSubmit = async () => {
    console.log("[OpticianFormContainer/handleValidSubmit]: Form validated, preparing submission.");
    setIsSubmitting(true);
    setError(null);

    if (!token) {
        console.error("[OpticianFormContainer/handleValidSubmit]: No token available!");
        setError("Autentiseringstoken saknas.");
        setIsSubmitting(false);
        toast({ title: "Fel", description: "Autentiseringstoken saknas.", variant: "destructive" });
        return;
    }

    try {
      const formattedAnswers = finalizeSubmissionData();

      const finalData: FormattedAnswerData & { _metadata?: any } = {
          ...formattedAnswers,
          isOpticianSubmission: true,
          _metadata: {
              submittedBy: 'optician',
              autoSetStatus: 'ready'
          }
      };

      console.log("[OpticianFormContainer/handleValidSubmit]: Final data for edge function:",
        JSON.stringify(finalData, null, 2));

      const { data, error: functionError } = await supabase.functions.invoke('submit-form', {
        body: {
          token,
          formattedAnswers: finalData
        }
      });

      if (functionError) {
        console.error("[OpticianFormContainer/handleValidSubmit]: Edge function error:", functionError);
        throw new Error(functionError.message || "Ett fel uppstod vid anrop till servern.");
      }

      console.log("[OpticianFormContainer/handleValidSubmit]: Submission successful:", data);
      toast({
        title: "Tack för dina svar!",
        description: "Formuläret har sparats och markerats som färdigt.",
      });
      if (onSuccess) {
        onSuccess(data);
      }

    } catch (err: any) {
      console.error("[OpticianFormContainer/handleValidSubmit]: Submission error:", err);
      setError(err.message || "Ett oväntat fel inträffade.");
      toast({
        title: "Det gick inte att skicka in formuläret",
        description: err.message || "Ett oväntat fel uppstod.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerSubmit = () => {
      console.log("[OpticianFormContainer/triggerSubmit]: Triggering RHF validation and submit.");
      RHFhandleSubmit(handleValidSubmit)();
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
        onSubmit={triggerSubmit}
        isSubmitting={isSubmitting}
        isOpticianMode={true}
      />
      {error && <p className="text-red-500 text-sm mt-2">Fel: {error}</p>}
    </div>
  );
};

export default OpticianFormContainer;
