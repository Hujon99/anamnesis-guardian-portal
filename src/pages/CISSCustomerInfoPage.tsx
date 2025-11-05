/**
 * CISSCustomerInfoPage.tsx
 * 
 * Purpose: Collect customer information before CISS form access
 * 
 * Flow:
 * 1. Patient scans QR → /ciss/:orgId → redirects here
 * 2. Patient enters name and personal number
 * 3. On submit → calls generate-ciss-token with customer info + store_id from URL
 * 4. Redirects to patient form with token
 * 
 * This ensures we have patient identification before form submission.
 * 
 * UPDATED: Now extracts store_id from URL parameters and passes it to generate-ciss-token
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserIcon, FileTextIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CISSCustomerInfoPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  
  // Extract store_id from URL parameters if provided (from activeStore context)
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get('store_id');
  
  const [firstName, setFirstName] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      setError("Vänligen ange ditt namn");
      return;
    }
    
    if (!personalNumber.trim()) {
      setError("Vänligen ange ditt personnummer");
      return;
    }

    // Basic validation of personal number format (YYYYMMDD-XXXX or YYMMDD-XXXX)
    const pnPattern = /^(\d{6}|\d{8})-?\d{4}$/;
    if (!pnPattern.test(personalNumber.replace(/\s/g, ''))) {
      setError("Ogiltigt personnummer. Använd format ÅÅMMDD-XXXX");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);

      console.log(`[CISS Customer Info] Submitting for organization: ${organizationId}${storeId ? `, store: ${storeId}` : ''}`);

      // Call edge function to generate token with customer info and store_id
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-ciss-token',
        {
          body: {
            organizationId,
            firstName: firstName.trim(),
            personalNumber: personalNumber.trim(),
            storeId: storeId || null, // Include store_id from URL if available
          },
        }
      );

      if (functionError) {
        console.error('[CISS Customer Info] Function error:', functionError);
        throw new Error(functionError.message || 'Kunde inte skapa formulär');
      }

      if (!data?.token) {
        throw new Error('Ingen token returnerades');
      }

      console.log(`[CISS Customer Info] Token generated, redirecting to form`);

      // Redirect to patient form with token
      navigate(`/patient-form?token=${data.token}`, { replace: true });

    } catch (err) {
      console.error('[CISS Customer Info] Error:', err);
      setError(err instanceof Error ? err.message : 'Ett oväntat fel uppstod');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-surface-light to-white">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            CISS-formulär
          </CardTitle>
          <CardDescription>
            Vänligen ange dina uppgifter för att påbörja formuläret
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                Fullt namn *
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Ange ditt fullständiga namn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            
            {/* Personal number field */}
            <div className="space-y-2">
              <Label htmlFor="personalNumber" className="flex items-center">
                <FileTextIcon className="h-4 w-4 mr-2" />
                Personnummer *
              </Label>
              <Input
                id="personalNumber"
                type="text"
                placeholder="ÅÅMMDD-XXXX"
                value={personalNumber}
                onChange={(e) => setPersonalNumber(e.target.value)}
                required
                disabled={isSubmitting}
                maxLength={13}
              />
              <p className="text-xs text-muted-foreground">
                Ange ditt personnummer i formatet ÅÅMMDD-XXXX
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting || !firstName.trim() || !personalNumber.trim()}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Förbereder..." : "Fortsätt till formulär"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
