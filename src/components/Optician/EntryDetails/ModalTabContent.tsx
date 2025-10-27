
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
import { CISSScoringResults } from "./CISSScoringResults";
import { AnamnesesEntry } from "@/types/anamnesis";
// Removed useDrivingLicenseStatus - now using pre-loaded data for performance
import { useGdprConfirmation } from "@/hooks/useGdprConfirmation";
import { IdVerificationQuickUpdate } from "../IdVerificationQuickUpdate";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";

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
  
  const { supabase } = useSupabaseClient();
  
  // Check if this is a driving license examination
  const isDrivingLicenseExam = entry.examination_type?.toLowerCase() === 'körkortsundersökning';
  // Use pre-loaded driving license status for better performance
  const isDrivingLicenseCompleted = entry.driving_license_status?.isCompleted || false;
  const examination = entry.driving_license_status?.examination || null;
  const isLoading = false; // No loading since data is pre-loaded
  const showDrivingLicenseTab = isDrivingLicenseExam;

  // Check if this is a CISS form
  const isCISSForm = entry.examination_type?.toLowerCase() === 'ciss' || 
                     entry.examination_type?.toLowerCase() === 'ciss-formulär';
  const scoringResult = entry.scoring_result || entry.answers?.scoring_result;
  const showCISSTab = isCISSForm && scoringResult;

  // Fetch form template for proper question labels
  const { data: formTemplate } = useQuery({
    queryKey: ['form-template', entry.answers?.metadata?.formTemplateId || entry.form_id],
    queryFn: async () => {
      const formId = entry.answers?.metadata?.formTemplateId || entry.form_id;
      if (!formId) return null;
      
      const { data, error } = await supabase
        .from('anamnes_forms')
        .select('*')
        .eq('id', formId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!(entry.answers?.metadata?.formTemplateId || entry.form_id)
  });

  // Fetch GDPR confirmation data
  const { data: gdprConfirmation, isLoading: gdprLoading } = useGdprConfirmation(entry.id);
  
  // Determine grid columns based on which tabs are visible
  const gridCols = showDrivingLicenseTab && showCISSTab ? 'grid-cols-4' :
                   showDrivingLicenseTab || showCISSTab ? 'grid-cols-3' : 
                   'grid-cols-2';
  
  // Set default tab - prioritize CISS scoring if available
  const defaultTab = showCISSTab ? "scoring" : 
                     showDrivingLicenseTab ? "driving" : 
                     "patient";
  
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className={`grid w-full ${gridCols} mb-4`}>
        {showCISSTab && (
          <TabsTrigger value="scoring">Bedömning</TabsTrigger>
        )}
        {showDrivingLicenseTab && (
          <TabsTrigger value="driving">Körkort</TabsTrigger>
        )}
        <TabsTrigger value="patient">Patient</TabsTrigger>
        <TabsTrigger value="assignment">Tilldelning</TabsTrigger>
      </TabsList>
      
      {/* CISS Scoring Tab */}
      {showCISSTab && scoringResult && (
        <TabsContent value="scoring" className="mt-0">
          <div className="space-y-4">
            <CISSScoringResults 
              scoringResult={scoringResult}
              thresholdMessage={(formTemplate?.schema as any)?.scoring_config?.threshold_message}
              answers={answers}
            />
            
            {/* Show raw answers for reference */}
            <div className="p-4 border rounded-lg bg-background">
              <h4 className="font-medium mb-3 text-sm">Detaljerade svar</h4>
              <EntryAnswers answers={answers} hasAnswers={hasAnswers} status={status} />
            </div>
          </div>
        </TabsContent>
      )}
      
      <TabsContent value="patient" className="mt-0 space-y-6">
        <div className="p-4 border rounded-lg bg-background">
          <PatientInfo
            patientIdentifier={patientIdentifier}
            isEditing={isEditing}
            toggleEditing={toggleEditing}
            setPatientIdentifier={setPatientIdentifier}
            savePatientIdentifier={savePatientIdentifier}
            status={status}
            firstName={entry.first_name}
            personalNumber={entry.personal_number}
            isKioskMode={entry.is_kiosk_mode}
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
          scoringResult={scoringResult}
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
