
/**
 * This file provides a detailed modal view for anamnesis entries focused on
 * the optimized view of patient responses. It shows comprehensive information
 * about a specific anamnesis entry and allows opticians to manage it.
 */

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AnamnesesEntry } from "@/types/anamnesis";
import { ModalHeader } from "./EntryDetails/ModalHeader";
import { OptimizedAnswersView } from "./EntryDetails/OptimizedAnswersView";
import { useAnamnesisDetail } from "@/hooks/useAnamnesisDetail";
import { useDeleteAnamnesisEntry } from "@/hooks/useDeleteAnamnesisEntry";

interface AnamnesisDetailModalProps {
  entry: AnamnesesEntry;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryUpdated?: () => void;
}

export function AnamnesisDetailModal({
  entry,
  isOpen,
  onOpenChange,
  onEntryUpdated
}: AnamnesisDetailModalProps) {
  const { 
    copyLinkToClipboard,
    handleSendLink,
    isExpired,
    sendLinkMutation
  } = useAnamnesisDetail(
    entry, 
    onEntryUpdated || (() => {})
  );

  const { deleteEntry, isDeleting } = useDeleteAnamnesisEntry(() => {
    console.log("Entry deletion completed, closing modal and refreshing list");
    onOpenChange(false);
    if (onEntryUpdated) {
      onEntryUpdated();
    }
  });
  
  const handleDeleteEntry = () => {
    console.log("Deleting entry with ID:", entry.id);
    deleteEntry(entry.id);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-0">
          <ModalHeader
            entry={entry}
            isExpired={isExpired}
            copyLinkToClipboard={copyLinkToClipboard}
            handleSendLink={handleSendLink}
            isSendingLink={sendLinkMutation.isPending}
            onDelete={handleDeleteEntry}
            isDeleting={isDeleting}
          />
        </div>

        <div className="p-6 pt-4 flex-1 overflow-auto">
          <OptimizedAnswersView 
            answers={entry.answers as Record<string, any> || {}}
            hasAnswers={Boolean(entry.answers && Object.keys(entry.answers).length > 0)}
            status={entry.status || ""}
            entryId={entry.id}
            aiSummary={entry.ai_summary}
            onSaveSummary={() => { if (onEntryUpdated) onEntryUpdated(); }}
            formattedRawData={entry.formatted_raw_data || ""}
            setFormattedRawData={() => {}}
            saveFormattedRawData={() => {}}
            isPending={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
