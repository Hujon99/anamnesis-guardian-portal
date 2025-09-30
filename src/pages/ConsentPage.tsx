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
  const formId = searchParams.get("form_id");

  useEffect(() => {
    // Check if consent already given for this session (use orgId or formId as key)
    const consentKey = orgId || formId;
    const sessionConsent = sessionStorage.getItem(`consent_given_${consentKey}`);
    if (sessionConsent === 'true') {
      // Redirect directly to customer info
      const currentParams = searchParams.toString();
      navigate(`/customer-info?${currentParams}`);
      return;
    }

    const validateOrganization = async () => {
      // Handle form_id based flow
      if (formId && !orgId) {
        try {
          const { data: form, error: formError } = await supabase
            .from('anamnes_forms')
            .select('id, organization_id, title')
            .eq('id', formId)
            .maybeSingle();

          if (formError) {
            console.error("Error fetching form:", formError);
            setError("Ett fel uppstod vid validering av formuläret");
            setIsLoading(false);
            return;
          }

          if (!form) {
            setError("Det angivna formuläret finns inte");
            setIsLoading(false);
            return;
          }

          // Fetch organization name
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', form.organization_id)
            .maybeSingle();

          setOrganizationName(org?.name || 'Organisationen');
          setIsLoading(false);
          return;
        } catch (err: any) {
          console.error("Error:", err);
          setError("Ett oväntat fel uppstod");
          setIsLoading(false);
          return;
        }
      }

      // Handle org_id based flow
      if (!orgId && !formId) {
        setError("Organisation ID eller formulär ID saknas i länken");
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

    // Store consent in sessionStorage for this organization or form
    const consentKey = orgId || formId;
    sessionStorage.setItem(`consent_given_${consentKey}`, 'true');
    sessionStorage.setItem(`consent_timestamp_${consentKey}`, new Date().toISOString());

    // Navigate to customer info with all current params
    const currentParams = searchParams.toString();
    navigate(`/customer-info?${currentParams}`);
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