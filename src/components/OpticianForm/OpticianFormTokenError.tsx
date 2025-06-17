
/**
 * Component that displays token-related errors and recovery options.
 * Shows when tokens are expired, missing, or invalid.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DirectFormButton } from "@/components/Optician/DirectFormButton";

interface OpticianFormTokenErrorProps {
  title: string;
  message: string;
  showDirectFormButton?: boolean;
}

export const OpticianFormTokenError = ({ 
  title, 
  message, 
  showDirectFormButton = true 
}: OpticianFormTokenErrorProps) => {
  const navigate = useNavigate();
  
  return (
    <Card className="w-full max-w-3xl mx-auto p-6">
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="bg-amber-100 p-4 rounded-full">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-amber-600">{title}</h2>
          <p className="text-gray-700 max-w-lg">{message}</p>
          
          <div className="flex flex-col gap-3 w-full max-w-md pt-4">
            {showDirectFormButton && <DirectFormButton />}
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Återgå till dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
