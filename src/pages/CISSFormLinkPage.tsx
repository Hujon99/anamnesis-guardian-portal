/**
 * CISSFormLinkPage.tsx
 * 
 * Purpose: Display QR code and link for CISS form access
 * 
 * This page shows:
 * - Organization's permanent QR code for CISS forms
 * - Scannable link that patients can access
 * - Print button for physical QR code display
 * 
 * Each scan generates a unique token via the generate-ciss-token edge function,
 * ensuring GDPR compliance and secure, isolated form submissions.
 * 
 * Flow:
 * 1. User opens this page in sidebar menu
 * 2. QR code is displayed with organization's CISS entry URL
 * 3. Patients scan QR → redirected to /ciss/:orgId → token generated → patient-form
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Printer, QrCode, Info, Copy, CheckCircle2 } from "lucide-react";
import { useSafeOrganization } from "@/hooks/useSafeOrganization";
import { CISSQRCodeDisplay } from "@/components/CISS/CISSQRCodeDisplay";
import { useState } from "react";
import { toast } from "sonner";

export default function CISSFormLinkPage() {
  const { organization } = useSafeOrganization();
  const [copied, setCopied] = useState(false);

  // Generate CISS entry URL
  const cissUrl = `${window.location.origin}/ciss/${organization?.id || ''}`;

  if (!organization?.id) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>
            Kunde inte ladda organisations-ID. Vänligen logga in igen.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(cissUrl);
      setCopied(true);
      toast.success("Länk kopierad!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Kunde inte kopiera länk");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">CISS-formulär</h1>
        <p className="text-muted-foreground">
          Skanna QR-koden för att ge patienter tillgång till CISS-formuläret
        </p>
      </div>

      {/* Main Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR-kod för CISS-formulär
          </CardTitle>
          <CardDescription>
            Varje skanning skapar en unik, säker session som automatiskt upphör efter 24 timmar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex justify-center py-8">
            <CISSQRCodeDisplay url={cissUrl} />
          </div>

          {/* Link Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Länk till formulär</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cissUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                title="Kopiera länk"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Skriv ut QR-kod
            </Button>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>GDPR-säkert:</strong> Varje gång QR-koden skannas skapas en ny unik länk 
              som bara kan användas en gång. Formulärdata raderas automatiskt enligt era inställningar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="mt-6 print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Så här använder du CISS-formuläret</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              1
            </div>
            <div>
              <strong>Skanna QR-koden</strong> med patientens mobiltelefon
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              2
            </div>
            <div>
              <strong>Patienten fyller i formuläret</strong> på sin enhet
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              3
            </div>
            <div>
              <strong>Se svaren</strong> i Optiker-vyn när formuläret är inskickat
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print-only section */}
      <div className="hidden print:block print-content">
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">CISS-formulär</h1>
            <p className="text-xl text-gray-700 mb-2">Skanna QR-koden för att komma igång</p>
            <p className="text-lg text-gray-600">{organization?.name || 'Anamnesportalen'}</p>
          </div>

          <div className="mb-8">
            <CISSQRCodeDisplay url={cissUrl} size={320} />
          </div>

          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center">Instruktioner</h2>
            <div className="space-y-4 text-lg">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <strong>Skanna QR-koden</strong> med patientens mobiltelefon
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <strong>Fyll i namn och personnummer</strong> när du blir ombedd
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <strong>Besvara frågorna</strong> i formuläret på din enhet
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <strong>Svaren skickas säkert</strong> till din optiker när du är klar
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center">
              <p className="text-sm text-gray-700">
                <strong>GDPR-säkert:</strong> Varje skanning skapar en unik, säker session som automatiskt upphör efter 24 timmar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          /* Hide everything by default */
          body > * {
            display: none !important;
          }
          
          /* Show only the print content */
          .print-content {
            display: block !important;
            visibility: visible !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          
          .print-content * {
            visibility: visible !important;
          }
          
          /* Ensure QR code prints well */
          .print-content canvas,
          .print-content svg {
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
