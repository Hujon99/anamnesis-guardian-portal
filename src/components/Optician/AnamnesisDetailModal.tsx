
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
import { useRobustUserRole } from "@/hooks/useRobustUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, RefreshCw, Loader2 } from "lucide-react";

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
    isAdmin, 
    isOptician, 
    isLoading: isLoadingRole,
    error: roleError,
    retry: retryRole,
    retryCount
  } = useRobustUserRole();
  
  // Only admin and optician can view anamnesis details
  const canViewDetails = isAdmin || isOptician;
  
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

  // Show loading state while checking permissions
  if (isLoadingRole) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="p-6 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Verifierar behörigheter...
              {retryCount > 0 && ` (försök ${retryCount}/${3})`}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state with retry option
  if (roleError && !canViewDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="p-6 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold">Problem med behörighetskontroll</h3>
            <Alert variant="destructive">
              <AlertDescription>
                Det gick inte att verifiera dina behörigheter. Detta kan bero på ett tillfälligt anslutningsfel.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button onClick={retryRole} variant="default" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Försök igen
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
                Stäng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show access denied message if user doesn't have permission
  if (!canViewDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="p-6 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Åtkomst nekad</h3>
            <Alert>
              <AlertDescription>
                Endast optiker och administratörer kan öppna och se detaljer om anamneser.
              </AlertDescription>
            </Alert>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
              Stäng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
