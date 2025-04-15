
/**
 * This component renders the action buttons for the optimized answers view.
 * It handles editing, saving, regenerating raw data, and AI summary generation.
 */

import { Button } from "@/components/ui/button";
import { Lightbulb, PenLine, RefreshCw, Save } from "lucide-react";

interface ActionButtonsProps {
  isEditing: boolean;
  isSaving: boolean;
  isPending: boolean;
  isRegeneratingRawData: boolean;
  isGenerating: boolean;
  hasAnswers: boolean;
  formattedRawData: string | null;
  summary: string | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRegenerateRawData: () => void;
  onGenerateSummary: () => void;
}

export const ActionButtons = ({
  isEditing,
  isSaving,
  isPending,
  isRegeneratingRawData,
  isGenerating,
  hasAnswers,
  formattedRawData,
  summary,
  onEdit,
  onSave,
  onCancel,
  onRegenerateRawData,
  onGenerateSummary
}: ActionButtonsProps) => {
  if (isEditing) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex items-center"
        >
          Återställ
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={isSaving || isPending}
          className="flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving || isPending ? "Sparar..." : "Spara ändringar"}
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onRegenerateRawData}
        disabled={isRegeneratingRawData || !hasAnswers}
        className="flex items-center"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRegeneratingRawData ? 'animate-spin' : ''}`} />
        {isRegeneratingRawData ? "Genererar..." : "Generera rådata"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="flex items-center"
      >
        <PenLine className="h-4 w-4 mr-2" />
        Redigera anteckningar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onGenerateSummary}
        disabled={isGenerating || !formattedRawData}
        className="flex items-center"
      >
        <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
        {isGenerating ? "Genererar..." : summary ? "Uppdatera AI-sammanfattning" : "Generera AI-sammanfattning"}
      </Button>
    </>
  );
};
