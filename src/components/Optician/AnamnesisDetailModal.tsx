
/**
 * This component displays detailed information about an anamnesis entry
 * in a modal dialog. It's been refactored to improve maintainability
 * and separate concerns into smaller, more focused components.
 * It now uses formatted_raw_data as the single source of truth for
 * patient answers and optician notes.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAnamnesisDetail } from "@/hooks/useAnamnesisDetail";
import { PrintStyles } from "./EntryDetails/PrintStyles";
import { ModalHeader } from "./EntryDetails/ModalHeader";
import { ModalTabContent } from "./EntryDetails/ModalTabContent";
import { ModalActions } from "./EntryDetails/ModalActions";

interface AnamnesisDetailModalProps {
  entry: AnamnesesEntry;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryUpdated: () => void;
}

export function AnamnesisDetailModal({
  entry,
  isOpen,
  onOpenChange,
  onEntryUpdated
}: AnamnesisDetailModalProps) {
  const {
    // State
    formattedRawData,
    patientIdentifier, // Updated from patientEmail
    isEditing,
    isExpired,
    answers,
    hasAnswers,
    
    // Mutations
    updateEntryMutation,
    sendLinkMutation,
    
    // Actions
    setFormattedRawData,
    setPatientIdentifier, // Updated from setPatientEmail
    toggleEditing,
    handleSaveFormattedRawData,
    handleSavePatientIdentifier, // Updated from handleSavePatientEmail
    handleSendLink,
    handleStatusUpdate,
    handleSaveAiSummary,
    copyLinkToClipboard,
    
    // Print functions
    showPrintPreview,
    printForm
  } = useAnamnesisDetail(entry, onEntryUpdated, () => onOpenChange(false));

  // Determines if we need to show the patient info section
  const showPatientInfoSection = !entry.patient_identifier; // Updated from patient_email

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl h-[90vh] flex flex-col p-5 max-h-[90vh] overflow-hidden" 
        aria-label="Anamnesdetaljer"
      >
        <ModalHeader 
          entry={entry}
          isExpired={isExpired}
          copyLinkToClipboard={copyLinkToClipboard}
          handleSendLink={handleSendLink}
          printForm={printForm}
          isSendingLink={sendLinkMutation.isPending}
        />
        
        <div className="flex-1 overflow-hidden">
          <ModalTabContent
            patientIdentifier={patientIdentifier} // Updated from patientEmail
            isEditing={isEditing}
            toggleEditing={toggleEditing}
            setPatientIdentifier={setPatientIdentifier} // Updated from setPatientEmail
            savePatientIdentifier={handleSavePatientIdentifier} // Updated from savePatientEmail
            formattedRawData={formattedRawData}
            setFormattedRawData={setFormattedRawData}
            saveFormattedRawData={handleSaveFormattedRawData}
            isPending={updateEntryMutation.isPending}
            answers={answers}
            hasAnswers={hasAnswers}
            status={entry.status || ""}
            showPatientInfoSection={showPatientInfoSection}
            entry={entry}
            onSaveAiSummary={handleSaveAiSummary}
          />
        </div>
        
        <ModalActions
          status={entry.status || ""}
          hasAnswers={hasAnswers}
          isPending={updateEntryMutation.isPending}
          onUpdateStatus={handleStatusUpdate}
          entryToken={entry.access_token || undefined}
          onCloseModal={() => onOpenChange(false)}
        />
        
        <PrintStyles showPrintPreview={showPrintPreview} />
      </DialogContent>
    </Dialog>
  );
}
