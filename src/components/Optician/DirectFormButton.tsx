
/**
 * This component provides a button for opticians to directly fill out a form
 * without generating a patient link. It creates a new entry in the database
 * and navigates to the form page with the appropriate token.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FilePenLine, Loader2 } from "lucide-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { toast } from "sonner";
import { useOrganization } from "@clerk/clerk-react";

export const DirectFormButton = () => {
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Create a new entry and navigate to the form
  const handleCreateDirectForm = async () => {
    try {
      setIsLoading(true);
      
      // First, fetch the form template ID
      const { data: formTemplate, error: formError } = await supabase
        .from('anamnes_forms')
        .select('id')
        .or(`organization_id.eq.${organization?.id},organization_id.is.null`)
        .order('organization_id', { ascending: false })
        .limit(1)
        .single();
        
      if (formError || !formTemplate) {
        throw new Error("Could not find form template: " + formError?.message);
      }
      
      // Generate a random token
      const token = crypto.randomUUID();
      
      // Create the entry
      const { data: entry, error } = await supabase
        .from('anamnes_entries')
        .insert({
          organization_id: organization?.id,
          form_id: formTemplate.id,
          access_token: token,
          status: 'sent',
          patient_identifier: 'Direkt ifyllning i butik',
          sent_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Navigate to the form page
      navigate(`/optician-form?token=${token}&mode=optician`);
      
      toast.success("Formulär skapat för direkt ifyllning");
    } catch (err) {
      console.error("Error creating direct form:", err);
      toast.error("Kunde inte skapa formulär: " + (err instanceof Error ? err.message : "Okänt fel"));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleCreateDirectForm} 
      disabled={isLoading}
      className="whitespace-nowrap"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FilePenLine className="h-4 w-4 mr-2" />
      )}
      Fyll i direkt
    </Button>
  );
};
