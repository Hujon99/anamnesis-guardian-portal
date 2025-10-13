
/**
 * This component provides functionality for generating and sending personalized
 * anamnesis links to patients. It handles the collection of patient information,
 * form creation, and notification to users about the process status.
 * It ensures that the generated links are associated with the correct organization
 * and automatically assigns the creating optician to the entry.
 */

import React, { useState, useEffect } from "react";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useSafeUser as useUser } from "@/hooks/useSafeUser";
import { useSafeAuth as useAuth } from "@/hooks/useSafeAuth";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AlertCircle, Link, Loader2, Plus, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { useUserSyncStore } from "@/hooks/useUserSyncStore";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";

// Form schema with validation for patient info
const formSchema = z.object({
  patientIdentifier: z.string().min(2, {
    message: "Patientinformation måste vara minst 2 tecken"
  })
});

export function LinkGenerator({ children }: { children?: React.ReactNode }) {
  const {
    organization
  } = useOrganization();
  const {
    user
  } = useUser();
  const {
    userId
  } = useAuth();
  const {
    supabase
  } = useSupabaseClient();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const { getSyncStatus } = useUserSyncStore();
  const { syncUsersWithToast } = useSyncClerkUsers();

  // Get the organization's form template
  const {
    data: formTemplate,
    isLoading: isLoadingTemplate
  } = useFormTemplate();

  // Get the creator's name from user object
  const creatorName = user?.fullName || user?.id || "Okänd";

  // Create form with validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientIdentifier: ""
    }
  });

  useEffect(() => {
    // Reset error message when dialog opens/closes
    setErrorMessage(null);
  }, [open]);

  // Check user sync status for current organization
  const orgId = organization?.id || '';
  const syncStatus = getSyncStatus(orgId);
  const needsUserSync = syncStatus !== 'synced' && errorMessage?.includes("violates foreign key constraint");

  // Mutation for creating and sending a link
  const sendLinkMutation = useMutation({
    mutationFn: async ({
      patientIdentifier
    }: {
      patientIdentifier: string;
    }) => {
      if (!organization?.id) {
        throw new Error("Organisation saknas");
      }
      if (!formTemplate) {
        throw new Error("Ingen formmall hittades för denna organisation");
      }
      console.log("Creating anamnesis entry with patient identifier:", patientIdentifier);
      console.log("Organization ID:", organization.id);
      console.log("Creator:", creatorName);
      console.log("Using form ID:", formTemplate.id);

      // Create a new anamnesis entry with a unique access token
      const accessToken = crypto.randomUUID();
      console.log("Generated access token:", accessToken.substring(0, 6) + "...");

      // Auto-assign the current optician who's creating the form
      // We use the Clerk user ID as the optician_id
      const opticianId = userId || null;
      console.log("Auto-assigning optician ID:", opticianId);
      const {
        data,
        error
      } = await supabase.from("anamnes_entries").insert({
        organization_id: organization.id,
        access_token: accessToken,
        status: "sent",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        // 7 days from now
        form_id: formTemplate.id,
        patient_identifier: patientIdentifier,
        created_by: userId || null,
        created_by_name: creatorName,
        sent_at: new Date().toISOString(),
        optician_id: opticianId // Auto-assign the creating optician
      }).select().single();
      
      if (error) {
        console.error("Error creating anamnesis entry:", error);
        
        // Check if error is related to missing user in the database
        if (error.message?.includes("violates foreign key constraint") || 
            error.message?.includes("foreign key violation")) {
          throw new Error("Användaren saknas i databasen. Synkronisera användare först.");
        }
        
        throw error;
      }

      // Log the URL that will be generated for debugging
      const baseUrl = window.location.origin;
      console.log("Patient form URL will be:", `${baseUrl}/patient-form?token=${accessToken}`);
      return data;
    },
    onSuccess: data => {
      console.log("Anamnesis entry created successfully:", data);
      toast({
        title: "Formulär skapat",
        description: "Formuläret har skapats, tilldelats till dig, och kan nu skickas till patienten"
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      console.error("Error creating anamnesis entry:", error);
      
      // Special handling for user sync errors
      if (error.message?.includes("Användaren saknas i databasen")) {
        setErrorMessage("Du behöver synkronisera användare innan du kan skapa formulär.");
      } else {
        setErrorMessage(error.message || "Ett oväntat fel uppstod");
      }
      
      toast({
        title: "Fel vid skapande av formulär",
        description: error.message || "Ett oväntat fel uppstod",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleSyncUsers = async () => {
    if (isSyncingUsers) return;
    
    setIsSyncingUsers(true);
    try {
      const result = await syncUsersWithToast();
      
      if (result.success) {
        setErrorMessage(null);
        toast({
          title: "Användare synkroniserade",
          description: "Du kan nu skapa formulär. Försök igen.",
        });
      }
    } catch (error) {
      console.error("Error syncing users:", error);
    } finally {
      setIsSyncingUsers(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage(null);
    sendLinkMutation.mutate({
      patientIdentifier: values.patientIdentifier
    });
  };
  
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Skapa anamneslänk
          </Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skapa anamneslänk</DialogTitle>
          <DialogDescription>
            Skapa en anamneslänk som kan skickas till en patient för att fylla i sin anamnes.
          </DialogDescription>
        </DialogHeader>
        
        {errorMessage && <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
            
            {needsUserSync && (
              <Button 
                onClick={handleSyncUsers}
                variant="outline" 
                size="sm"
                className="mt-2"
                disabled={isSyncingUsers}
              >
                {isSyncingUsers ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-2" />
                )}
                Synkronisera användare
              </Button>
            )}
          </Alert>}
        
        {isLoadingTemplate ? <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div> : <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="patientIdentifier" render={({
            field
          }) => <FormItem>
                    <FormLabel>Patientinformation</FormLabel>
                    <FormControl>
                      <Input placeholder="Ange personens namn eller annan identifierare" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={isLoading || !formTemplate || needsUserSync} className="flex items-center gap-2">
                  {isLoading ? <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Skapar...
                    </> : <>
                      <Link className="h-4 w-4" />
                      Skapa länk
                    </>}
                </Button>
              </div>
            </form>
          </Form>}
      </DialogContent>
    </Dialog>;
}
