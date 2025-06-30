
/**
 * This component manages raw data formatting, editing, and regeneration.
 * It handles the display and modification of formatted raw data from patient answers.
 */

import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { useFormattedRawData } from "@/hooks/useFormattedRawData";

interface RawDataManagerProps {
  answers: Record<string, any>;
  hasAnswers: boolean;
  initialFormattedRawData: string;
  setFormattedRawData: (data: string) => void;
  saveFormattedRawData: () => void;
}

export const useRawDataManager = ({
  answers,
  hasAnswers,
  initialFormattedRawData,
  setFormattedRawData,
  saveFormattedRawData
}: RawDataManagerProps) => {
  const [saveIndicator, setSaveIndicator] = useState<"saved" | "unsaved" | null>(null);

  // Get the form template to use for formatting
  const formTemplateQuery = useFormTemplate();
  const formTemplateData = formTemplateQuery.data;
  
  // Use the hook with all required parameters  
  const {
    formattedRawData,
    setFormattedRawData: updateFormattedRawData,
    generateRawData,
    isGenerating: isRegeneratingRawData,
  } = useFormattedRawData(
    initialFormattedRawData || "", 
    answers, 
    hasAnswers,
    formTemplateData?.schema || null,
    (data: string) => {
      setFormattedRawData(data);
      saveFormattedRawData();
    }
  );

  // Regenerate raw data if it's empty but we have answers
  useEffect(() => {
    if (hasAnswers && formattedRawData === "" && formTemplateData?.schema) {
      generateRawData();
    }
  }, [hasAnswers, formattedRawData, formTemplateData, generateRawData]);

  const regenerateFormattedData = async () => {
    if (!hasAnswers) {
      toast({
        title: "Kunde inte generera formatterad data",
        description: "Det finns inga svar att formattera.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await generateRawData();
      toast({
        title: "Formatterad data uppdaterad",
        description: "Den formatterade textvyn har uppdaterats."
      });
    } catch (error) {
      console.error("Error regenerating formatted data:", error);
      toast({
        title: "Kunde inte uppdatera formatterad data",
        description: error instanceof Error ? error.message : "Ett oväntat fel uppstod",
        variant: "destructive"
      });
    }
  };

  const handleRawDataChange = (value: string) => {
    updateFormattedRawData(value);
    setSaveIndicator("unsaved");
  };

  return {
    formattedRawData,
    updateFormattedRawData,
    isRegeneratingRawData,
    saveIndicator,
    setSaveIndicator,
    regenerateFormattedData,
    handleRawDataChange
  };
};
