
/**
 * This hook manages the generation of AI summaries for anamnesis entries.
 * It provides a clean interface for generating summaries and handling the 
 * associated loading states and error cases.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface UseSummaryGenerationProps {
  formattedRawData: string;
  onSuccess: (summary: string) => void;
}

export const useSummaryGeneration = ({ 
  formattedRawData, 
  onSuccess 
}: UseSummaryGenerationProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummary = async () => {
    if (!formattedRawData) {
      toast({
        title: "Kunde inte generera sammanfattning",
        description: "Det finns inga svar att sammanfatta.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-summary', {
        body: {
          promptText: formattedRawData
        }
      });

      if (error) {
        throw new Error(`${error.message || 'Ett fel uppstod vid anrop till AI-sammanfattning'}`);
      }

      if (data?.summary) {
        onSuccess(data.summary);
      } else {
        throw new Error('Fick inget svar från AI-tjänsten');
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Kunde inte generera sammanfattning",
        description: error instanceof Error ? error.message : "Ett oväntat fel uppstod",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateSummary,
    isGenerating
  };
};
