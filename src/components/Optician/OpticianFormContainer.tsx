/**
 * This component renders the form container specifically for opticians to fill out
 * patient anamnesis forms. It includes the form header, form content, and ensures
 * that the form is submitted with the appropriate optician flags.
 */

import React, { useState } from "react";
import { FormTemplate, FormattedAnswerData } from "@/types/anamnesis";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { FormContextProvider, useFormContext } from "@/contexts/FormContext";
import { FormLayout } from "@/components/PatientForm/FormLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface OpticianFormContainerProps {
  formTemplate: FormTemplate;
  token: string;
  onRetry?: () => void;
  onSuccess?: (data: any) => void;
}

// Internal component to access context after provider is set up
const OpticianFormInternal: React.FC<Pick<OpticianFormContainerProps, 'token' | 'onSuccess'>> = ({
    token,
    onSuccess
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { finalizeSubmissionData, form } = useFormContext();
    const { handleSubmit: RHFhandleSubmit } = form;

    // Optician-specific submission logic (remains largely the same)
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

        // --- BEGIN DIAGNOSTIC LOGGING ---
        let formattedAnswers;
        try {
            // Get raw values first for comparison
            const rawFormValues = form.getValues();
            console.log("[OpticianFormContainer/handleValidSubmit]: Raw form values from RHF:", JSON.stringify(rawFormValues, null, 2));

            formattedAnswers = finalizeSubmissionData();
            console.log("[OpticianFormContainer/handleValidSubmit]: Data returned by finalizeSubmissionData():", JSON.stringify(formattedAnswers, null, 2));

            // Basic check if formattedAnswers looks valid
            if (!formattedAnswers || !formattedAnswers.answeredSections || !Array.isArray(formattedAnswers.answeredSections)) {
                 console.error("[OpticianFormContainer/handleValidSubmit]: finalizeSubmissionData() returned invalid structure.");
                 throw new Error("finalizeSubmissionData returnerade ogiltig data.");
            }

        } catch (finalizeError: any) {
             console.error("[OpticianFormContainer/handleValidSubmit]: Error during finalizeSubmissionData():", finalizeError);
             setError(`Kunde inte formatera svar: ${finalizeError.message}`);
             setIsSubmitting(false);
             toast({ title: "Formateringsfel", description: `Kunde inte förbereda svaren: ${finalizeError.message}`, variant: "destructive" });
             return;
        }
        // --- END DIAGNOSTIC LOGGING ---


        try {
            // Add optician-specific metadata
            const finalData: FormattedAnswerData = {
                ...formattedAnswers,
                isOpticianSubmission: true, // Add the flag
                _metadata: { // Add standard metadata block
                    submittedBy: 'optician',
                    autoSetStatus: 'ready'
                }
            };

            // --- Log the final payload being sent ---
            const requestBody = { token, formattedAnswers: finalData };
            console.log("[OpticianFormContainer/handleValidSubmit]: Final payload for edge function:",
                JSON.stringify(requestBody, null, 2));
            // ---

            const { data, error: functionError } = await supabase.functions.invoke('submit-form', {
                body: requestBody // Send the prepared data
            });

            if (functionError) {
                console.error("[OpticianFormContainer/handleValidSubmit]: Edge function error:", functionError);
                // Try to get more details from the function error if available
                const errorDetails = (functionError as any)?.context?.details || functionError.message || "Okänt serverfel";
                throw new Error(`Fel från servern: ${errorDetails}`);
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

    // Trigger function passed to FormLayout
    const triggerSubmit = () => {
        console.log("[OpticianFormContainer/triggerSubmit]: Triggering RHF validation and submit.");
        RHFhandleSubmit(handleValidSubmit)();
    };

    return (
        <Card>
            {/* Render FormLayout directly, passing state and trigger */}
            <FormLayout
                isSubmitting={isSubmitting}
                onSubmitTrigger={triggerSubmit}
            />
            {error && <p className="text-red-500 text-sm p-4">Fel: {error}</p>}
        </Card>
    );
};


// Main OpticianFormContainer component wraps the context provider
const OpticianFormContainer: React.FC<OpticianFormContainerProps> = ({
  formTemplate,
  token,
  onRetry, // Keep onRetry if needed for other UI elements
  onSuccess
}) => {
  if (!formTemplate) {
    // ... (Loading state remains the same)
    return (
      <Card className="p-4">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Laddar formulär...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-4">Ifyllnad av anamnesen i butik</h2>
        <p className="text-muted-foreground mb-6">
          Du fyller nu i anamnesen direkt i butiken. Patientens svar kommer att sparas och kan användas
          som underlag för synundersökningen.
        </p>
      </Card>

      {/* Wrap internal component with context provider */}
      <FormContextProvider formTemplate={formTemplate} isOpticianMode={true}>
          <OpticianFormInternal token={token} onSuccess={onSuccess} />
      </FormContextProvider>

    </div>
  );
};

export default OpticianFormContainer;
