/**
 * Kiosk Welcome Page - Landing page for reusable kiosk mode.
 * 
 * This page is accessed via QR code with a persistent session token.
 * Displays a simple "Start Form" button that creates a new entry on-demand.
 * After form submission, patients are redirected back to this page for the next patient.
 * 
 * URL: /kiosk?session=PERSISTENT_TOKEN
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const KioskWelcomePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionToken = searchParams.get("session");
  
  const [isCreating, setIsCreating] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  // Validate session on mount
  useEffect(() => {
    if (!sessionToken) {
      toast({
        title: "Ogiltig länk",
        description: "Ingen kiosk-session hittades i länken",
        variant: "destructive",
      });
      setSessionValid(false);
      return;
    }

    // Store session token in localStorage for later redirect after submission
    localStorage.setItem('kiosk_session_token', sessionToken);

    // Basic validation - check if session exists
    const validateSession = async () => {
      const { data, error } = await supabase
        .from('kiosk_sessions')
        .select('id, is_active, expires_at')
        .eq('persistent_token', sessionToken)
        .single();

      if (error || !data) {
        console.error('Session validation error:', error);
        setSessionValid(false);
        toast({
          title: "Ogiltig session",
          description: "Kunde inte hitta kiosk-sessionen",
          variant: "destructive",
        });
        return;
      }

      if (!data.is_active) {
        setSessionValid(false);
        toast({
          title: "Session pausad",
          description: "Denna kiosk-session är för närvarande pausad",
          variant: "destructive",
        });
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setSessionValid(false);
        toast({
          title: "Session utgången",
          description: "Denna kiosk-session har gått ut",
          variant: "destructive",
        });
        return;
      }

      setSessionValid(true);
    };

    validateSession();
  }, [sessionToken]);

  const handleStartForm = async () => {
    if (!sessionToken) return;

    setIsCreating(true);

    try {
      console.log('Creating new kiosk entry for session:', sessionToken.substring(0, 8) + '...');

      // Call edge function to create new entry
      const { data, error } = await supabase.functions.invoke('create-kiosk-entry', {
        body: { persistent_token: sessionToken }
      });

      if (error) {
        console.error('Error creating kiosk entry:', error);
        throw new Error(error.message || 'Kunde inte skapa formulär');
      }

      if (!data?.access_token) {
        throw new Error('Ingen åtkomsttoken mottagen');
      }

      console.log('Entry created successfully, redirecting to form...');

      // Redirect to kiosk form with the temporary access token
      const codeParam = data.require_supervisor_code ? "&code=required" : "";
      navigate(`/kiosk-form?token=${data.access_token}${codeParam}`);

    } catch (error) {
      console.error('Failed to start form:', error);
      toast({
        title: "Kunde inte starta formulär",
        description: error instanceof Error ? error.message : "Ett oväntat fel inträffade",
        variant: "destructive",
      });
      setIsCreating(false);
    }
  };

  if (sessionValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-light to-background p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ClipboardList className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold mb-2">Ogiltig Session</h1>
            <p className="text-muted-foreground">
              Denna kiosk-session är inte längre giltig. Kontakta personalen för hjälp.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (sessionValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-light to-background p-4">
      <Card className="max-w-2xl w-full p-12 text-center space-y-8 shadow-elegant">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
          <ClipboardList className="h-12 w-12 text-white" />
        </div>

        {/* Welcome Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Välkommen!
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Tryck på knappen nedan för att påbörja ditt formulär
          </p>
        </div>

        {/* Start Button */}
        <Button
          size="lg"
          onClick={handleStartForm}
          disabled={isCreating}
          className="h-16 px-12 text-xl font-semibold w-full max-w-sm mx-auto transition-all hover:scale-105"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-3 h-6 w-6 animate-spin" />
              Förbereder...
            </>
          ) : (
            "STARTA FORMULÄR"
          )}
        </Button>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground pt-4">
          Har du frågor? Kontakta personalen vid receptionen
        </p>
      </Card>
    </div>
  );
};

export default KioskWelcomePage;
