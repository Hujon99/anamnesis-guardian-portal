
/**
 * This component displays detailed information about an anamnesis entry
 * in a modal dialog. It's been refactored to improve maintainability
 * and separate concerns into smaller, more focused components.
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
    notes,
    patientEmail,
    isEditing,
    activeTab,
    isExpired,
    answers,
    hasAnswers,
    
    // Mutations
    updateEntryMutation,
    sendLinkMutation,
    
    // Actions
    setNotes,
    setPatientEmail,
    setActiveTab,
    toggleEditing,
    handleSaveNotes,
    handleSavePatientEmail,
    handleSendLink,
    handleStatusUpdate,
    handleSaveAiSummary,
    copyLinkToClipboard,
    
    // Print functions
    showPrintPreview,
    printForm
  } = useAnamnesisDetail(entry, onEntryUpdated, () => onOpenChange(false));

  // Determines if we need to show the patient info section
  const showPatientInfoSection = !entry.patient_email;

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
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            patientEmail={patientEmail}
            isEditing={isEditing}
            toggleEditing={toggleEditing}
            setPatientEmail={setPatientEmail}
            savePatientEmail={handleSavePatientEmail}
            notes={notes}
            setNotes={setNotes}
            saveNotes={handleSaveNotes}
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
        />
        
        <PrintStyles showPrintPreview={showPrintPreview} />
      </DialogContent>
    </Dialog>
  );
}
