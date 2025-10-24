/**
 * Hook for managing kiosk sessions
 * 
 * Provides functionality to:
 * - Create reusable kiosk sessions
 * - Fetch session details and statistics
 * - Update session settings (pause/activate)
 * - Delete sessions
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSafeOrganization } from "@/hooks/useSafeOrganization";
import { useSafeUser } from "@/hooks/useSafeUser";

interface KioskSession {
  id: string;
  organization_id: string;
  store_id: string | null;
  form_id: string;
  persistent_token: string;
  require_supervisor_code: boolean;
  is_active: boolean;
  total_submissions: number;
  last_used_at: string | null;
  created_at: string;
  created_by: string | null;
  expires_at: string | null;
}

interface CreateKioskSessionParams {
  formId: string;
  storeId?: string | null;
  requireSupervisorCode: boolean;
  expiresAt?: string | null;
}

export const useKioskSession = () => {
  const { organization } = useSafeOrganization();
  const { user } = useSafeUser();
  const [isLoading, setIsLoading] = useState(false);

  const createKioskSession = async (params: CreateKioskSessionParams): Promise<KioskSession | null> => {
    if (!organization?.id || !user?.id) {
      toast({
        title: "Fel",
        description: "Du måste vara inloggad för att skapa en kiosk-session",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);

    try {
      const persistent_token = crypto.randomUUID();

      const { data, error } = await supabase
        .from('kiosk_sessions')
        .insert({
          organization_id: organization.id,
          store_id: params.storeId,
          form_id: params.formId,
          persistent_token,
          require_supervisor_code: params.requireSupervisorCode,
          is_active: true,
          total_submissions: 0,
          created_by: user.id,
          expires_at: params.expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Kiosk-session skapad",
        description: "Din återanvändbara QR-kod är nu redo",
      });

      return data;
    } catch (error) {
      console.error('Error creating kiosk session:', error);
      toast({
        title: "Kunde inte skapa kiosk-session",
        description: error instanceof Error ? error.message : "Ett oväntat fel inträffade",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKioskSession = async (sessionId: string): Promise<KioskSession | null> => {
    try {
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching kiosk session:', error);
      return null;
    }
  };

  const updateKioskSession = async (
    sessionId: string, 
    updates: Partial<Pick<KioskSession, 'is_active' | 'require_supervisor_code' | 'expires_at'>>
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('kiosk_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Uppdaterad",
        description: "Kiosk-sessionen har uppdaterats",
      });

      return true;
    } catch (error) {
      console.error('Error updating kiosk session:', error);
      toast({
        title: "Kunde inte uppdatera",
        description: error instanceof Error ? error.message : "Ett oväntat fel inträffade",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteKioskSession = async (sessionId: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('kiosk_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Raderad",
        description: "Kiosk-sessionen har raderats",
      });

      return true;
    } catch (error) {
      console.error('Error deleting kiosk session:', error);
      toast({
        title: "Kunde inte radera",
        description: error instanceof Error ? error.message : "Ett oväntat fel inträffade",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSessionActive = async (sessionId: string, currentState: boolean): Promise<boolean> => {
    return updateKioskSession(sessionId, { is_active: !currentState });
  };

  return {
    isLoading,
    createKioskSession,
    fetchKioskSession,
    updateKioskSession,
    deleteKioskSession,
    toggleSessionActive,
  };
};
