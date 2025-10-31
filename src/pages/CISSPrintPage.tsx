/**
 * CISSPrintPage.tsx
 * 
 * Purpose: Dedicated print page for CISS QR code
 * 
 * This page is designed specifically for printing. It displays the QR code,
 * clear instructions, and automatically triggers the print dialog when loaded.
 * The layout is optimized for A4 paper with clean, professional styling.
 */

import { useEffect } from "react";
import { useSafeOrganization } from "@/hooks/useSafeOrganization";
import { CISSQRCodeDisplay } from "@/components/CISS/CISSQRCodeDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function CISSPrintPage() {
  const { organization } = useSafeOrganization();
  const cissUrl = `${window.location.origin}/ciss/${organization?.id || ''}`;

  // Trigger print dialog when page loads
  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (!organization?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Kunde inte hämta organisationsinformation. Vänligen stäng detta fönster och försök igen.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">CISS-formulär</h1>
          <p className="text-2xl text-gray-700 mb-3">Skanna QR-koden för att komma igång</p>
          <p className="text-xl text-gray-600">{organization.name}</p>
        </div>

        {/* QR Code */}
        <div className="mb-12">
          <CISSQRCodeDisplay url={cissUrl} size={320} />
        </div>

        {/* Instructions */}
        <div className="max-w-2xl w-full">
          <h2 className="text-3xl font-semibold mb-6 text-center text-gray-900">Instruktioner</h2>
          <div className="space-y-6 text-lg">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="pt-1">
                <strong>Skanna QR-koden</strong> med patientens mobiltelefon
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="pt-1">
                <strong>Fyll i namn och personnummer</strong> när du blir ombedd
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="pt-1">
                <strong>Besvara frågorna</strong> i formuläret på din enhet
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div className="pt-1">
                <strong>Svaren skickas säkert</strong> till din optiker när du är klar
              </div>
            </div>
          </div>

          {/* GDPR Notice */}
          <div className="mt-10 p-6 bg-gray-100 rounded-lg">
            <p className="text-base text-gray-800 text-center">
              <strong>GDPR-säkert:</strong> Varje skanning skapar en unik, säker session som automatiskt upphör efter 24 timmar.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Genererad från Anamnesportalen</p>
          <p className="mt-1">{new Date().toLocaleDateString('sv-SE')}</p>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4 portrait;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
