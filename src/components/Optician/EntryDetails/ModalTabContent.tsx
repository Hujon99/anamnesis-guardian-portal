
/**
 * This component manages the tab content in the anamnesis detail modal.
 * It handles displaying patient information, formatted raw data, and answers.
 * 
 * The component adapts to the type of data available and provides appropriate 
 * interfaces for each content type.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientInfo } from "./PatientInfo";
import { EntryAnswers } from "./EntryAnswers";
import { OptimizedAnswersView } from "./OptimizedAnswersView";
import { AnamnesesEntry } from "@/types/anamnesis";

interface ModalTabContentProps {
  patientEmail: string;
  isEditing: boolean;
  toggleEditing: () => void;
  setPatientEmail: (email: string) => void;
  savePatientEmail: () => void;
  formattedRawData: string;
  setFormattedRawData: (data: string) => void;
  saveFormattedRawData: () => void;
  isPending: boolean;
  answers: Record<string, any>;
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
  formattedRawData,
  setFormattedRawData,
  saveFormattedRawData,
  isPending,
  answers,
  hasAnswers,
  status,
  showPatientInfoSection,
  entry,
  onSaveAiSummary
}: ModalTabContentProps) {
  // Determine what tabs should be shown based on available data
  const showAnswersTab = hasAnswers;
  const showPatientInfoTab = showPatientInfoSection;
  
  // Calculate total number of tabs
  const totalTabs = [showAnswersTab, showPatientInfoTab].filter(Boolean).length;
  
  // Define default tab - prioritize patient answers if available
  const defaultTab = showAnswersTab ? "answers" : (showPatientInfoTab ? "patient-info" : "answers");
  
  return (
    <div className="h-full flex flex-col flex-1 overflow-hidden">
      {totalTabs > 0 ? (
        <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
          <TabsList className={`mb-2 grid w-full ${totalTabs === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showAnswersTab && <TabsTrigger value="answers">Patient svar</TabsTrigger>}
            {showPatientInfoTab && <TabsTrigger value="patient-info">Patient info</TabsTrigger>}
          </TabsList>
          
          <div className="flex-1 overflow-hidden">
            {showAnswersTab && (
              <TabsContent value="answers" className="h-full">
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
              </TabsContent>
            )}
            
            {showPatientInfoTab && (
              <TabsContent value="patient-info" className="h-full">
                <PatientInfo
                  patientEmail={patientEmail}
                  isEditing={isEditing}
                  toggleEditing={toggleEditing}
                  setPatientEmail={setPatientEmail}
                  savePatientEmail={savePatientEmail}
                  status={status}
                />
              </TabsContent>
            )}
          </div>
        </Tabs>
      ) : (
        // Fallback when no sections are available (shouldn't typically happen)
        <div className="h-full flex items-center justify-center text-muted-foreground">
          Ingen information tillgänglig
        </div>
      )}
    </div>
  );
}
