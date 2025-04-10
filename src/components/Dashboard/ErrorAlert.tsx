//Comment
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ErrorAlertProps {
  supabaseError: Error | null;
  syncError: Error | null;
  notesError: Error | null;
  isSyncing: boolean;
}

export const ErrorAlert = ({ supabaseError, syncError, notesError, isSyncing }: ErrorAlertProps) => {
  if (isSyncing) {
    return (
      <Alert className="mb-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Synkroniserar organisation</AlertTitle>
        <AlertDescription>
          Väntar på synkronisering med databasen...
        </AlertDescription>
      </Alert>
    );
  }

  if (supabaseError || syncError || notesError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Ett fel har uppstått</AlertTitle>
        <AlertDescription>
          {supabaseError?.message || syncError?.message || (notesError as Error)?.message || 
            "Det uppstod ett problem med anslutningen till databasen. Försök igen senare."}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
