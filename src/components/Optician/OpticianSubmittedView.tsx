
/**
 * This component displays a successful submission state specifically for the optician form.
 * It shows a confirmation message and provides navigation back to the dashboard.
 */

import React from "react";
import { CheckCircle } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface OpticianSubmittedViewProps {
  patientName?: string;
}

const OpticianSubmittedView: React.FC<OpticianSubmittedViewProps> = ({ patientName }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-center text-green-600">Formuläret har fyllts i</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">
            Anamnesen har markerats som ifylld av optiker och statusen har ändrats till "Klar för undersökning".
            {patientName && ` Patient: ${patientName}`}
          </p>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Du kommer automatiskt att omdirigeras till översikten.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            Tillbaka till översikten
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OpticianSubmittedView;
