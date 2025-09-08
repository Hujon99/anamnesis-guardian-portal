/**
 * Consent Page Component
 * This page displays the legal consent step before users can access the examination selection.
 * It ensures users accept legal terms before entering any personal information or selecting examination types.
 * The page validates organization existence and stores consent in sessionStorage for the session.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LegalConsentStep } from '@/components/Legal/LegalConsentStep';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConsentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  const orgId = searchParams.get("org_id");

  useEffect(() => {
    // Check if consent already given for this session
    const sessionConsent = sessionStorage.getItem(`consent_given_${orgId}`);
    if (sessionConsent === 'true') {
      // Redirect directly to examination selection
      const currentParams = searchParams.toString();
      navigate(`/examination-type?${currentParams}`);
      return;
    }

    const validateOrganization = async () => {
      if (!orgId) {
        setError("Organisation ID saknas i länken");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch organization to validate it exists and get name
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', orgId)
          .maybeSingle();

        if (orgError) {
          console.error("Error fetching organization:", orgError);
          setError("Ett fel uppstod vid validering av organisationen");
          setIsLoading(false);
          return;
        }

        if (!org) {
          setError("Den angivna organisationen finns inte");
          setIsLoading(false);
          return;
        }

        setOrganizationName(org.name);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error:", err);
        setError("Ett oväntat fel uppstod");
        setIsLoading(false);
      }
    };

    validateOrganization();
  }, [orgId, searchParams, navigate]);

  const handleConsentContinue = () => {
    if (!consentGiven) return;

    // Store consent in sessionStorage for this organization
    sessionStorage.setItem(`consent_given_${orgId}`, 'true');
    sessionStorage.setItem(`consent_timestamp_${orgId}`, new Date().toISOString());

    // Navigate to examination type selection with all current params
    const currentParams = searchParams.toString();
    navigate(`/examination-type?${currentParams}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-light">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Validerar organisation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-light">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-lg font-medium text-destructive">Ett fel uppstod</p>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="w-full"
            >
              Försök igen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <LegalConsentStep
      consentGiven={consentGiven}
      onConsentChange={setConsentGiven}
      onContinue={handleConsentContinue}
      organizationName={organizationName}
    />
  );
};

export default ConsentPage;