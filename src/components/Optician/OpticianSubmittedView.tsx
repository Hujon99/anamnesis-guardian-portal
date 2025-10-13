
/**
 * This component displays a successful submission state specifically for the optician form.
 * It shows a confirmation message and provides navigation back to the dashboard.
 */

import React, { useState } from "react";
import { CheckCircle, Car, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { EXAMINATION_TYPES } from "@/types/examinationType";

interface OpticianSubmittedViewProps {
  patientName?: string;
  entryId?: string;
  examinationType?: string;
}

const OpticianSubmittedView: React.FC<OpticianSubmittedViewProps> = ({ 
  patientName, 
  entryId, 
  examinationType 
}) => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Check if this is a driving license examination
  const isDrivingLicenseExam = examinationType?.toLowerCase() === EXAMINATION_TYPES.KÖRKORTSUNDERSÖKNING;
  
  const handleNavigateToDrivingLicenseExam = () => {
    if (!entryId) return;
    
    setIsNavigating(true);
    
    // Navigate to dashboard with entry ID in URL state to open driving license examination
    navigate("/dashboard", {
      state: { 
        openDrivingLicenseExam: entryId,
        fromSubmission: true
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
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
        <CardFooter className="flex flex-col gap-3">
          {isDrivingLicenseExam && entryId && (
            <Button 
              onClick={handleNavigateToDrivingLicenseExam}
              className="w-full bg-gradient-to-r from-primary to-accent-1 hover:from-primary/90 hover:to-accent-1/90"
              disabled={isNavigating}
            >
              <Car className="h-4 w-4 mr-2" />
              {isNavigating ? "Öppnar undersökning..." : "Lämna över till assistent/optiker"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          <Button 
            onClick={() => navigate("/dashboard")} 
            variant={isDrivingLicenseExam && entryId ? "outline" : "default"} 
            className="w-full"
          >
            Tillbaka till översikten
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OpticianSubmittedView;
