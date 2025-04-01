
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
import { CheckCircle, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EntryDetailsProps {
  entry: AnamnesesEntry;
  onEntryUpdated: () => void;
}

export const EntryDetails = ({ entry, onEntryUpdated }: EntryDetailsProps) => {
  const { supabase } = useSupabaseClient();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(entry.internal_notes || "");

  const updateEntryMutation = useMutation({
    mutationFn: async ({ status, notes }: { status?: string; notes?: string }) => {
      const updates: Partial<AnamnesesEntry> = {};
      
      if (status) updates.status = status;
      if (notes !== undefined) updates.internal_notes = notes;
      
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Väntar på granskning</Badge>;
      case "ready":
        return <Badge variant="success">Klar för undersökning</Badge>;
      case "reviewed":
        return <Badge variant="secondary">Granskad</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Mock data for demonstration
  const mockAnswers = entry.answers || {
    "Patientens namn": "Anna Andersson",
    "Födelsedatum": "1985-06-12",
    "Anledning till besök": "Återkommande huvudvärk vid läsning",
    "Tidigare glasögon": "Ja, i 5 år",
    "Medicinering": "Inga",
    "Allergier": "Pollen"
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Anamnes #{entry.id.substring(0, 8)}</CardTitle>
            <CardDescription>Skapad: {formatDate(entry.created_at)}</CardDescription>
          </div>
          {getStatusBadge(entry.status)}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <ClipboardList className="h-5 w-5 mr-2 text-primary" />
                Patientens svar
              </h3>
              
              <div className="space-y-4">
                {Object.entries(mockAnswers as Record<string, string>).map(([question, answer]) => (
                  <div key={question} className="border-b pb-3">
                    <p className="font-medium">{question}</p>
                    <p className="text-muted-foreground">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
            
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
        {entry.status === "pending" ? (
          <Button 
            onClick={() => updateStatus("ready")}
            disabled={updateEntryMutation.isPending}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Markera som klar för undersökning
          </Button>
        ) : (
          <Button 
            onClick={() => updateStatus("pending")}
            variant="outline"
            disabled={updateEntryMutation.isPending}
            className="w-full"
          >
            Markera som ej granskad
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
