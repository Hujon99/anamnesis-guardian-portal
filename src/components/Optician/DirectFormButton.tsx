
/**
 * This component provides functionality for creating direct in-store anamnesis forms.
 * It allows opticians to generate an immediate form for walk-in customers
 * without creating a patient record first.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization, useUser, useAuth } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { FileEdit, Loader2 } from "lucide-react";

export function DirectFormButton() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { sessionClaims } = useAuth();
  const { supabase } = useSupabaseClient();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the creator's name from session claims
  const creatorName = sessionClaims?.full_name as string || user?.fullName || user?.id || "Okänd";

  // Mutation for creating a direct form entry
  const createDirectFormEntry = useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error("Organisation saknas");
      }

      console.log("Creating direct form entry with organization ID:", organization.id);
      console.log("Current user ID:", user?.id || null);
      console.log("Creator name:", creatorName);

      // Use a fixed identifier for direct in-store forms
      const patientIdentifier = "Direkt ifyllning i butik";

      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          access_token: crypto.randomUUID(),
          status: "sent",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          form_id: crypto.randomUUID(),
          patient_identifier: patientIdentifier,
          created_by: user?.id || null,
          created_by_name: creatorName, // Add the creator's name
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating direct form entry:", error);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      console.log("Direct form entry created successfully:", data);
      
      // Navigate to the optician form page with the token
      navigate(`/optician-form?token=${data.access_token}&mode=optician`);
      
      toast({
        title: "Formulär skapat",
        description: "Direkt ifyllningsformulär förberett",
      });
    },
    onError: (error: any) => {
      console.error("Error creating direct form:", error);
      
      toast({
        title: "Fel vid skapande av formulär",
        description: error.message || "Ett oväntat fel uppstod",
        variant: "destructive",
      });
    }
  });

  const handleCreateDirectForm = () => {
    setIsLoading(true);
    createDirectFormEntry.mutate();
  };

  return (
    <Button 
      onClick={handleCreateDirectForm}
      disabled={isLoading || createDirectFormEntry.isPending}
      variant="secondary"
    >
      {(isLoading || createDirectFormEntry.isPending) ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileEdit className="h-4 w-4 mr-2" />
      )}
      Direkt ifyllning i butik
    </Button>
  );
}
