
/**
 * This hook manages the formatted raw data state and operations for anamnesis entries.
 * It handles initialization, generation, and saving of the formatted raw data,
 * ensuring consistency between the UI state and database.
 */

import { useState, useEffect } from "react";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { toast } from "@/components/ui/use-toast";
import { createOptimizedPromptInput, extractFormattedAnswers } from "@/utils/anamnesisTextUtils";

export const useFormattedRawData = (
  initialData: string,
  answers: Record<string, any>,
  hasAnswers: boolean,
  onSave: (data: string) => void
) => {
  const { data: formTemplate } = useFormTemplate();
  const [formattedRawData, setFormattedRawData] = useState(initialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<"saved" | "unsaved" | null>(null);

  // Initialize raw data when component mounts
  useEffect(() => {
    if (hasAnswers && formTemplate && !formattedRawData) {
      generateRawData();
    }
  }, [hasAnswers, formTemplate]);

  const generateRawData = async () => {
    if (!hasAnswers || !formTemplate) {
      toast({
        title: "Kunde inte generera rådata",
        description: "Det finns inga svar att generera rådata från.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const formattedAnswers = extractFormattedAnswers(answers);
      
      if (formattedAnswers) {
        const text = createOptimizedPromptInput(formTemplate, formattedAnswers);
        setFormattedRawData(text);
        setSaveIndicator("unsaved");
        
        // Save the initial raw data
        onSave(text);
        
        toast({
          title: "Rådata har genererats",
          description: "Rådatan har genererats och sparats.",
        });
      } else {
        throw new Error("Kunde inte extrahera formaterade svar från datastrukturen");
      }
    } catch (error) {
      console.error("Error generating raw data:", error);
      toast({
        title: "Ett fel uppstod",
        description: error instanceof Error ? error.message : "Kunde inte generera rådata",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    formattedRawData,
    setFormattedRawData,
    generateRawData,
    isGenerating,
    saveIndicator,
    setSaveIndicator
  };
};
