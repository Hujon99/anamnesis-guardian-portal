
import { useState } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";

import { useEntryMutations } from "@/hooks/useEntryMutations";
import { usePrintFunction } from "@/hooks/usePrintFunction";

import { EntryHeader } from "./EntryDetails/EntryHeader";
import { PatientInfo } from "./EntryDetails/PatientInfo";
import { EntryAnswers } from "./EntryDetails/EntryAnswers";
import { InternalNotes } from "./EntryDetails/InternalNotes";
import { EntryActions } from "./EntryDetails/EntryActions";
import { PrintStyles } from "./EntryDetails/PrintStyles";

interface EntryDetailsProps {
  entry: AnamnesesEntry;
  onEntryUpdated: () => void;
}

export const EntryDetails = ({ entry, onEntryUpdated }: EntryDetailsProps) => {
  const [notes, setNotes] = useState(entry.internal_notes || "");
  const [patientEmail, setPatientEmail] = useState(entry.patient_email || "");
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    updateEntryMutation,
    sendLinkMutation,
    updateStatus,
    saveNotes: saveNotesToServer,
    savePatientEmail: savePatientEmailToServer,
    sendLink: sendLinkToServer
  } = useEntryMutations(entry.id, onEntryUpdated);
  
  const { showPrintPreview, printForm, exportToPDF } = usePrintFunction();

  const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
  const answers = entry.answers as Record<string, string> || {};
  const hasAnswers = entry.answers && Object.keys(answers).length > 0;

  const getSummary = () => {
    if (!hasAnswers) return "Ingen information från patienten ännu.";
    
    const problemText = answers.problem || "";
    const symptomText = answers.symptom || "";
    
    return `${problemText.substring(0, 60)}${problemText.length > 60 ? '...' : ''} ${symptomText ? '• ' + symptomText.substring(0, 60) + (symptomText.length > 60 ? '...' : '') : ''}`;
  };

  const handleSaveNotes = () => {
    saveNotesToServer(notes);
  };

  const handleSavePatientEmail = () => {
    savePatientEmailToServer(patientEmail);
    setIsEditing(false);
  };

  const handleSendLink = () => {
    if (!patientEmail) {
      toast({
        title: "E-post saknas",
        description: "Du måste ange en e-postadress till patienten.",
        variant: "destructive",
      });
      return;
    }
    sendLinkToServer(patientEmail);
  };

  const handleStatusUpdate = (newStatus: string) => {
    updateStatus(newStatus, notes);
  };

  return (
    <Card className={`h-full flex flex-col ${showPrintPreview ? 'print-view' : ''}`}>
      <EntryHeader 
        entry={entry}
        hasAnswers={hasAnswers}
        isExpired={isExpired}
        getSummary={getSummary}
        printForm={printForm}
        exportToPDF={() => toast({
          title: "Exporterar till PDF",
          description: "Funktionen är under utveckling och kommer snart.",
        })}
      />
      
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {(entry.status === "draft" || !entry.patient_email) && (
              <PatientInfo 
                patientEmail={patientEmail}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                setPatientEmail={setPatientEmail}
                savePatientEmail={handleSavePatientEmail}
              />
            )}
            
            <EntryAnswers 
              answers={answers}
              hasAnswers={hasAnswers}
              status={entry.status || ""}
            />
            
            <InternalNotes 
              notes={notes}
              setNotes={setNotes}
              saveNotes={handleSaveNotes}
              isPending={updateEntryMutation.isPending}
            />
          </div>
        </ScrollArea>
      </CardContent>
      
      <EntryActions 
        status={entry.status || ""}
        hasAnswers={hasAnswers}
        patientEmail={entry.patient_email}
        updateStatus={handleStatusUpdate}
        sendLink={handleSendLink}
        isPending={updateEntryMutation.isPending}
        isSendingLink={sendLinkMutation.isPending}
      />
      
      <PrintStyles showPrintPreview={showPrintPreview} />
    </Card>
  );
};
