
import { useState } from "react";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, Plus, Send } from "lucide-react";

export function LinkGenerator() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { supabase } = useSupabaseClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [patientEmail, setPatientEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const queryClient = useQueryClient();

  const createAnamnesisEntry = useMutation({
    mutationFn: async (email: string) => {
      if (!organization?.id) {
        throw new Error("Organisation saknas");
      }

      const formId = crypto.randomUUID();
      console.log("Creating entry with organization ID:", organization.id);
      console.log("Current user ID:", user?.id || null);

      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          access_token: crypto.randomUUID(),
          status: "sent",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          form_id: formId,
          patient_email: email.trim() || null,
          created_by: user?.id || null,
          sent_at: new Date().toISOString()
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
        description: "Länken har skapats och skickats till patienten",
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

  return (
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
            <Label htmlFor="patientEmail">Patientens e-post</Label>
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
              <Send className="h-4 w-4 mr-2" />
              Skapa och skicka länk
            </Button>
          ) : (
            <Button 
              onClick={() => {
                setIsDialogOpen(false);
                setGeneratedLink("");
                setPatientEmail("");
              }}
              variant="outline"
              className="flex-1"
            >
              Stäng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
