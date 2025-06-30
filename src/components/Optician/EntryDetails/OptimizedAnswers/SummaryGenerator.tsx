
/**
 * This component handles AI summary generation functionality.
 * It encapsulates the logic for generating, displaying, and managing AI summaries.
 */

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SummaryGeneratorProps {
  formattedRawData: string;
  aiSummary: string | null;
  onSaveSummary: (summary: string) => void;
}

export const useSummaryGenerator = ({
  formattedRawData,
  aiSummary,
  onSaveSummary
}: SummaryGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string>(aiSummary || "");
  const [isCopied, setIsCopied] = useState(false);

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
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          promptText: formattedRawData
        }
      });
      
      if (error) {
        throw new Error(`${error.message || 'Ett fel uppstod vid anrop till AI-sammanfattning'}`);
      }
      
      if (data?.summary) {
        setSummary(data.summary);
        onSaveSummary(data.summary);
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

  const copySummaryToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setIsCopied(true);
      toast({
        title: "Kopierad!",
        description: "AI-sammanfattningen har kopierats till urklipp",
      });
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  // Update summary when aiSummary prop changes
  if (aiSummary && aiSummary !== summary) {
    setSummary(aiSummary);
  }

  return {
    summary,
    setSummary,
    isGenerating,
    isCopied,
    generateSummary,
    copySummaryToClipboard
  };
};
