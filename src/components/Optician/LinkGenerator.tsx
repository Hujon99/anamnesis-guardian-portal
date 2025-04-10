
/**
 * This component provides functionality for generating patient links.
 * It allows opticians to create new links, enter patient identifiers, and copy 
 * generated links to the clipboard for sharing with patients.
 */

import { useState } from "react";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, Plus, Link as LinkIcon, CheckCircle2 } from "lucide-react";

export function LinkGenerator() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { supabase } = useSupabaseClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [patientIdentifier, setPatientIdentifier] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [hasCopied, setHasCopied] = useState(false);
  const queryClient = useQueryClient();

  const createAnamnesisEntry = useMutation({
    mutationFn: async (identifier: string) => {
      if (!organization?.id) {
        throw new Error("Organisation saknas");
      }

      console.log("Creating entry with organization ID:", organization.id);
      console.log("Current user ID:", user?.id || null);

      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          access_token: crypto.randomUUID(),
          status: "sent",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          form_id: crypto.randomUUID(),
          patient_email: identifier.trim() || null,
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
        description: "Länken har skapats för patienten",
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
    createAnamnesisEntry.mutate(patientIdentifier);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink)
      .then(() => {
        setHasCopied(true);
        toast({
          title: "Kopierad!",
          description: "Länken har kopierats till urklipp",
        });
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setHasCopied(false);
        }, 2000);
      })
      .catch((error) => {
        console.error("Error copying link:", error);
        toast({
          title: "Kunde inte kopiera",
          description: "Det gick inte att kopiera länken. Försök igen.",
          variant: "destructive",
        });
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
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl">Skapa ny patientlänk</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Skapa en unik länk för patienten som kommer vara giltig i 7 dagar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-3">
            <Label htmlFor="patientIdentifier" className="text-sm font-medium">Patient (namn/nummer)</Label>
            <Input
              id="patientIdentifier"
              placeholder="T.ex. Anna Andersson eller P12345"
              value={patientIdentifier}
              onChange={(e) => setPatientIdentifier(e.target.value)}
              className="p-3"
            />
          </div>
          
          {generatedLink && (
            <div className="grid gap-3 pt-2">
              <Label htmlFor="link" className="text-sm font-medium">Patientlänk</Label>
              <div className="flex gap-2">
                <Input
                  id="link"
                  value={generatedLink}
                  readOnly
                  className="flex-1 p-3 bg-gray-50"
                />
                <Button 
                  onClick={copyToClipboard} 
                  className="min-w-[110px] transition-all duration-300"
                  variant={hasCopied ? "secondary" : "default"}
                >
                  {hasCopied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Kopierad
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopiera
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-2">
          {!generatedLink ? (
            <Button 
              onClick={handleCreateLink}
              disabled={createAnamnesisEntry.isPending}
              className="w-full sm:w-auto"
            >
              {createAnamnesisEntry.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-2" />
              )}
              Skapa länk
            </Button>
          ) : (
            <Button 
              onClick={() => {
                setIsDialogOpen(false);
                setGeneratedLink("");
                setPatientIdentifier("");
                setHasCopied(false);
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Stäng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
