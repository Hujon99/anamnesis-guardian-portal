
/**
 * This component handles the tab content within the anamnesis detail modal.
 * It organizes different sections of information into tabs and manages
 * the display of patient information, answers, and assignment details.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientInfo } from "./PatientInfo";
import { GdprConfirmationDisplay } from "./GdprConfirmationDisplay";
import { EntryAnswers } from "./EntryAnswers";
import { AssignmentSection } from "./AssignmentSection";
import { OptimizedAnswersView } from "./OptimizedAnswers/OptimizedAnswersView";
import { DrivingLicenseResults } from "./DrivingLicenseResults";
import { AnamnesesEntry } from "@/types/anamnesis";
// Removed useDrivingLicenseStatus - now using pre-loaded data for performance
import { useGdprConfirmation } from "@/hooks/useGdprConfirmation";
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
  onStatusUpdate?: (status: string) => Promise<void>;
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
  onEntryUpdate,
  onStatusUpdate
}: ModalTabContentProps) {
  
  // Check if this is a driving license examination
  const isDrivingLicenseExam = entry.examination_type?.toLowerCase() === 'körkortsundersökning';
  // Use pre-loaded driving license status for better performance
  const isDrivingLicenseCompleted = entry.driving_license_status?.isCompleted || false;
  const examination = entry.driving_license_status?.examination || null;
  const isLoading = false; // No loading since data is pre-loaded
  const showDrivingLicenseTab = isDrivingLicenseExam;

  // Fetch GDPR confirmation data
  const { data: gdprConfirmation, isLoading: gdprLoading } = useGdprConfirmation(entry.id);
  
  return (
    <Tabs defaultValue={showDrivingLicenseTab ? "driving" : "patient"} className="w-full">
      <TabsList className={`grid w-full ${showDrivingLicenseTab ? 'grid-cols-3' : 'grid-cols-2'} mb-4`}>
        {showDrivingLicenseTab && (
          <TabsTrigger value="driving">Körkort</TabsTrigger>
        )}
        <TabsTrigger value="patient">Patient</TabsTrigger>
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

        {/* GDPR Confirmation Display */}
        <GdprConfirmationDisplay 
          confirmation={gdprConfirmation}
          loading={gdprLoading}
        />
        
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
          onStatusUpdate={onStatusUpdate}
          examinationType={entry.examination_type}
        />
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
                  // Update entry data without reloading page
                  onEntryUpdate?.();
                }}
                onStatusUpdate={onStatusUpdate}
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
