/**
 * Upgrade Indicator Component
 * 
 * Visual indicator shown to opticians when a patient has accepted an upgrade offer.
 * Displays prominently in both the list view (as a badge) and detail view (as an alert).
 * 
 * This helps opticians prepare for the appropriate level of examination.
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface UpgradeIndicatorProps {
  variant?: 'badge' | 'alert';
  className?: string;
}

export function UpgradeIndicator({ variant = 'badge', className }: UpgradeIndicatorProps) {
  if (variant === 'badge') {
    return (
      <Badge 
        className={`bg-amber-500 text-white hover:bg-amber-600 ${className}`}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Uppgradering
      </Badge>
    );
  }

  return (
    <Alert className={`border-amber-500 bg-amber-50 dark:bg-amber-950/20 ${className}`}>
      <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Uppgradering till ögonhälsoundersökning
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        Patienten har accepterat uppgradering. Förbered för utökad undersökning.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Helper function to check if answers contain accepted upgrade
 */
export function hasAcceptedUpgrade(answers: Record<string, any> | null | undefined): boolean {
  if (!answers) return false;

  return Object.entries(answers).some(([key, value]) => {
    if (!key.startsWith('upgrade_')) return false;
    
    return (
      value === 'Ja, jag vill uppgradera' ||
      value === 'Ja' ||
      value === true ||
      (typeof value === 'string' && value.toLowerCase().includes('ja'))
    );
  });
}