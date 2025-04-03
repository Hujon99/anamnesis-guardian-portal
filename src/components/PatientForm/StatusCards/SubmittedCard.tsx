
/**
 * This component displays a successful submission state for the patient form.
 * It shows a thank you message and next steps for the user.
 */

import React from "react";
import { CheckCircle } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SubmittedCard: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-center text-green-600">Tack för dina svar!</CardTitle>
          <CardDescription className="text-center">
            Din anamnes har skickats in och kommer att granskas av din optiker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Din optiker kommer att använda denna information för att förbereda din undersökning.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center flex-col gap-4">
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Nästa steg</AlertTitle>
            <AlertDescription>
              Din optiker kommer att gå igenom dina svar. Du behöver inte göra något mer just nu.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground text-center">
            Du kan nu stänga denna sida.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SubmittedCard;
