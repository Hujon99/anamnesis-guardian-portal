
/**
 * This component handles the tab content within the anamnesis detail modal.
 * It organizes different sections of information into tabs and manages
 * the display of patient information, answers, and assignment details.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientInfo } from "./PatientInfo";
import { EntryAnswers } from "./EntryAnswers";
import { AssignmentSection } from "./AssignmentSection";
import { OptimizedAnswersView } from "./OptimizedAnswers/OptimizedAnswersView";
import { DrivingLicenseResults } from "./DrivingLicenseResults";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useDrivingLicenseStatus } from "@/hooks/useDrivingLicenseStatus";
import { IdVerificationQuickUpdate } from "../IdVerificationQuickUpdate";

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
  onEntryUpdate?: () => void;
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
  onAssignStore,
  onEntryUpdate
}: ModalTabContentProps) {
  
  // Check if this is a driving license examination
  const isDrivingLicenseExam = entry.examination_type?.toLowerCase() === 'körkortsundersökning';
  const { isCompleted: isDrivingLicenseCompleted, examination, isLoading } = useDrivingLicenseStatus(entry.id);
  const showDrivingLicenseTab = isDrivingLicenseExam;
  
  return (
    <Tabs defaultValue={showDrivingLicenseTab ? "driving" : "patient"} className="w-full">
      <TabsList className={`grid w-full ${showDrivingLicenseTab ? 'grid-cols-4' : 'grid-cols-3'} mb-4`}>
        {showDrivingLicenseTab && (
          <TabsTrigger value="driving">Körkort</TabsTrigger>
        )}
        <TabsTrigger value="patient">Patient</TabsTrigger>
        <TabsTrigger value="answers">Svar</TabsTrigger>
        <TabsTrigger value="assignment">Tilldelning</TabsTrigger>
      </TabsList>
      
      <TabsContent value="patient" className="mt-0 space-y-6">
        <div className="p-4 border rounded-lg bg-background">
          <PatientInfo
            patientIdentifier={patientIdentifier}
            isEditing={isEditing}
            toggleEditing={toggleEditing}
            setPatientIdentifier={setPatientIdentifier}
            savePatientIdentifier={savePatientIdentifier}
            status={status}
          />
        </div>
        
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
      
      <TabsContent value="answers" className="mt-0">
        <div className="p-4 border rounded-lg bg-background">
          <EntryAnswers 
            answers={answers} 
            hasAnswers={hasAnswers} 
            status={status}
          />
        </div>
      </TabsContent>
      
      <TabsContent value="assignment" className="mt-0">
        <div className="p-4 border rounded-lg bg-background">
          <AssignmentSection
            entry={entry}
            onAssignOptician={onAssignOptician}
            onAssignStore={onAssignStore}
            isPending={isPending}
            onEntryUpdate={onEntryUpdate}
          />
        </div>
      </TabsContent>
      
      {showDrivingLicenseTab && (
        <TabsContent value="driving" className="mt-0">
          <div className="space-y-4">
            {/* ID Verification Quick Update for entries needing verification */}
            {(entry.status === 'pending_id_verification' || 
              (entry.status === 'ready' && !entry.id_verification_completed)) && (
              <div className="p-4 border rounded-lg bg-background">
                <IdVerificationQuickUpdate
                  entryId={entry.id}
                  customerName={entry.first_name || entry.patient_identifier?.split(' (')[0] || 'Okänd kund'}
                  onVerificationComplete={() => onEntryUpdate?.()}
                />
              </div>
            )}
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Laddar körkortsdata...</p>
              </div>
            ) : examination ? (
              <DrivingLicenseResults 
                examination={examination}
                entry={entry}
                answers={answers}
                onDecisionUpdate={() => {
                  // Trigger a refresh if needed
                  window.location.reload();
                }}
              />
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Ingen körkortsdata tillgänglig</p>
              </div>
            )}
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}
