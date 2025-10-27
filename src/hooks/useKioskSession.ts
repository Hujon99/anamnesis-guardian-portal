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
import { toast } from "@/hooks/use-toast";
import { useSafeOrganization } from "@/hooks/useSafeOrganization";
import { useSafeUser } from "@/hooks/useSafeUser";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";

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
  const { supabase, isReady, refreshClient } = useSupabaseClient();
  const [isLoading, setIsLoading] = useState(false);

  const createKioskSession = async (params: CreateKioskSessionParams): Promise<KioskSession | null> => {
    console.log('[useKioskSession] Creating session with params:', {
      formId: params.formId,
      storeId: params.storeId,
      requireSupervisorCode: params.requireSupervisorCode,
      expiresAt: params.expiresAt,
      organizationId: organization?.id,
      userId: user?.id,
      isReady
    });

    if (!isReady) {
      console.error('[useKioskSession] Supabase client not ready');
      toast({
        title: "Vänligen vänta",
        description: "Systemet förbereder anslutningen...",
        variant: "destructive",
      });
      return null;
    }

    if (!organization?.id) {
      console.error('[useKioskSession] Missing organization ID');
      toast({
        title: "Fel",
        description: "Organisation saknas. Vänligen logga in igen.",
        variant: "destructive",
      });
      return null;
    }

    if (!user?.id) {
      console.error('[useKioskSession] Missing user ID');
      toast({
        title: "Fel",
        description: "Användare saknas. Vänligen logga in igen.",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);

    try {
      const persistent_token = crypto.randomUUID();

      const insertData = {
        organization_id: organization.id,
        store_id: params.storeId || null,
        form_id: params.formId,
        persistent_token,
        require_supervisor_code: params.requireSupervisorCode || false,
        is_active: true,
        total_submissions: 0,
        created_by: user.id,
        expires_at: params.expiresAt || null,
      };

      console.log('[useKioskSession] Insert data:', insertData);

      const { data, error } = await supabase
        .from('kiosk_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[useKioskSession] Database error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('[useKioskSession] Session created successfully:', data);

      toast({
        title: "Kiosk-session skapad",
        description: "Din återanvändbara QR-kod är nu redo",
      });

      return data;
    } catch (error) {
      console.error('[useKioskSession] Caught error:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorString: String(error),
        errorMessage: error instanceof Error ? error.message : 'No message',
        errorStack: error instanceof Error ? error.stack : 'No stack'
      });
      
      let errorMessage = "Ett oväntat fel inträffade";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle JWT-related errors
        if (errorMessage.includes('JWT') || errorMessage.includes('token') || errorMessage.includes('auth')) {
          console.log('[useKioskSession] JWT error detected, refreshing client');
          refreshClient(true);
          errorMessage = "Autentiseringsfel. Vänligen försök igen.";
        }
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }
      
      toast({
        title: "Kunde inte skapa kiosk-session",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKioskSession = async (sessionId: string): Promise<KioskSession | null> => {
    if (!isReady) {
      console.error('[useKioskSession] Client not ready for fetch');
      return null;
    }

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
    if (!isReady) {
      toast({
        title: "Vänligen vänta",
        description: "Systemet förbereder anslutningen...",
        variant: "destructive",
      });
      return false;
    }

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
    if (!isReady) {
      toast({
        title: "Vänligen vänta",
        description: "Systemet förbereder anslutningen...",
        variant: "destructive",
      });
      return false;
    }

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
