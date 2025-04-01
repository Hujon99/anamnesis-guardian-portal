
import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { EntriesList } from "@/components/Optician/EntriesList";
import { EntryDetails } from "@/components/Optician/EntryDetails";
import { OpticianHeader } from "@/components/Optician/OpticianHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Plus, Copy } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type AnamnesesEntry = Tables<"anamnes_entries">;

const OpticianView = () => {
  const { organization } = useOrganization();
  const { supabase, isLoading: supabaseLoading } = useSupabaseClient();
  const { isSyncing, isSynced } = useSyncOrganization();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [patientEmail, setPatientEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    setSelectedEntry(null);
  }, [activeTab]);

  const createAnamnesisEntry = useMutation({
    mutationFn: async (email: string) => {
      if (!organization?.id) {
        throw new Error("Organisation saknas");
      }

      const formId = crypto.randomUUID();
      console.log("Creating entry with organization ID:", organization.id);

      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          access_token: crypto.randomUUID(),
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          form_id: formId,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating entry:", error);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/patient-form?token=${data.access_token}`;
      setGeneratedLink(link);
      
      queryClient.invalidateQueries({ queryKey: ["anamnes-entries"] });
      
      toast({
        title: "Länk skapad",
        description: "Du kan nu kopiera länken och skicka till patienten",
      });
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Fel vid skapande av länk",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateLink = () => {
    createAnamnesisEntry.mutate(patientEmail);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({
      title: "Kopierad!",
      description: "Länken har kopierats till urklipp",
    });
  };

  const isReady = !supabaseLoading && !isSyncing && isSynced;

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fel</AlertTitle>
        <AlertDescription>
          {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Laddar...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <OpticianHeader />
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Skapa patientlänk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skapa ny patientlänk</DialogTitle>
              <DialogDescription>
                Skapa en unik länk som du kan skicka till patienten via SMS eller e-post.
                Länken kommer att vara giltig i 7 dagar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="patientEmail">Patientens e-post (valfritt)</Label>
                <Input
                  id="patientEmail"
                  placeholder="patient@exempel.se"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                />
              </div>
              
              {generatedLink && (
                <div className="grid gap-2">
                  <Label htmlFor="link">Patientlänk</Label>
                  <div className="flex gap-2">
                    <Input
                      id="link"
                      value={generatedLink}
                      readOnly
                      className="flex-1"
                    />
                    <Button onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopiera
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              {!generatedLink ? (
                <Button 
                  onClick={handleCreateLink}
                  disabled={createAnamnesisEntry.isPending}
                >
                  {createAnamnesisEntry.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Generera länk
                </Button>
              ) : (
                <Button onClick={() => {
                  setIsDialogOpen(false);
                  setGeneratedLink("");
                  setPatientEmail("");
                }}>
                  Stäng
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid md:grid-cols-12 gap-6 mt-6">
        <div className="md:col-span-5 lg:col-span-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">Att granska</TabsTrigger>
              <TabsTrigger value="ready">Klara</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-4">
              <EntriesList 
                status="pending" 
                selectedEntry={selectedEntry}
                onSelectEntry={setSelectedEntry}
              />
            </TabsContent>
            
            <TabsContent value="ready" className="mt-4">
              <EntriesList 
                status="ready" 
                selectedEntry={selectedEntry}
                onSelectEntry={setSelectedEntry}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="md:col-span-7 lg:col-span-8">
          {selectedEntry ? (
            <EntryDetails 
              entry={selectedEntry} 
              onEntryUpdated={() => setSelectedEntry(null)} 
            />
          ) : (
            <div className="border rounded-lg p-6 text-center h-full flex items-center justify-center">
              <p className="text-muted-foreground">
                Välj en anamnes från listan för att se detaljer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpticianView;
