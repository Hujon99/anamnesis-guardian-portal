/**
 * This component provides a button for opticians to create direct in-store anamnesis forms,
 * generating a form for walk-in customers without requiring prior patient record creation.
 * It allows opticians to select from available examination types and auto-assigns the creating optician.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Users, Loader2 } from "lucide-react";
import { useOrganizationForms, OrganizationForm } from "@/hooks/useOrganizationForms";
import { useMutation } from "@tanstack/react-query";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useNavigate } from "react-router-dom";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExaminationTypeSelector } from "./ExaminationTypeSelector";
import { DIRECT_FORM_TOKEN_KEY, DIRECT_FORM_MODE_KEY } from "@/utils/opticianFormTokenUtils";

export const DirectFormButton: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { user } = useUser();
  const { supabase, isReady } = useSupabaseClient();
  
  // Get available forms for the organization
  const { 
    data: forms, 
    isLoading: formsLoading, 
    error: formsError 
  } = useOrganizationForms();
  
  // User sync functionality
  const { syncUsers, isSyncing } = useSyncClerkUsers();

  // Create form entry mutation
  const createDirectFormEntry = useMutation({
    mutationFn: async (selectedForm: OrganizationForm) => {
      if (!organization?.id || !user?.id || !selectedForm) {
        throw new Error("Saknar nödvändig information för att skapa formulär");
      }

      // Generate unique access token (valid for 72 hours)
      const accessToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

      console.log("Creating direct form entry with:", {
        organizationId: organization.id,
        formId: selectedForm.id,
        userId: user.id,
        expiresAt
      });

      // Create entry in anamnes_entries
      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          form_id: selectedForm.id,
          access_token: accessToken,
          status: "sent",
          is_magic_link: false,
          created_by: user.id,
          created_by_name: user.fullName || user.firstName || "Okänd optiker",
          patient_identifier: "Direkt ifyllning i butik",
          expires_at: expiresAt.toISOString(),
          booking_date: new Date().toISOString(), // Automatically set today's date
          // Set initial answers as empty object
          answers: {},
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error creating entry:", error);
        throw new Error(`Kunde inte skapa formulär: ${error.message}`);
      }

      console.log("Successfully created entry:", data);
      return { entry: data, token: accessToken };
    },
    onSuccess: ({ entry, token }) => {
      // Store token and mode in localStorage for form access
      localStorage.setItem(DIRECT_FORM_TOKEN_KEY, token);
      localStorage.setItem(DIRECT_FORM_MODE_KEY, "optician");
      
      // Navigate to optician form
      navigate("/optician-form");
      
      toast({
        title: "Formulär skapat!",
        description: "Du dirigeras nu till det nya formuläret",
      });
      
      setShowTypeSelector(false);
      setIsCreating(false);
    },
    onError: (error: Error) => {
      console.error("Failed to create form:", error);
      setError(error.message);
      setIsCreating(false);
      toast({
        title: "Kunde inte skapa formulär",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSyncUsers = async () => {
    if (isSyncing) return;
    
    try {
      await syncUsers();
      toast({
        title: "Användare synkroniserade",
        description: "Du kan nu skapa formulär.",
      });
    } catch (error) {
      console.error("Error syncing users:", error);
      toast({
        title: "Synkronisering misslyckades",
        description: "Försök igen senare.",
        variant: "destructive",
      });
    }
  };

  const handleCreateDirectForm = () => {
    setError(null);
    
    if (!forms || forms.length === 0) {
      setError("Inga formulär tillgängliga");
      return;
    }
    
    // If only one form, create it directly
    if (forms.length === 1) {
      setIsCreating(true);
      createDirectFormEntry.mutate(forms[0]);
    } else {
      // Show type selector for multiple forms
      setShowTypeSelector(true);
    }
  };

  const handleFormTypeSelect = (selectedForm: OrganizationForm) => {
    setIsCreating(true);
    createDirectFormEntry.mutate(selectedForm);
  };

  // User sync check - remove this section since needsSync doesn't exist
  // Loading state
  if (formsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Laddar formulär...
        </div>
      </div>
    );
  }

  // Error state
  if (formsError || !forms || forms.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Kunde inte ladda formulär. Kontrollera att det finns formulär för din organisation.
        </AlertDescription>
      </Alert>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          onClick={() => setError(null)}
          variant="outline"
          size="sm"
        >
          Försök igen
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
          onClick={handleCreateDirectForm}
          disabled={isCreating || createDirectFormEntry.isPending}
          className="w-full"
          size="lg"
        >
          {isCreating || createDirectFormEntry.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Skapar formulär...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Skapa formulär för direkt ifyllning
            </>
          )}
        </Button>
        
      <ExaminationTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={handleFormTypeSelect}
        isCreating={isCreating}
      />
    </>
  );
};