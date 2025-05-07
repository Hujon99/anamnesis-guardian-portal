
/**
 * This component provides functionality for creating direct in-store anamnesis forms.
 * It allows opticians to generate an immediate form for walk-in customers
 * without creating a patient record first.
 * Uses the organization-specific form template.
 * Enhanced with longer token validity period (72 hours) for better user experience.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization, useUser, useAuth } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { FileEdit, Loader2, AlertCircle } from "lucide-react";
import { useFormTemplate } from "@/hooks/useFormTemplate";

export function DirectFormButton() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { sessionClaims } = useAuth();
  const { supabase, isReady: isSupabaseReady } = useSupabaseClient();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Get organization's form template with enhanced error handling
  const { 
    data: formTemplate, 
    isLoading: templateLoading, 
    error: templateError,
    isError: isTemplateError,
    refetch: refetchTemplate 
  } = useFormTemplate();
  
  // Reset error state when organization changes
  useEffect(() => {
    if (organization?.id) {
      setHasError(false);
    }
  }, [organization?.id]);
  
  // Provide feedback if there's a template error
  useEffect(() => {
    if (templateError) {
      console.error("[DirectFormButton]: Error loading form template:", templateError);
      setHasError(true);
      
      // Only show toast for non-network errors to prevent spamming
      if (!templateError.message?.includes("Failed to fetch")) {
        toast({
          title: "Fel vid laddning av formulärmall",
          description: "Kunde inte ladda organisationens formulärmall. Kontakta administratör.",
          variant: "destructive",
        });
      }
    }
  }, [templateError]);
  
  // Get the creator's name from session claims
  const creatorName = sessionClaims?.full_name as string || user?.fullName || user?.id || "Okänd";

  // Mutation for creating a direct form entry
  const createDirectFormEntry = useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error("Organisation saknas");
      }
      
      if (!formTemplate) {
        throw new Error("Ingen formulärmall hittades för denna organisation");
      }

      if (!isSupabaseReady || !supabase) {
        throw new Error("Databasanslutning ej klar");
      }

      console.log("[DirectFormButton]: Creating direct form entry with organization ID:", organization.id);
      console.log("[DirectFormButton]: Current user ID:", user?.id || null);
      console.log("[DirectFormButton]: Creator name:", creatorName);
      console.log("[DirectFormButton]: Using form template ID:", formTemplate.id);

      // Use a fixed identifier for direct in-store forms
      const patientIdentifier = "Direkt ifyllning i butik";

      // Generate a unique access token
      const accessToken = crypto.randomUUID();
      console.log("[DirectFormButton]: Generated access token:", accessToken.substring(0, 6) + "...");

      // CHANGED: Increased token validity from 24 hours to 72 hours
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours from now
      console.log("[DirectFormButton]: Token will expire at:", expiresAt);

      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          access_token: accessToken,
          status: "sent",
          expires_at: expiresAt, // Using the 72-hour expiry
          form_id: formTemplate.id,
          patient_identifier: patientIdentifier,
          created_by: user?.id || null,
          created_by_name: creatorName, // Add the creator's name
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("[DirectFormButton]: Error creating direct form entry:", error);
        throw error;
      }
      
      // Log the URL that will be used for navigation
      const baseUrl = window.location.origin;
      console.log("[DirectFormButton]: Will navigate to:", `${baseUrl}/optician-form?token=${accessToken}&mode=optician`);
      
      return data;
    },
    onSuccess: (data) => {
      console.log("[DirectFormButton]: Direct form entry created successfully:", data);
      
      // Navigate to the optician form page with the token
      navigate(`/optician-form?token=${data.access_token}&mode=optician`);
      
      toast({
        title: "Formulär skapat",
        description: "Direkt ifyllningsformulär förberett",
      });
    },
    onError: (error: any) => {
      console.error("[DirectFormButton]: Error creating direct form:", error);
      setHasError(true);
      
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
    // Don't allow multiple attempts while loading
    if (isLoading || createDirectFormEntry.isPending) {
      return;
    }
    
    // Reset error state and start loading
    setHasError(false);
    setIsLoading(true);
    
    // If template had an error, try refetching before proceeding
    if (isTemplateError) {
      refetchTemplate().then((result) => {
        if (result.data) {
          createDirectFormEntry.mutate();
        } else {
          setIsLoading(false);
          setHasError(true);
        }
      });
    } else {
      createDirectFormEntry.mutate();
    }
  };

  // Allow manual retry if there was an error
  const handleRetry = () => {
    setHasError(false);
    refetchTemplate();
  };

  // Determine if button should be disabled
  const isButtonDisabled = !isSupabaseReady || isLoading || createDirectFormEntry.isPending || templateLoading;
  
  // Show informative tooltip if button is disabled due to missing template
  const buttonTitle = !formTemplate && !templateLoading 
    ? "Ingen formulärmall finns tillgänglig för denna organisation"
    : "Skapa formulär för direkt ifyllning i butik";

  return (
    <>
      {hasError ? (
        <Button 
          onClick={handleRetry}
          variant="destructive"
          title="Försök igen"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Försök igen
        </Button>
      ) : (
        <Button 
          onClick={handleCreateDirectForm}
          disabled={isButtonDisabled}
          variant="secondary"
          title={buttonTitle}
        >
          {(isLoading || createDirectFormEntry.isPending || templateLoading) ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileEdit className="h-4 w-4 mr-2" />
          )}
          Direkt ifyllning i butik
        </Button>
      )}
    </>
  );
}
