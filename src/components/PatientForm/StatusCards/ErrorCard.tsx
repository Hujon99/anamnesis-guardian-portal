
/**
 * This component displays an error state for the patient form.
 * It shows error details and provides a retry button.
 */

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorCardProps {
  error: string;
  errorCode?: string | null;
  diagnosticInfo?: string | null;
  onRetry: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ 
  error, 
  errorCode, 
  diagnosticInfo, 
  onRetry 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-center text-destructive">Åtkomst nekad</CardTitle>
          <CardDescription className="text-center">
            {errorCode === 'server_error' 
              ? 'Ett tekniskt problem uppstod när vi försökte verifiera din åtkomst.' 
              : 'Vi kunde inte verifiera din åtkomst till formuläret.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fel</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          {errorCode && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Felkod: {errorCode}</p>
            </div>
          )}
          
          {diagnosticInfo && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600 overflow-auto max-h-32">
              <pre>{diagnosticInfo}</pre>
            </div>
          )}
          
          <div className="mt-6">
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Försök igen
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground text-center">
            Om du fick länken via SMS, kontrollera att du kopierat hela länken. 
            Vid fortsatta problem, kontakta din optiker och nämn felkoden ovan.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ErrorCard;
