
/**
 * This component provides functionality for creating direct in-store anamnesis forms.
 * It allows opticians to generate an immediate form for walk-in customers
 * without creating a patient record first.
 * Uses the organization-specific form template.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization, useUser, useAuth } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { FileEdit, Loader2 } from "lucide-react";
import { useFormTemplate } from "@/hooks/useFormTemplate";

export function DirectFormButton() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { sessionClaims } = useAuth();
  const { supabase, isReady } = useSupabaseClient();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get organization's form template
  const { data: formTemplate } = useFormTemplate();
  
  // Get the creator's name from session claims
  const creatorName = sessionClaims?.full_name as string || user?.fullName || user?.id || "Okänd";

  // Mutation for creating a direct form entry
  const createDirectFormEntry = useMutation({
    mutationFn: async () => {
      if (!isReady) {
        throw new Error("Supabase klient inte redo");
      }
      
      if (!organization?.id) {
        throw new Error("Organisation saknas");
      }
      
      if (!formTemplate) {
        throw new Error("Ingen formulärmall hittades för denna organisation");
      }

      console.log("Creating direct form entry with organization ID:", organization.id);
      console.log("Current user ID:", user?.id || null);
      console.log("Creator name:", creatorName);
      console.log("Using form template ID:", formTemplate.id);

      // Use a fixed identifier for direct in-store forms
      const patientIdentifier = "Direkt ifyllning i butik";

      // Generate a unique access token
      const accessToken = crypto.randomUUID();
      console.log("Generated access token:", accessToken.substring(0, 6) + "...");

      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          access_token: accessToken,
          status: "sent",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          form_id: formTemplate.id,
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
      
      // Log the URL that will be used for navigation
      const baseUrl = window.location.origin;
      const targetUrl = `${baseUrl}/optician-form?token=${accessToken}&mode=optician`;
      console.log("Will navigate to:", targetUrl);
      
      return { data, targetUrl, accessToken };
    },
    onSuccess: ({ data, targetUrl, accessToken }) => {
      console.log("Direct form entry created successfully:", data);
      
      // Navigate to the optician form page with the token
      navigate(`/optician-form?token=${accessToken}&mode=optician`);
      
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
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleCreateDirectForm = () => {
    setIsLoading(true);
    createDirectFormEntry.mutate();
  };

  const isDisabled = isLoading || createDirectFormEntry.isPending || !formTemplate || !isReady;

  return (
    <Button 
      onClick={handleCreateDirectForm}
      disabled={isDisabled}
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
