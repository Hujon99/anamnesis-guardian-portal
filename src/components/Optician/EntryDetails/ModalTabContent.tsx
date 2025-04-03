
/**
 * This component renders the tab content for the anamnesis detail modal.
 * It switches between patient information and notes based on the active tab.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientInfo } from "./PatientInfo";
import { EntryAnswers } from "./EntryAnswers";
import { InternalNotes } from "./InternalNotes";

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
  showPatientInfoSection
}: ModalTabContentProps) {
  return (
    <Tabs 
      defaultValue="info" 
      value={activeTab} 
      onValueChange={setActiveTab} 
      className="flex-1 flex flex-col"
    >
      <TabsList>
        <TabsTrigger value="info">Information</TabsTrigger>
        <TabsTrigger value="notes">Anteckningar</TabsTrigger>
      </TabsList>
      
      <TabsContent value="info" className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {showPatientInfoSection && (
              <PatientInfo 
                patientEmail={patientEmail}
                isEditing={isEditing}
                setIsEditing={toggleEditing}
                setPatientEmail={setPatientEmail}
                savePatientEmail={savePatientEmail}
              />
            )}
            
            <EntryAnswers 
              answers={answers}
              hasAnswers={hasAnswers}
              status={status}
            />
          </div>
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="notes" className="flex-1 flex flex-col">
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
