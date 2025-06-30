
/**
 * This component handles the tab content within the anamnesis detail modal.
 * It organizes different sections of information into tabs and manages
 * the display of patient information, answers, and assignment details.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PatientInfo } from "./PatientInfo";
import { EntryAnswers } from "./EntryAnswers";
import { AssignmentSection } from "./AssignmentSection";
import { OptimizedAnswersView } from "./OptimizedAnswers/OptimizedAnswersView";
import { AnamnesesEntry } from "@/types/anamnesis";

interface ModalTabContentProps {
  patientIdentifier: string;
  isEditing: boolean;
  toggleEditing: () => void;
  setPatientIdentifier: (value: string) => void;
  savePatientIdentifier: () => Promise<void>;
  formattedRawData: string;
  setFormattedRawData: (value: string) => void;
  saveFormattedRawData: () => Promise<void>;
  isPending: boolean;
  answers: Record<string, string>;
  hasAnswers: boolean;
  status: string;
  showPatientInfoSection: boolean;
  entry: AnamnesesEntry;
  onSaveAiSummary: (summary: string) => Promise<void>;
  onAssignOptician: (opticianId: string | null) => Promise<void>;
  onAssignStore: (storeId: string | null) => Promise<void>;
}

export function ModalTabContent({
  patientIdentifier,
  isEditing,
  toggleEditing,
  setPatientIdentifier,
  savePatientIdentifier,
  formattedRawData,
  setFormattedRawData,
  saveFormattedRawData,
  isPending,
  answers,
  hasAnswers,
  status,
  showPatientInfoSection,
  entry,
  onSaveAiSummary,
  onAssignOptician,
  onAssignStore
}: ModalTabContentProps) {
  return (
    <Tabs defaultValue="patient" className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
        <TabsTrigger value="patient">Patient</TabsTrigger>
        <TabsTrigger value="answers">Svar</TabsTrigger>
        <TabsTrigger value="assignment">Tilldelning</TabsTrigger>
      </TabsList>
      
      <div className="flex-1 min-h-0">
        <TabsContent value="patient" className="h-full m-0 flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="p-4 border-b bg-background flex-shrink-0">
              <PatientInfo
                patientIdentifier={patientIdentifier}
                isEditing={isEditing}
                toggleEditing={toggleEditing}
                setPatientIdentifier={setPatientIdentifier}
                savePatientIdentifier={savePatientIdentifier}
                status={status}
              />
            </div>
            
            <div className="flex-1 min-h-0 p-4">
              <OptimizedAnswersView
                answers={answers}
                hasAnswers={hasAnswers}
                status={status}
                entryId={entry.id}
                aiSummary={entry.ai_summary}
                onSaveSummary={onSaveAiSummary}
                formattedRawData={formattedRawData}
                setFormattedRawData={setFormattedRawData}
                saveFormattedRawData={saveFormattedRawData}
                isPending={isPending}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="answers" className="h-full m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <EntryAnswers 
                answers={answers} 
                hasAnswers={hasAnswers} 
                status={status}
              />
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="assignment" className="h-full m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <AssignmentSection
                entry={entry}
                onAssignOptician={onAssignOptician}
                onAssignStore={onAssignStore}
                isPending={isPending}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </div>
    </Tabs>
  );
}
