
/**
 * This component displays an expired link state for the patient form.
 * It informs the user that their link has expired and provides guidance.
 */

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ExpiredCard: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-center text-yellow-600">Länken har gått ut</CardTitle>
          <CardDescription className="text-center">
            Denna länk är inte längre giltig.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Utgången länk</AlertTitle>
            <AlertDescription>
              Länken du försöker använda har gått ut. Kontakta din optiker för att få en ny länk.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground text-center">
            Om du har frågor, kontakta din optiker direkt.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ExpiredCard;
