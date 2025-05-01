
/**
 * This is the main component for displaying optimized answers in the anamnesis entry details.
 * It orchestrates the interaction between its child components and manages the state for
 * editing, saving, and generating summaries.
 */

import { FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { ActionButtons } from "./ActionButtons";
import { SaveIndicator } from "./SaveIndicator";
import { ContentTabs } from "./ContentTabs";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { useFormattedRawData } from "@/hooks/useFormattedRawData";
import { supabase } from "@/integrations/supabase/client";

interface OptimizedAnswersViewProps {
  answers: Record<string, any>;
  hasAnswers: boolean;
  status: string;
  entryId: string;
  aiSummary: string | null;
  onSaveSummary: (summary: string) => void;
  formattedRawData: string;
  setFormattedRawData: (data: string) => void;
  saveFormattedRawData: () => void;
  isPending: boolean;
}

export const OptimizedAnswersView = ({
  answers,
  hasAnswers,
  status,
  entryId,
  aiSummary,
  onSaveSummary,
  formattedRawData: initialFormattedRawData,
  setFormattedRawData,
  saveFormattedRawData,
  isPending
}: OptimizedAnswersViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(aiSummary ? "summary" : "raw");
  const [isCopied, setIsCopied] = useState(false);
  const [summary, setSummary] = useState<string>(aiSummary || "");
  const [saveIndicator, setSaveIndicator] = useState<"saved" | "unsaved" | null>(null);

  // Get the form template to use for formatting
  const formTemplateQuery = useFormTemplate();
  const formTemplateData = formTemplateQuery.data?.schema;
  
  // Use the hook with all required parameters
  const {
    formattedRawData,
    setFormattedRawData: updateFormattedRawData,
    generateRawData,
    isGenerating: isRegeneratingRawData,
    saveIndicator: hookSaveIndicator,
    setSaveIndicator: setHookSaveIndicator
  } = useFormattedRawData(
    initialFormattedRawData || "", 
    answers, 
    hasAnswers,
    formTemplateData || null,
    (data: string) => {
      console.log("useFormattedRawData callback triggered with data length:", data.length);
      setFormattedRawData(data);
      // This callback is triggered when raw data is generated, make sure to save it!
      saveFormattedRawData();
    }
  );

  // Sync the save indicator from hook to component state
  useEffect(() => {
    if (hookSaveIndicator) {
      setSaveIndicator(hookSaveIndicator);
    }
  }, [hookSaveIndicator]);

  // Update summary when aiSummary prop changes
  useEffect(() => {
    if (aiSummary) {
      setSummary(aiSummary);
      if (aiSummary.trim().length > 0) {
        setActiveTab("summary");
      }
    }
  }, [aiSummary]);
  
  // Regenerate raw data if it's empty but we have answers
  useEffect(() => {
    if (hasAnswers && formattedRawData === "" && formTemplateData) {
      console.log("Auto-generating raw data because it's empty but we have answers");
      generateRawData();
    }
  }, [hasAnswers, formattedRawData, formTemplateData, generateRawData]);

  const handleSaveChanges = () => {
    setIsSaving(true);
    setSaveIndicator("unsaved");
    
    try {
      console.log("Saving changes with data length:", formattedRawData.length);
      saveFormattedRawData();
      
      toast({
        title: "Ändringar sparade",
        description: "Dina anteckningar har sparats för AI-sammanfattning",
      });
      
      setSaveIndicator("saved");
      setTimeout(() => setSaveIndicator(null), 2000);
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving edited text:", error);
      toast({
        title: "Kunde inte spara ändringar",
        description: "Ett fel uppstod, försök igen senare",
        variant: "destructive",
      });
      setSaveIndicator(null);
    } finally {
      setIsSaving(false);
    }
  };

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
      console.log("Regenerating formatted data with template available:", !!formTemplateData);
      await generateRawData();
      // Explicitly call saveFormattedRawData after generating
      saveFormattedRawData();
      toast({
        title: "Textvy uppdaterad och sparad",
        description: "Den formatterade textvyn har uppdaterats och sparats i databasen."
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
        setActiveTab("summary");
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

  if (!hasAnswers) {
    return (
      status !== "draft" && (
        <div className="text-center p-4 border border-dashed rounded-md flex-1 min-h-[200px] flex items-center justify-center">
          <div>
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              {status === "sent" 
                ? "Väntar på att patienten ska fylla i anamnesen" 
                : "Ingen information från patienten"}
            </p>
          </div>
        </div>
      )
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          Patientens svar och anteckningar
        </h3>
        
        <div className="flex gap-2 items-center">
          <SaveIndicator saveIndicator={saveIndicator} />
          <ActionButtons
            isEditing={isEditing}
            isSaving={isSaving}
            isPending={isPending}
            isRegeneratingRawData={isRegeneratingRawData}
            isGenerating={isGenerating}
            hasAnswers={hasAnswers}
            formattedRawData={formattedRawData}
            summary={summary}
            onEdit={() => setIsEditing(true)}
            onSave={handleSaveChanges}
            onCancel={() => {
              updateFormattedRawData(initialFormattedRawData || "");
              setIsEditing(false);
            }}
            onRegenerateRawData={regenerateFormattedData}
            onGenerateSummary={generateSummary}
          />
        </div>
      </div>
      
      <div className="flex-grow overflow-hidden border rounded-md flex flex-col">
        <ContentTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isEditing={isEditing}
          formattedRawData={formattedRawData}
          onRawDataChange={(value) => {
            updateFormattedRawData(value);
            setSaveIndicator("unsaved");
          }}
          summary={summary}
          isCopied={isCopied}
          onCopy={copySummaryToClipboard}
          onRegenerateData={regenerateFormattedData}
          isRegenerating={isRegeneratingRawData}
        />
      </div>
    </div>
  );
};
