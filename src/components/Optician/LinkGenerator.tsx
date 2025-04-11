
/**
 * This component provides functionality for generating and sending personalized
 * anamnesis links to patients. It handles the collection of patient information,
 * form creation, and notification to users about the process status.
 */

import React, { useState } from "react";
import { useOrganization, useUser, useAuth } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Link, Loader2, Plus } from "lucide-react";

// Form schema with validation for patient info
const formSchema = z.object({
  patientIdentifier: z.string().min(2, { message: "Patientinformation måste vara minst 2 tecken" }),
});

export function LinkGenerator() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { sessionClaims } = useAuth();
  const { supabase } = useSupabaseClient();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get the creator's name from session claims
  const creatorName = sessionClaims?.full_name as string || user?.fullName || user?.id || "Okänd";

  // Create form with validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientIdentifier: "",
    },
  });

  // Mutation for creating and sending a link
  const sendLinkMutation = useMutation({
    mutationFn: async ({ patientIdentifier }: { patientIdentifier: string }) => {
      if (!organization?.id) {
        throw new Error("Organisation saknas");
      }

      console.log("Creating anamnesis entry with patient identifier:", patientIdentifier);
      console.log("Organization ID:", organization.id);
      console.log("Creator:", creatorName);

      // Create a new anamnesis entry
      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          access_token: crypto.randomUUID(),
          status: "sent",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          form_id: crypto.randomUUID(),
          patient_identifier: patientIdentifier,
          created_by: user?.id || null,
          created_by_name: creatorName,
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating anamnesis entry:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log("Anamnesis entry created successfully:", data);
      
      toast({
        title: "Formulär skapat",
        description: "Formuläret har skapats och kan nu skickas till patienten",
      });
      
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      console.error("Error creating anamnesis entry:", error);
      
      toast({
        title: "Fel vid skapande av formulär",
        description: error.message || "Ett oväntat fel uppstod",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    sendLinkMutation.mutate({ patientIdentifier: values.patientIdentifier });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Skapa</span> anamneslänk
        </Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skapa anamneslänk</DialogTitle>
          <DialogDescription>
            Skapa en anamneslänk som kan skickas till en patient för att fylla i sin anamnes.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="patientIdentifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patientinformation</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ange personens namn eller annan identifierare" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Skapar...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4" />
                    Skapa länk
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
