
/**
 * This is the main component for displaying optimized answers in the anamnesis entry details.
 * It orchestrates the interaction between its child components and manages the state for
 * editing, saving, and generating summaries. Centralized summary state management.
 */

import { FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { logAccess } from "@/utils/auditLogClient";
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
  const [activeTab, setActiveTab] = useState<string>(aiSummary ? "summary" : "raw");
  const { supabase } = useSupabaseClient();

  // Log access to patient answers when component mounts with answers
  useEffect(() => {
    if (hasAnswers && answers && Object.keys(answers).length > 0) {
      logAccess(supabase, {
        table: 'anamnes_entries',
        recordId: entryId,
        purpose: 'view_patient_answers',
        route: window.location.pathname
      });
    }
  }, [hasAnswers, answers, entryId, supabase]);

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
    onSaveSummary,
    entryId // Pass entryId for audit logging
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
        <div className="text-center p-8 border border-dashed rounded-lg">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            {status === "sent" 
              ? "Väntar på att patienten ska fylla i anamnesen" 
              : "Ingen information från patienten"}
          </p>
        </div>
      )
    );
  }

  return (
    <div className="border rounded-lg bg-background">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border-b gap-2">
        <h3 className="text-base sm:text-lg font-medium flex items-center">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
          <span className="text-sm sm:text-base">Patientens svar och anteckningar</span>
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
  );
};
