
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
import { AssignmentSection } from "./AssignmentSection";

interface ModalTabContentProps {
  patientIdentifier: string; 
  isEditing: boolean;
  toggleEditing: () => void;
  setPatientIdentifier: (value: string) => void;
  savePatientIdentifier: () => void;
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
  // Calculate if we have tabs to show
  const hasAnswersTab = hasAnswers || status === "sent";
  const hasPatientInfoTab = showPatientInfoSection;
  const hasAssignmentTab = true; // Always show assignments tab
  
  console.log("ModalTabContent rendering with:", {
    hasAnswers,
    hasPatientInfoTab,
    hasAssignmentTab,
    aiSummary: entry.ai_summary ? `length: ${entry.ai_summary.length}` : "none",
    formattedRawData: formattedRawData ? `length: ${formattedRawData.length}` : "none"
  });

  // Main content tabs
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* If we have at least one type of content to show */}
      {(hasAnswersTab || hasPatientInfoTab || hasAssignmentTab) ? (
        <Tabs defaultValue={hasAnswersTab ? "answers" : hasPatientInfoTab ? "patient-info" : "assignments"} className="flex flex-col h-full">
          <TabsList className="mx-4 mb-2">
            {hasAnswersTab && (
              <TabsTrigger value="answers">Patientens svar</TabsTrigger>
            )}
            {hasPatientInfoTab && (
              <TabsTrigger value="patient-info">Patientuppgifter</TabsTrigger>
            )}
            <TabsTrigger value="assignments">Tilldelningar</TabsTrigger>
          </TabsList>
          
          <div className="flex-grow overflow-hidden">
            {hasAnswersTab && (
              <TabsContent 
                value="answers" 
                className="h-full m-0 border-0 p-0 flex flex-col"
              >
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
              <TabsContent 
                value="patient-info" 
                className="h-full m-0 border-0 p-0 flex flex-col"
              >
                <PatientInfo 
                  patientIdentifier={patientIdentifier}
                  isEditing={isEditing}
                  toggleEditing={toggleEditing}
                  setPatientIdentifier={setPatientIdentifier}
                  savePatientIdentifier={savePatientIdentifier}
                  status={status}
                />
              </TabsContent>
            )}
            
            <TabsContent 
              value="assignments" 
              className="h-full m-0 border-0 p-0 flex flex-col"
            >
              <AssignmentSection 
                entry={entry}
                onAssignOptician={onAssignOptician}
                onAssignStore={onAssignStore}
                isPending={isPending}
              />
            </TabsContent>
          </div>
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
