/**
 * This component displays detailed information about an anamnesis entry
 * in a modal dialog, replacing the previous sidebar detail view.
 */

import { useState } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { usePrintFunction } from "@/hooks/usePrintFunction";
import { format, isAfter, isBefore } from "date-fns";
import { toast } from "@/components/ui/use-toast";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Copy, 
  Printer, 
  FileDown, 
  Mail,
  CheckCircle,
  ClipboardList,
  ArrowLeft,
  Star,
  Loader2
} from "lucide-react";

// Imported components
import { PatientInfo } from "./EntryDetails/PatientInfo";
import { EntryAnswers } from "./EntryDetails/EntryAnswers";
import { InternalNotes } from "./EntryDetails/InternalNotes";
import { PrintStyles } from "./EntryDetails/PrintStyles";

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
  const [notes, setNotes] = useState(entry.internal_notes || "");
  const [patientEmail, setPatientEmail] = useState(entry.patient_email || "");
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  
  const {
    updateEntryMutation,
    sendLinkMutation,
    updateStatus,
    saveNotes,
    savePatientEmail,
    sendLink
  } = useEntryMutations(entry.id, onEntryUpdated);
  
  const { showPrintPreview, printForm, exportToPDF } = usePrintFunction();

  const isExpired = entry.expires_at && isBefore(new Date(entry.expires_at), new Date());
  const answers = entry.answers as Record<string, string> || {};
  const hasAnswers = entry.answers && Object.keys(answers).length > 0;

  const handleSaveNotes = () => {
    saveNotes(notes);
  };

  const handleSavePatientEmail = () => {
    savePatientEmail(patientEmail);
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
    sendLink(patientEmail);
  };

  const handleStatusUpdate = (newStatus: string) => {
    updateStatus(newStatus, notes);
  };

  const copyLinkToClipboard = () => {
    if (entry.access_token) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/anamnes?token=${entry.access_token}`;
      
      navigator.clipboard.writeText(url).then(() => {
        toast({
          title: "Länk kopierad",
          description: "Länken till patienten har kopierats till urklipp.",
        });
      }).catch(err => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Kunde inte kopiera",
          description: "Det gick inte att kopiera länken. Försök igen.",
          variant: "destructive",
        });
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col" aria-label="Anamnesdetaljer">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {entry.patient_email || `Anamnes #${entry.id.substring(0, 8)}`}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={isExpired ? "destructive" : "outline"}
                className="flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                {isExpired 
                  ? "Utgången" 
                  : entry.expires_at 
                    ? `Giltig till: ${format(new Date(entry.expires_at), "yyyy-MM-dd")}`
                    : "Inget utgångsdatum"}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={printForm}
                title="Skriv ut"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Skickad: {entry.sent_at 
                ? format(new Date(entry.sent_at), "yyyy-MM-dd HH:mm") 
                : "Ej skickad"}
            </span>
          </div>
          
          {entry.access_token && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyLinkToClipboard}
                className="flex items-center gap-1"
              >
                <Copy className="h-3.5 w-3.5" />
                Kopiera länk
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSendLink}
                disabled={sendLinkMutation.isPending}
                className="flex items-center gap-1"
              >
                <Mail className="h-3.5 w-3.5" />
                {sendLinkMutation.isPending 
                  ? <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> 
                      Skickar...
                    </span>
                  : "Skicka länk igen"}
              </Button>
            </div>
          )}
        </DialogHeader>
        
        <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList>
            <TabsTrigger value="info">Information</TabsTrigger>
            <TabsTrigger value="notes">Anteckningar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {!entry.patient_email && (
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
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="notes" className="flex-1 flex flex-col">
            <InternalNotes 
              notes={notes}
              setNotes={setNotes}
              saveNotes={handleSaveNotes}
              isPending={updateEntryMutation.isPending}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6 border-t pt-4">
          {entry.status === "sent" && (
            <Button 
              onClick={() => handleStatusUpdate("pending")}
              variant="outline"
              disabled={!hasAnswers || updateEntryMutation.isPending}
              className="w-full"
            >
              {hasAnswers ? (
                <>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Börja granska
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Väntar på patientens svar
                </>
              )}
            </Button>
          )}
          
          {entry.status === "pending" && (
            <Button 
              onClick={() => handleStatusUpdate("ready")}
              disabled={updateEntryMutation.isPending}
              className="w-full"
            >
              {updateEntryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Markera som klar för undersökning
            </Button>
          )}
          
          {entry.status === "ready" && (
            <>
              <Button 
                onClick={() => handleStatusUpdate("reviewed")}
                disabled={updateEntryMutation.isPending}
                className="flex-1"
              >
                <Star className="h-4 w-4 mr-2" />
                Markera som granskad
              </Button>
              
              <Button 
                onClick={() => handleStatusUpdate("pending")}
                variant="outline"
                disabled={updateEntryMutation.isPending}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Markera som ej granskad
              </Button>
            </>
          )}
          
          {entry.status === "reviewed" && (
            <Button 
              onClick={() => handleStatusUpdate("ready")}
              variant="outline"
              disabled={updateEntryMutation.isPending}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Återställ till "Klar för undersökning"
            </Button>
          )}
        </DialogFooter>
        
        <PrintStyles showPrintPreview={showPrintPreview} />
      </DialogContent>
    </Dialog>
  );
}
