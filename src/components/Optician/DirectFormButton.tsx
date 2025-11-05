/**
 * This component provides a button for opticians to create direct in-store anamnesis forms,
 * generating a form for walk-in customers without requiring prior patient record creation.
 * It allows opticians to select from available examination types and auto-assigns the creating optician.
 * 
 * UPDATED: Now automatically includes the activeStore.id when creating new entries.
 */

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Users, Loader2 } from "lucide-react";
import { useFormsByStore } from "@/hooks/useFormsByStore";
import { EXAMINATION_TYPE_OPTIONS } from "@/types/examinationType";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useNavigate } from "react-router-dom";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useSafeUser as useUser } from "@/hooks/useSafeUser";
import { toast } from "@/hooks/use-toast";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExaminationTypeSelector } from "./ExaminationTypeSelector";
import { GdprInformationDialog } from "./GdprInformationDialog";
import { CustomerNameDialog } from "./CustomerNameDialog";
import { IdVerificationDialog } from "./IdVerificationDialog";
import FormAttemptDialog from "./FormAttemptDialog";
import { DIRECT_FORM_TOKEN_KEY, DIRECT_FORM_MODE_KEY } from "@/utils/opticianFormTokenUtils";
import { useActiveStore } from "@/contexts/ActiveStoreContext";

// Define OrganizationForm interface locally since we're using useFormsByStore
export interface OrganizationForm {
  id: string;
  title: string;
  examination_type?: string;
  organization_id: string | null;
}

