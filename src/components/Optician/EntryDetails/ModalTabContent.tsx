
/**
 * This component renders the tab content for the anamnesis detail modal.
 * It switches between patient information and notes based on the active tab.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientInfo } from "./PatientInfo";
import { OptimizedAnswersView } from "./OptimizedAnswersView";
import { InternalNotes } from "./InternalNotes";
import { AnamnesesEntry } from "@/types/anamnesis";

interface ModalTabContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  activeTab,
  setActiveTab,
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
    <Tabs 
      defaultValue="info" 
      value={activeTab} 
      onValueChange={setActiveTab} 
      className="flex-1 flex flex-col h-full"
    >
      <TabsList className="mb-2 w-full">
        <TabsTrigger value="info">Information</TabsTrigger>
        <TabsTrigger value="notes">Anteckningar</TabsTrigger>
      </TabsList>
      
      <TabsContent 
        value="info" 
        className="flex-1 flex flex-col overflow-hidden"
      >
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
            />
          </div>
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="notes" className="flex-1">
        <InternalNotes 
          notes={notes}
          setNotes={setNotes}
          saveNotes={saveNotes}
          isPending={isPending}
        />
      </TabsContent>
    </Tabs>
  );
}
