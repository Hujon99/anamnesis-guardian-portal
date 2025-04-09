
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
  const hasMultipleSections = hasAnswers || showPatientInfoSection;
  
  return (
    <>
      {hasMultipleSections ? (
        <Tabs defaultValue="raw-data" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mb-2 grid w-full grid-cols-3">
            <TabsTrigger value="raw-data">Rådatavy</TabsTrigger>
            <TabsTrigger value="formatted">Formaterad vy</TabsTrigger>
            {showPatientInfoSection && <TabsTrigger value="patient-info">Patient info</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="raw-data" className="flex-1 overflow-y-auto">
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
          
          <TabsContent value="formatted" className="flex-1 overflow-y-auto">
            <EntryAnswers
              answers={answers}
              hasAnswers={hasAnswers}
              status={status}
            />
          </TabsContent>
          
          {showPatientInfoSection && (
            <TabsContent value="patient-info" className="flex-1 overflow-y-auto">
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
        /* When there's only one section, just show it directly */
        <div className="flex-1 overflow-y-auto pt-4">
          {showPatientInfoSection ? (
            <PatientInfo
              patientEmail={patientEmail}
              isEditing={isEditing}
              toggleEditing={toggleEditing}
              setPatientEmail={setPatientEmail}
              savePatientEmail={savePatientEmail}
              status={status}
            />
          ) : (
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
          )}
        </div>
      )}
    </>
  );
}
