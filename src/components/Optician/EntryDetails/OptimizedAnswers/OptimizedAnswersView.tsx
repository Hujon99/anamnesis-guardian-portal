
/**
 * This is the main component for displaying optimized answers in the anamnesis entry details.
 * It orchestrates the interaction between its child components and manages the state for
 * editing, saving, and generating summaries. Centralized summary state management.
 */

import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { ActionButtons } from "./ActionButtons";
import { SaveIndicator } from "./SaveIndicator";
import { ContentTabs } from "./ContentTabs";
import { useSummaryGenerator } from "./SummaryGenerator";
import { useRawDataManager } from "./RawDataManager";

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
  aiSummary,
  onSaveSummary,
  formattedRawData: initialFormattedRawData,
  setFormattedRawData,
  saveFormattedRawData,
  isPending
}: OptimizedAnswersViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(aiSummary ? "summary" : "raw");

  console.log("OptimizedAnswersView render:", { 
    aiSummary: aiSummary?.substring(0, 100) + "...", 
    aiSummaryLength: aiSummary?.length,
    activeTab 
  });

  // Use the summary generator hook (simplified)
  const {
    isGenerating,
    isCopied,
    generateSummary,
    copySummaryToClipboard
  } = useSummaryGenerator({
    formattedRawData: initialFormattedRawData,
    onSaveSummary
  });

  // Use the raw data manager hook
  const {
    formattedRawData,
    updateFormattedRawData,
    isRegeneratingRawData,
    saveIndicator,
    setSaveIndicator,
    regenerateFormattedData,
    handleRawDataChange
  } = useRawDataManager({
    answers,
    hasAnswers,
    initialFormattedRawData: initialFormattedRawData || "",
    setFormattedRawData,
    saveFormattedRawData
  });

  const handleSaveChanges = () => {
    setIsSaving(true);
    setSaveIndicator("unsaved");
    
    try {
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

  const handleCopySummary = () => {
    copySummaryToClipboard(aiSummary || "");
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
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
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
            summary={aiSummary || ""}
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
      
      <div className="flex-1 min-h-0 border rounded-md flex flex-col">
        <ContentTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isEditing={isEditing}
          formattedRawData={formattedRawData}
          onRawDataChange={handleRawDataChange}
          aiSummary={aiSummary}
          isCopied={isCopied}
          onCopy={handleCopySummary}
          onRegenerateData={regenerateFormattedData}
          isRegenerating={isRegeneratingRawData}
        />
      </div>
    </div>
  );
};
