/**
 * This component renders the form container, including the Toaster component
 * to ensure toast messages are properly displayed.
 */

import React, { useState } from "react";
import { FormTemplate, FormattedAnswerData } from "@/types/anamnesis";
import { FormContextProvider, useFormContext } from "@/contexts/FormContext";
import { Card } from "@/components/ui/card";
import { FormLayout } from "@/components/PatientForm/FormLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface FormContainerProps {
  formTemplate: FormTemplate | null | undefined;
  isOpticianMode?: boolean;
  token: string;
  onSuccess?: (data: any) => void;
}

const FormContainerInternal: React.FC<Pick<FormContainerProps, 'isOpticianMode' | 'token' | 'onSuccess'>> = ({
    isOpticianMode,
    token,
    onSuccess
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { finalizeSubmissionData, form } = useFormContext();
    const { handleSubmit: RHFhandleSubmit } = form;

    // Submission logic specifically for PATIENTS
    const handlePatientSubmit = async () => {
        console.log("[FormContainer/handlePatientSubmit]: Form validated, preparing submission.");
        setIsSubmitting(true);
        setError(null);

        if (!token) {
            console.error("[FormContainer/handlePatientSubmit]: No token available!");
            setError("Autentiseringstoken saknas.");
            setIsSubmitting(false);
            toast({ title: "Fel", description: "Autentiseringstoken saknas.", variant: "destructive" });
            return;
        }

        try {
            const formattedAnswers = finalizeSubmissionData();

            // Patient submissions don't need extra metadata like optician ones
            const finalData: FormattedAnswerData = { ...formattedAnswers };

            console.log("[FormContainer/handlePatientSubmit]: Final data for edge function:",
                JSON.stringify(finalData, null, 2));

            const { data, error: functionError } = await supabase.functions.invoke('submit-form', {
                body: {
                    token,
                    formattedAnswers: finalData // Send the prepared data
                }
            });

            if (functionError) {
                console.error("[FormContainer/handlePatientSubmit]: Edge function error:", functionError);
                throw new Error(functionError.message || "Ett fel uppstod vid anrop till servern.");
            }

            console.log("[FormContainer/handlePatientSubmit]: Submission successful:", data);
            toast({
                title: "Tack för dina svar!",
                description: "Dina svar har skickats in.",
            });
            if (onSuccess) {
                onSuccess(data); // Call success callback
            }

        } catch (err: any) {
            console.error("[FormContainer/handlePatientSubmit]: Submission error:", err);
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

    // Determine which submission trigger to use
    // Optician submission is handled in OpticianFormContainer, so this only needs patient logic
    const onSubmitTrigger = () => {
        if (!isOpticianMode) {
            console.log("[FormContainer/onSubmitTrigger]: Triggering Patient RHF validation and submit.");
            RHFhandleSubmit(handlePatientSubmit)();
        } else {
            // In optician mode, the trigger comes from OpticianFormContainer's props,
            // but FormLayout still needs an onSubmitTrigger function.
            // This case should ideally not be hit if OpticianFormContainer provides its own trigger.
             console.warn("[FormContainer/onSubmitTrigger]: onSubmitTrigger called in Optician mode - this might indicate an issue.");
        }
    };


    return (
        <Card>
            <FormLayout
                isSubmitting={isSubmitting}
                onSubmitTrigger={onSubmitTrigger} // Pass the correct trigger
            />
            {/* Display error if any */}
            {error && !isOpticianMode && <p className="text-red-500 text-sm p-4">Fel: {error}</p>}
        </Card>
    );
};


// Main FormContainer component wraps the context provider
const FormContainer: React.FC<FormContainerProps> = ({
  formTemplate,
  isOpticianMode = false,
  token,
  onSuccess
}) => {
  if (!formTemplate) {
    return <Card><p className="p-4">Laddar formulär...</p></Card>; // Or a loading indicator
  }

  return (
    <FormContextProvider formTemplate={formTemplate} isOpticianMode={isOpticianMode}>
        {/* Pass necessary props down */}
        <FormContainerInternal
            isOpticianMode={isOpticianMode}
            token={token}
            onSuccess={onSuccess}
        />
    </FormContextProvider>
  );
};

export default FormContainer;
