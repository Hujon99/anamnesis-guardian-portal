/**
 * CISSEntryPage.tsx
 * 
 * Purpose: Entry point for CISS form access via QR code scan
 * 
 * Flow:
 * 1. Patient scans QR code → lands on /ciss/:organizationId
 * 2. This page calls generate-ciss-token edge function
 * 3. Edge function creates unique token + anamnes_entries record
 * 4. Page redirects to /patient-form?token=...
 * 
 * This ensures each scan creates a unique, secure session.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function CISSEntryPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setError("Ingen organisations-ID angavs");
      setIsGenerating(false);
      return;
    }

    generateTokenAndRedirect();
  }, [organizationId]);

  const generateTokenAndRedirect = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      console.log(`[CISS Entry] Generating token for organization: ${organizationId}`);

      // Call edge function to generate token
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-ciss-token',
        {
          body: { organizationId },
        }
      );

      if (functionError) {
        console.error('[CISS Entry] Function error:', functionError);
        throw new Error(functionError.message || 'Kunde inte generera token');
      }

      if (!data?.token) {
        throw new Error('Ingen token returnerades');
      }

      console.log(`[CISS Entry] Token generated successfully, redirecting...`);

      // Redirect to patient form with token
      navigate(`/patient-form?token=${data.token}`, { replace: true });

    } catch (err) {
      console.error('[CISS Entry] Error:', err);
      setError(err instanceof Error ? err.message : 'Ett oväntat fel uppstod');
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    generateTokenAndRedirect();
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-light to-white p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Förbereder formulär...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Skapar en säker session för ditt CISS-formulär
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-light to-white p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Ett fel uppstod</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={handleRetry} className="flex-1">
                Försök igen
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Till startsidan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
