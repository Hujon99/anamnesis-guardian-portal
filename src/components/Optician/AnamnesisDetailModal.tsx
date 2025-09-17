
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
    patientIdentifier,
    isEditing,
    isExpired,
    answers,
    hasAnswers,
    
    // Mutations
    updateEntryMutation,
    sendLinkMutation,
    assignOpticianMutation,
    assignStoreMutation,
    
    // Actions
    setFormattedRawData,
    setPatientIdentifier,
    toggleEditing,
    handleSaveFormattedRawData,
    handleSavePatientIdentifier,
    handleSendLink,
    handleStatusUpdate,
    handleSaveAiSummary,
    handleAssignOptician,
    handleAssignStore,
    copyLinkToClipboard
  } = useAnamnesisDetail(entry, onEntryUpdated, () => onOpenChange(false));

  // Determines if we need to show the patient info section
  const showPatientInfoSection = !entry.patient_identifier;
  
  // Combine all pending states
  const isPending = 
    updateEntryMutation.isPending || 
    sendLinkMutation.isPending || 
    assignOpticianMutation.isPending || 
    assignStoreMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-0" 
        aria-label="Anamnesdetaljer"
      >
        <div className="sticky top-0 z-10 bg-background border-b p-4 sm:p-5">
          <ModalHeader 
            entry={entry}
            isExpired={isExpired}
            copyLinkToClipboard={copyLinkToClipboard}
            handleSendLink={handleSendLink}
            isSendingLink={sendLinkMutation.isPending}
          />
        </div>
        
        <div className="p-4 sm:p-5">
          <ModalTabContent
            patientIdentifier={patientIdentifier}
            isEditing={isEditing}
            toggleEditing={toggleEditing}
            setPatientIdentifier={setPatientIdentifier}
            savePatientIdentifier={handleSavePatientIdentifier}
            formattedRawData={formattedRawData}
            setFormattedRawData={setFormattedRawData}
            saveFormattedRawData={handleSaveFormattedRawData}
            isPending={isPending}
            answers={answers}
            hasAnswers={hasAnswers}
            status={entry.status || ""}
            showPatientInfoSection={showPatientInfoSection}
            entry={entry}
            onSaveAiSummary={handleSaveAiSummary}
            onAssignOptician={handleAssignOptician}
            onAssignStore={handleAssignStore}
            onEntryUpdate={() => {
              // Refresh the entry data by calling the parent's update handler
              onEntryUpdated();
            }}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>
        
        <div className="sticky bottom-0 z-10 bg-background border-t p-4 sm:p-5">
          <ModalActions
            status={entry.status || ""}
            hasAnswers={hasAnswers}
            isPending={updateEntryMutation.isPending}
            onUpdateStatus={handleStatusUpdate}
            entryToken={entry.access_token || undefined}
            onCloseModal={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
