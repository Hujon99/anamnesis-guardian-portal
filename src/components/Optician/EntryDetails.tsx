
import { useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnamnesesEntry } from "@/pages/OpticianView";
import { formatDate } from "@/lib/date-utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ClipboardList, Loader2, Send, FileText, ArrowLeft, Clock, Calendar } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EntryDetailsProps {
  entry: AnamnesesEntry;
  onEntryUpdated: () => void;
}

export const EntryDetails = ({ entry, onEntryUpdated }: EntryDetailsProps) => {
  const { supabase } = useSupabaseClient();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(entry.internal_notes || "");
  const [patientEmail, setPatientEmail] = useState(entry.patient_email || "");
  const [isEditing, setIsEditing] = useState(false);

  const updateEntryMutation = useMutation({
    mutationFn: async ({ status, notes, email }: { status?: string; notes?: string; email?: string }) => {
      const updates: Partial<AnamnesesEntry> = {};
      
      if (status) updates.status = status;
      if (notes !== undefined) updates.internal_notes = notes;
      if (email !== undefined) updates.patient_email = email;
      
      const { data, error } = await supabase
        .from("anamnes_entries")
        .update(updates)
        .eq("id", entry.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnes-entries"] });
      toast({
        title: "Anamnesen uppdaterad",
        description: "Ändringarna har sparats.",
      });
      setIsEditing(false);
      onEntryUpdated();
    },
    onError: (error: any) => {
      toast({
        title: "Ett fel uppstod",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const sendLinkMutation = useMutation({
    mutationFn: async () => {
      if (!patientEmail) {
        throw new Error("E-post är obligatoriskt för att skicka länk");
      }
      
      const { data, error } = await supabase
        .from("anamnes_entries")
        .update({
          patient_email: patientEmail,
          status: "sent",
          sent_at: new Date().toISOString()
        })
        .eq("id", entry.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnes-entries"] });
      toast({
        title: "Länk skickad",
        description: "Anamneslänken har skickats till patienten.",
      });
      onEntryUpdated();
    },
    onError: (error: any) => {
      toast({
        title: "Ett fel uppstod",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateStatus = (newStatus: string) => {
    updateEntryMutation.mutate({ status: newStatus, notes });
  };

  const saveNotes = () => {
    updateEntryMutation.mutate({ notes });
  };

  const savePatientEmail = () => {
    updateEntryMutation.mutate({ email: patientEmail });
    setIsEditing(false);
  };

  const sendLink = () => {
    sendLinkMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Utkast</Badge>;
      case "sent":
        return <Badge variant="secondary">Skickad till patient</Badge>;
      case "pending":
        return <Badge variant="warning">Väntar på granskning</Badge>;
      case "ready":
        return <Badge variant="success">Klar för undersökning</Badge>;
      case "reviewed":
        return <Badge className="bg-purple-500">Granskad</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
  const answers = entry.answers as Record<string, string> || {};
  const hasAnswers = entry.answers && Object.keys(answers).length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">
              {entry.patient_email || `Anamnes #${entry.id.substring(0, 8)}`}
            </CardTitle>
            <CardDescription className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Skapad: {formatDate(entry.created_at || "")}</span>
              </div>
              {entry.sent_at && (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <span>Skickad: {formatDate(entry.sent_at)}</span>
                </div>
              )}
              {entry.expires_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className={isExpired ? "text-destructive" : ""}>
                    Giltig till: {formatDate(entry.expires_at)}
                    {isExpired && " (Utgången)"}
                  </span>
                </div>
              )}
            </CardDescription>
          </div>
          {getStatusBadge(entry.status || "")}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {(entry.status === "draft" || !entry.patient_email) && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Patientinformation</h3>
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                    >
                      Redigera
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setIsEditing(false);
                        setPatientEmail(entry.patient_email || "");
                      }}
                    >
                      Avbryt
                    </Button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="patientEmail">Patientens e-post</Label>
                    <div className="flex gap-2">
                      <Input
                        id="patientEmail"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="patient@exempel.se"
                      />
                      <Button onClick={savePatientEmail}>Spara</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {entry.patient_email || "Ingen e-post angiven"}
                  </p>
                )}
              </div>
            )}
            
            {hasAnswers ? (
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-primary" />
                  Patientens svar
                </h3>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Fråga</TableHead>
                      <TableHead>Svar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(answers).map(([question, answer]) => (
                      <TableRow key={question}>
                        <TableCell className="font-medium">{question}</TableCell>
                        <TableCell>{answer}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              entry.status !== "draft" && (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {entry.status === "sent" 
                      ? "Väntar på att patienten ska fylla i anamnesen" 
                      : "Ingen information från patienten"}
                  </p>
                </div>
              )
            )}
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Interna anteckningar</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lägg till anteckningar för framtida undersökning..."
                rows={4}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={saveNotes}
                disabled={updateEntryMutation.isPending}
              >
                {updateEntryMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Spara anteckningar
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="border-t pt-4 flex justify-between">
        {entry.status === "draft" && (
          <Button 
            onClick={sendLink}
            disabled={!patientEmail || sendLinkMutation.isPending}
            className="w-full"
          >
            {sendLinkMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Send className="h-4 w-4 mr-2" />
            Skicka till patient
          </Button>
        )}
        
        {entry.status === "pending" && (
          <Button 
            onClick={() => updateStatus("ready")}
            disabled={updateEntryMutation.isPending}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Markera som klar för undersökning
          </Button>
        )}
        
        {entry.status === "ready" && (
          <Button 
            onClick={() => updateStatus("pending")}
            variant="outline"
            disabled={updateEntryMutation.isPending}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Markera som ej granskad
          </Button>
        )}
        
        {entry.status === "sent" && (
          <Button 
            onClick={() => updateStatus("pending")}
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
      </CardFooter>
    </Card>
  );
};
