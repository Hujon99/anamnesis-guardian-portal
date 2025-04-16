
/**
 * This file provides a detailed modal view for anamnesis entries with tabs for answers,
 * patient information, and actions. It shows comprehensive information about a
 * specific anamnesis entry and allows opticians to manage it.
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnamnesesEntry } from "@/types/anamnesis";
import { ModalHeader } from "./EntryDetails/ModalHeader";
import { OptimizedAnswersView } from "./EntryDetails/OptimizedAnswersView";
import { PatientInfo } from "./EntryDetails/PatientInfo";
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
  const [activeTab, setActiveTab] = useState("answers");
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
    onOpenChange(false);
    if (onEntryUpdated) {
      onEntryUpdated();
    }
  });
  
  // Reset to answers tab when modal opens or entry changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab("answers");
    }
  }, [isOpen, entry.id]);

  const handleDeleteEntry = () => {
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
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-6 mb-0 mt-2">
            <TabsTrigger value="answers">Svar</TabsTrigger>
            <TabsTrigger value="patient">Patient</TabsTrigger>
            <TabsTrigger value="optimized">Optimerad vy</TabsTrigger>
          </TabsList>
          
          <div className="p-6 pt-4 flex-1 overflow-auto">
            <TabsContent value="answers" className="m-0">
              <div>Content for answers tab</div>
            </TabsContent>
            
            <TabsContent value="patient" className="m-0">
              <PatientInfo 
                patientIdentifier={entry.patient_identifier || ""}
                isEditing={false}
                toggleEditing={() => {}}
                setPatientIdentifier={() => {}}
                savePatientIdentifier={() => {}}
                status={entry.status || ""}
              />
            </TabsContent>
            
            <TabsContent value="optimized" className="m-0">
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
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
