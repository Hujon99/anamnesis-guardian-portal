
/**
 * This component displays a success message after an optician has
 * successfully completed a patient anamnesis form.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const OpticianSubmittedView: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <Card className="max-w-md mx-auto mt-8 text-center">
      <CardHeader>
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
        <CardTitle>Formuläret har fyllts i</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-6">
          Formuläret har nu markerats som ifyllt av optiker och statusen är ändrad till "Klar för undersökning".
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Du kommer automatiskt att omdirigeras till översikten...
        </p>
        <Button onClick={() => navigate("/dashboard")} className="w-full">
          Tillbaka till översikten
        </Button>
      </CardContent>
    </Card>
  );
};

export default OpticianSubmittedView;
