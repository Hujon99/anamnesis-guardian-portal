
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}

export const ErrorState = ({ errorMessage, onRetry }: ErrorStateProps) => {
  return (
    <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
      <p>Ett fel uppstod: {errorMessage}</p>
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-2" 
        onClick={onRetry}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Försök igen
      </Button>
    </div>
  );
};
