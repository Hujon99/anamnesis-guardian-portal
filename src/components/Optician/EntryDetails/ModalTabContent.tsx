
/**
 * This component renders the tab content for the anamnesis detail modal.
 * It now shows only patient information and answers, since notes functionality 
 * has been moved directly into the raw data editing view.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { PatientInfo } from "./PatientInfo";
import { OptimizedAnswersView } from "./OptimizedAnswersView";
import { AnamnesesEntry } from "@/types/anamnesis";

interface ModalTabContentProps {
  patientEmail: string;
  isEditing: boolean;
  toggleEditing: () => void;
  setPatientEmail: (email: string) => void;
  savePatientEmail: () => void;
  notes: string;
  setNotes: (notes: string) => void;
  saveNotes: () => void;
  isPending: boolean;
  answers: Record<string, string>;
  hasAnswers: boolean;
  status: string;
  showPatientInfoSection: boolean;
  entry: AnamnesesEntry;
  onSaveAiSummary: (summary: string) => void;
}

export function ModalTabContent({
  patientEmail,
  isEditing,
  toggleEditing,
  setPatientEmail,
  savePatientEmail,
  notes,
  setNotes,
  saveNotes,
  isPending,
  answers,
  hasAnswers,
  status,
  showPatientInfoSection,
  entry,
  onSaveAiSummary
}: ModalTabContentProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {showPatientInfoSection && (
            <PatientInfo 
              patientEmail={patientEmail}
              isEditing={isEditing}
              setIsEditing={toggleEditing}
              setPatientEmail={setPatientEmail}
              savePatientEmail={savePatientEmail}
            />
          )}
          
          <OptimizedAnswersView 
            answers={answers}
            hasAnswers={hasAnswers}
            status={status}
            entryId={entry.id}
            aiSummary={entry.ai_summary}
            onSaveSummary={onSaveAiSummary}
            notes={notes}
            setNotes={setNotes}
            saveNotes={saveNotes}
            isPending={isPending}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
