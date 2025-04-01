
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}

export const ErrorState = ({ errorMessage, onRetry }: ErrorStateProps) => {
  // Simplify error message for display
  const displayMessage = errorMessage.includes("PGRST301") 
    ? "Autentiseringsfel. Din session kan ha gått ut."
    : errorMessage.includes("Too many requests") 
      ? "För många förfrågningar. Vänta en stund och försök igen."
      : errorMessage;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          Problem med att hämta data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{displayMessage}</AlertDescription>
        </Alert>
        
        <div className="flex flex-col space-y-3">
          <p className="text-sm text-muted-foreground">
            Det kan hjälpa att logga ut och in igen om problemet kvarstår.
          </p>
          
          <Button 
            variant="default" 
            className="w-full" 
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Försök igen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
