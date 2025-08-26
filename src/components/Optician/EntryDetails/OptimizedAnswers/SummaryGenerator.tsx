
/**
 * This component handles AI summary generation functionality.
 * Simplified to only handle generation logic, with state management moved to parent component.
 */

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { logAccess } from "@/utils/auditLogClient";

interface SummaryGeneratorProps {
  formattedRawData: string;
  onSaveSummary: (summary: string) => void;
  entryId?: string; // Add entryId for audit logging
}

export const useSummaryGenerator = ({
  formattedRawData,
  onSaveSummary,
  entryId
}: SummaryGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { supabase } = useSupabaseClient();

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
      // Log AI summary generation request
      if (entryId) {
        await logAccess(supabase, {
          table: 'anamnes_entries',
          recordId: entryId,
          purpose: 'generate_summary',
          route: window.location.pathname
        });
      }
      
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          promptText: formattedRawData
        }
      });
      
      if (error) {
        throw new Error(`${error.message || 'Ett fel uppstod vid anrop till AI-sammanfattning'}`);
      }
      
      if (data?.summary) {
        onSaveSummary(data.summary);
        console.log("SummaryGenerator: Generated new summary:", data.summary.substring(0, 100) + "...");
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

  const copySummaryToClipboard = (summary: string) => {
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

  return {
    isGenerating,
    isCopied,
    generateSummary,
    copySummaryToClipboard
  };
};
