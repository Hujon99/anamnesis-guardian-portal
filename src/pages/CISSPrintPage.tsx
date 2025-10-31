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
    <div className="bg-white print:bg-white">
      <div className="flex flex-col items-center p-6">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">CISS-formulär</h1>
          <p className="text-lg text-gray-700 mb-1">Skanna QR-koden för att komma igång</p>
          <p className="text-base text-gray-600">{organization.name}</p>
        </div>

        {/* QR Code - centered and optimized size */}
        <div className="mb-6">
          <CISSQRCodeDisplay url={cissUrl} size={240} />
        </div>

        {/* Compact Instructions */}
        <div className="max-w-xl w-full mb-6">
          <h2 className="text-xl font-semibold mb-3 text-center text-gray-900">Så här gör du</h2>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[hsl(210,100%,40%)] text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div className="pt-0.5">
                <strong>Skanna QR-koden</strong> med patientens mobiltelefon
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[hsl(210,100%,40%)] text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div className="pt-0.5">
                <strong>Fyll i namn och personnummer</strong> när du blir ombedd
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[hsl(210,100%,40%)] text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div className="pt-0.5">
                <strong>Besvara frågorna</strong> i formuläret på din enhet
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[hsl(210,100%,40%)] text-white flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div className="pt-0.5">
                <strong>Svaren skickas säkert</strong> till din optiker när du är klar
              </div>
            </div>
          </div>
        </div>

        {/* Compact GDPR Notice */}
        <div className="max-w-xl w-full mb-4">
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <p className="text-xs text-gray-700 text-center leading-relaxed">
              <strong>GDPR-säkert:</strong> Varje skanning skapar en unik, säker session som automatiskt upphör efter 24 timmar.
            </p>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="text-center text-xs text-gray-500 mt-2">
          <p>Genererad från Anamnesportalen · {new Date().toLocaleDateString('sv-SE')}</p>
        </div>
      </div>

      {/* Print-specific styles - optimized for single page */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
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
          
          /* Ensure compact spacing in print */
          .space-y-3 > * + * {
            margin-top: 0.5rem !important;
          }
        }
        
        @media screen {
          /* Center content on screen preview */
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
          }
        }
      `}</style>
    </div>
  );
}
