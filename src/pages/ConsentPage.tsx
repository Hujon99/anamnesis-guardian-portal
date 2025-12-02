/**
 * Consent Page Component
 * This page displays the legal consent step before users can access the examination selection.
 * It ensures users accept legal terms before entering any personal information or selecting examination types.
 * The page validates organization existence and stores consent in sessionStorage for the session.
 * 
 * Includes journey tracking to monitor user drop-off before reaching the actual form.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LegalConsentStep } from '@/components/Legal/LegalConsentStep';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkConsent, addConsentParams, preserveCustomerParams } from '@/utils/consentUtils';
import { useJourneyTracking, preserveJourneyId } from '@/hooks/useJourneyTracking';

const ConsentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  const orgId = searchParams.get("org_id");
  const formId = searchParams.get("form_id");

  // Initialize journey tracking
  const { logConsentGiven, logError } = useJourneyTracking({
    pageType: 'consent',
    organizationId: orgId,
    formId: formId
  });

  useEffect(() => {
    // Check if consent already given using URL params first, then sessionStorage
    const consentResult = checkConsent(searchParams);
    if (consentResult.isValid) {
      // Redirect directly to customer info with consent params preserved
      const redirectParams = new URLSearchParams();
      preserveCustomerParams(searchParams, redirectParams);
      navigate(`/customer-info?${redirectParams.toString()}`);
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

    // Log consent given for journey tracking
    logConsentGiven();

    // Store consent in sessionStorage as backup
    const consentKey = orgId || formId;
    sessionStorage.setItem(`consent_given_${consentKey}`, 'true');
    sessionStorage.setItem(`consent_timestamp_${consentKey}`, new Date().toISOString());

    // Navigate to customer info with consent params in URL (mobile-safe)
    const redirectParams = new URLSearchParams();
    preserveCustomerParams(searchParams, redirectParams);
    preserveJourneyId(searchParams, redirectParams);
    addConsentParams(redirectParams);
    navigate(`/customer-info?${redirectParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-primary">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-primary">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
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