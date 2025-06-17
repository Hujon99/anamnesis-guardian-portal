
/**
 * Error fallback component for the optician form error boundary.
 * Provides recovery options when the form encounters unexpected errors.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OpticianFormErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const OpticianFormErrorFallback = ({ 
  error, 
  resetErrorBoundary 
}: OpticianFormErrorFallbackProps) => {
  const navigate = useNavigate();
  
  return (
    <Card className="w-full max-w-3xl mx-auto p-6">
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-600">Ett fel har uppstått</h2>
          <p className="text-gray-700 max-w-lg">
            {error.message || "Ett oväntat fel uppstod vid laddning av sidan."}
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-md pt-4">
            <Button 
              onClick={resetErrorBoundary}
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Försök igen
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="w-full"
            >
              Återgå till dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
