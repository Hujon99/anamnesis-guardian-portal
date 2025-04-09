
/**
 * This component manages the tab content in the anamnesis detail modal.
 * It handles displaying patient information, formatted raw data, and answers.
 * 
 * The component adapts to the type of data available and provides appropriate 
 * interfaces for each content type.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientInfo } from "./PatientInfo";
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
  // Calculate if we have tabs to show
  const hasAnswersTab = hasAnswers || status === "sent";
  const hasPatientInfoTab = showPatientInfoSection;
  
  // Main content tabs
  return (
    <div className="h-full flex flex-col flex-1 overflow-hidden">
      {/* If we have at least one type of content to show */}
      {(hasAnswersTab || hasPatientInfoTab) ? (
        <Tabs defaultValue={hasAnswersTab ? "answers" : "patient-info"} className="h-full flex flex-col">
          <div className="border-b mb-4">
            <TabsList className={`mb-0 grid w-full ${hasAnswersTab && hasPatientInfoTab ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {hasAnswersTab && <TabsTrigger value="answers">Patient svar</TabsTrigger>}
              {hasPatientInfoTab && <TabsTrigger value="patient-info">Patient info</TabsTrigger>}
            </TabsList>
          </div>
          
          {hasAnswersTab && (
            <TabsContent value="answers" className="h-full flex flex-col overflow-hidden m-0 p-0">
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
          
          {hasPatientInfoTab && (
            <TabsContent value="patient-info" className="h-full m-0 p-0">
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
        </Tabs>
      ) : (
        // Fallback when no sections are available
        <div className="h-full flex items-center justify-center text-muted-foreground">
          Ingen information tillgänglig
        </div>
      )}
    </div>
  );
}