export const DirectFormButton: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showGdprDialog, setShowGdprDialog] = useState(false);
  const [showAttemptDialog, setShowAttemptDialog] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showIdVerificationDialog, setShowIdVerificationDialog] = useState(false);
  const [selectedForm, setSelectedForm] = useState<OrganizationForm | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [gdprData, setGdprData] = useState<{ infoType: 'full' | 'short'; notes?: string } | null>(null);
  const [attemptData, setAttemptData] = useState<{ attempted: boolean; description?: string } | null>(null);
  
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { user } = useUser();
  const { supabase, isReady } = useSupabaseClient();
  const queryClient = useQueryClient();
  const { activeStore } = useActiveStore(); // Get active store for automatic assignment
  
  // Get available forms for the active store
  const { 
    data: storeForms, 
    isLoading: formsLoading, 
    error: formsError 
  } = useFormsByStore(activeStore?.id);
  
  // Convert to OrganizationForm format
  const forms: OrganizationForm[] = useMemo(() => {
    if (!storeForms) return [];
    return storeForms.map(form => ({
      id: form.id,
      title: form.title,
      examination_type: form.examination_type,
      organization_id: form.organization_id,
    }));
  }, [storeForms]);
  
  // User sync functionality
  const { syncUsers, isSyncing } = useSyncClerkUsers();

  // Create form entry mutation - now includes GDPR logging
  const createDirectFormEntry = useMutation({
    mutationFn: async ({ 
      form, 
      name, 
      idType, 
      personalNumber,
      gdprInfo
    }: { 
      form: OrganizationForm, 
      name: string,
      idType: string,
      personalNumber: string,
      gdprInfo: { infoType: 'full' | 'short'; notes?: string }
    }) => {
      if (!organization?.id || !user?.id || !form) {
        throw new Error("Saknar nödvändig information för att skapa formulär");
      }

      // Generate unique access token (valid for 72 hours)
      const accessToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

      // Create patient identifier from name
      const patientIdentifier = `${name} (Direkt ifyllning i butik)`;

      // Create entry in anamnes_entries with ID verification data and store assignment
          const { data, error } = await supabase
            .from("anamnes_entries")
            .insert({
              organization_id: organization.id,
              form_id: form.id,
              access_token: accessToken,
              status: "sent", // Set as sent - will become ready when form is actually submitted
              is_magic_link: false,
              created_by: user.id,
              created_by_name: user.fullName || user.firstName || "Okänd optiker",
              patient_identifier: patientIdentifier,
              first_name: name,
              expires_at: expiresAt.toISOString(),
              booking_date: new Date().toISOString(), // Automatically set today's date
              // Set initial answers as empty object
              answers: {},
              // ID verification data
              id_verification_completed: true,
              id_type: idType as any,
              personal_number: personalNumber,
              verified_by: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.fullName || 'Unknown',
              verified_at: new Date().toISOString(),
              // AUTOMATIC STORE ASSIGNMENT from ActiveStoreContext
              store_id: activeStore?.id || null,
            })
        .select("*")
        .single();

      if (error) {
        console.error("Error creating entry:", error);
        throw new Error(`Kunde inte skapa formulär: ${error.message}`);
      }
      
      // Update entry with GDPR confirmation data
      const { error: gdprError } = await supabase
        .from("anamnes_entries")
        .update({
          gdpr_method: 'store_verbal',
          gdpr_confirmed_by: user.id,
          gdpr_confirmed_by_name: user.fullName || user.firstName || "Okänd optiker",
          gdpr_info_type: gdprInfo.infoType,
          gdpr_notes: gdprInfo.notes || null,
          consent_given: true,
          consent_timestamp: new Date().toISOString()
        })
        .eq('id', data.id);

      if (gdprError) {
        console.error("Error updating GDPR confirmation:", gdprError);
        // Don't fail the entire operation for this
      }

      return { entry: data, token: accessToken, entryId: data.id };
    },
    onSuccess: async ({ entry, token, entryId }) => {
      // Save attempt report if customer attempted online
      if (attemptData && supabase && organization?.id && user?.id) {
        try {
          const { error: reportError } = await supabase
            .from('form_attempt_reports')
            .insert({
              organization_id: organization.id,
              store_id: entry.store_id,
              entry_id: entryId,
              customer_attempted_online: attemptData.attempted,
              failure_description: attemptData.description || null,
              reported_by: user.id,
              reported_by_name: user.fullName || user.firstName || "Okänd optiker"
            });
          
          if (reportError) {
            console.error("Error saving attempt report:", reportError);
            toast({
              title: "Varning",
              description: "Formuläret skapades men felrapporten kunde inte sparas.",
              variant: "destructive",
            });
          } else {
            console.log("Form attempt report saved successfully:", {
              entryId,
              attempted: attemptData.attempted,
              hasDescription: !!attemptData.description
            });
            
            // Invalidate completion metrics query to show updated statistics
            queryClient.invalidateQueries({ queryKey: ['form-completion-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['failure-reasons'] });
          }
        } catch (error) {
          console.error("Error saving attempt report:", error);
          toast({
            title: "Varning",
            description: "Formuläret skapades men felrapporten kunde inte sparas.",
            variant: "destructive",
          });
        }
      }
      
      // Store token and mode in localStorage for form access
      localStorage.setItem(DIRECT_FORM_TOKEN_KEY, token);
      localStorage.setItem(DIRECT_FORM_MODE_KEY, "optician");
      
      // Navigate to optician form
      navigate("/optician-form");
      
      toast({
        title: "Formulär skapat!",
        description: "Du dirigeras nu till det nya formuläret",
      });
      
      // Reset all dialog states
      setShowTypeSelector(false);
      setShowGdprDialog(false);
      setShowAttemptDialog(false);
      setShowNameDialog(false);
      setShowIdVerificationDialog(false);
      setSelectedForm(null);
      setCustomerName("");
      setGdprData(null);
      setAttemptData(null);
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
    
    // If only one form, select it and show GDPR dialog
    if (forms.length === 1) {
      setSelectedForm(forms[0]);
      setShowGdprDialog(true); // Show GDPR dialog instead of name dialog
    } else {
      // Show type selector for multiple forms
      setShowTypeSelector(true);
    }
  };

  const handleFormTypeSelect = (form: OrganizationForm) => {
    setSelectedForm(form);
    setShowTypeSelector(false);
    setShowGdprDialog(true); // Show GDPR dialog instead of name dialog
  };

  const handleGdprConfirm = (data: { infoType: 'full' | 'short'; notes?: string }) => {
    setGdprData(data);
    setShowGdprDialog(false);
    setShowAttemptDialog(true); // Show attempt dialog next
  };

  const handleAttemptConfirm = (data: { attempted: boolean; description?: string }) => {
    setAttemptData(data);
    setShowAttemptDialog(false);
    setShowNameDialog(true);
  };

  const handleNameConfirm = (name: string) => {
    if (!selectedForm) return;
    
    setCustomerName(name);
    setShowNameDialog(false);
    setShowIdVerificationDialog(true);
  };

  const handleIdVerificationConfirm = async (idData: { idType: string; personalNumber: string }) => {
    if (!selectedForm) return;
    
    // Check if this is deferred ID verification
    if (idData.idType === 'deferred') {
      // Create entry with pending_id_verification status
      setIsCreating(true);
      
      if (!organization?.id || !user?.id || !selectedForm) {
        return;
      }

      try {
        const accessToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
        const patientIdentifier = `${customerName} (Direkt ifyllning i butik)`;

        const { data, error } = await supabase
          .from("anamnes_entries")
          .insert({
            organization_id: organization.id,
            form_id: selectedForm.id,
            access_token: accessToken,
            status: "sent", // Set as sent - will become ready when form is actually submitted
            is_magic_link: false,
            created_by: user.id,
            created_by_name: user.fullName || user.firstName || "Okänd optiker",
            patient_identifier: patientIdentifier,
            first_name: customerName,
            expires_at: expiresAt.toISOString(),
            booking_date: new Date().toISOString(),
            answers: {},
            id_verification_completed: false,
            // AUTOMATIC STORE ASSIGNMENT from ActiveStoreContext
            store_id: activeStore?.id || null,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        // Update entry with GDPR confirmation for deferred ID verification cases too
        if (gdprData) {
          const { error: gdprError } = await supabase
            .from("anamnes_entries")
            .update({
              gdpr_method: 'store_verbal',
              gdpr_confirmed_by: user.id,
              gdpr_confirmed_by_name: user.fullName || user.firstName || "Okänd optiker",
              gdpr_info_type: gdprData.infoType,
              gdpr_notes: gdprData.notes || null,
              consent_given: true,
              consent_timestamp: new Date().toISOString()
            })
            .eq('id', data.id);

          if (gdprError) {
            console.error("Error updating GDPR confirmation:", gdprError);
          }
        }

        // Save attempt report if customer attempted online (deferred ID verification case)
        if (attemptData && organization?.id && user?.id) {
          try {
            const { error: reportError } = await supabase
              .from('form_attempt_reports')
              .insert({
                organization_id: organization.id,
                store_id: data.store_id,
                entry_id: data.id,
                customer_attempted_online: attemptData.attempted,
                failure_description: attemptData.description || null,
                reported_by: user.id,
                reported_by_name: user.fullName || user.firstName || "Okänd optiker"
              });
            
            if (reportError) {
              console.error("Error saving attempt report:", reportError);
            } else {
              console.log("Form attempt report saved successfully (deferred ID)");
              
              // Invalidate completion metrics query
              queryClient.invalidateQueries({ queryKey: ['form-completion-metrics'] });
              queryClient.invalidateQueries({ queryKey: ['failure-reasons'] });
            }
          } catch (error) {
            console.error("Error saving attempt report:", error);
          }
        }
        
        localStorage.setItem(DIRECT_FORM_TOKEN_KEY, accessToken);
        localStorage.setItem(DIRECT_FORM_MODE_KEY, "optician");
        navigate("/optician-form");
        
        toast({
          title: "Formulär skapat!",
          description: "Kunden kan legitimera sig senare. Formuläret är redo att fyllas i.",
        });
        
        setShowTypeSelector(false);
        setShowGdprDialog(false);
        setShowAttemptDialog(false);
        setShowNameDialog(false);
        setShowIdVerificationDialog(false);
        setSelectedForm(null);
        setCustomerName("");
        setGdprData(null);
        setAttemptData(null);
        setIsCreating(false);
      } catch (error: any) {
        console.error("Failed to create form:", error);
        setError(error.message);
        setIsCreating(false);
        toast({
          title: "Kunde inte skapa formulär",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Normal ID verification flow
      setIsCreating(true);
      createDirectFormEntry.mutate({ 
        form: selectedForm, 
        name: customerName,
        idType: idData.idType,
        personalNumber: idData.personalNumber,
        gdprInfo: gdprData!
      });
    }
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
        data-tour="direct-form"
        onClick={handleCreateDirectForm}
        disabled={isCreating || createDirectFormEntry.isPending}
        className="shrink-0"
        size="sm"
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
        forms={forms}
        isLoading={formsLoading}
      />
      
      <GdprInformationDialog
        open={showGdprDialog}
        onOpenChange={setShowGdprDialog}
        onConfirm={handleGdprConfirm}
        isProcessing={isCreating}
        examinationType={selectedForm?.title || ""}
      />
      
      <FormAttemptDialog
        open={showAttemptDialog}
        onOpenChange={setShowAttemptDialog}
        onConfirm={handleAttemptConfirm}
      />
      
      <CustomerNameDialog
        open={showNameDialog}
        onOpenChange={setShowNameDialog}
        onConfirm={handleNameConfirm}
        isCreating={false}
        examinationType={selectedForm?.title || ""}
      />
      
      <IdVerificationDialog
        open={showIdVerificationDialog}
        onOpenChange={setShowIdVerificationDialog}
        onConfirm={handleIdVerificationConfirm}
        isVerifying={isCreating}
        customerName={customerName}
      />
    </>
  );
};