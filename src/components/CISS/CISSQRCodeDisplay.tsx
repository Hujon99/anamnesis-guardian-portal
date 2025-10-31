/**
 * CISSQRCodeDisplay.tsx
 * 
 * Purpose: Display QR code for CISS form access
 * 
 * Renders a scannable QR code that links to the CISS entry endpoint.
 * Optimized for both screen display and printing.
 */

import { QRCodeSVG } from "qrcode.react";

interface CISSQRCodeDisplayProps {
  url: string;
  size?: number;
}

export function CISSQRCodeDisplay({ url, size = 256 }: CISSQRCodeDisplayProps) {
  return (
    <div className="inline-block p-4 bg-white rounded-lg shadow-sm print:shadow-none">
      <QRCodeSVG
        value={url}
        size={size}
        level="H" // High error correction for better scanning
        includeMargin={true}
        className="print:w-64 print:h-64"
      />
      <div className="mt-3 text-center text-xs text-muted-foreground print:text-black">
        Skanna för CISS-formulär
      </div>
    </div>
  );
}
