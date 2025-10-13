/**
 * Legal Consent Step Component
 * Renders the consent step that appears before the main form content.
 * Ensures users accept legal terms before proceeding with the form.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConsentCheckbox } from './ConsentCheckbox';
import { Shield, FileText } from 'lucide-react';

interface LegalConsentStepProps {
  consentGiven: boolean;
  onConsentChange: (consent: boolean) => void;
  onContinue: () => void;
  organizationName?: string;
}

export const LegalConsentStep: React.FC<LegalConsentStepProps> = ({
  consentGiven,
  onConsentChange,
  onContinue,
  organizationName = 'din optiker'
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-primary">
      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground mb-2">
            Välkommen till Anamnesportalen
          </CardTitle>
          <p className="text-muted-foreground leading-relaxed">
            Innan du börjar fylla i dina uppgifter behöver vi ditt samtycke för att 
            hantera dina personuppgifter säkert och lagligt.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-surface-light p-4 rounded-lg border">
            <div className="flex items-start space-x-3 mb-3">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground mb-1">
                  Vad händer med mina uppgifter?
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Dina uppgifter delas säkert med {organizationName}</li>
                  <li>• All data krypteras och lagras tillfälligt (max 48 timmar)</li>
                  <li>• {organizationName} är ansvarig för dina personuppgifter</li>
                  <li>• Uppgifterna används endast för din synundersökning</li>
                </ul>
              </div>
            </div>
          </div>

          <ConsentCheckbox
            checked={consentGiven}
            onCheckedChange={onConsentChange}
            className="py-4"
          />

          <div className="pt-4">
            <Button
              onClick={onContinue}
              disabled={!consentGiven}
              size="lg"
              className="w-full bg-primary hover:bg-primary-glow text-white font-medium py-3"
            >
              Fortsätt till formuläret
            </Button>
            
            {!consentGiven && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Du måste godkänna villkoren för att fortsätta
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};