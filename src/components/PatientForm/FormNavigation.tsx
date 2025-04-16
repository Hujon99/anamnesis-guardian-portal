
/**
 * This component provides navigation controls for multi-step forms.
 * It includes previous/next buttons and handles form submission.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface FormNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
}

const FormNavigation: React.FC<FormNavigationProps> = ({
  isFirstStep,
  isLastStep,
  isSubmitting,
  onNext,
  onPrevious,
  onSubmit
}) => {
  const [validationAttempted, setValidationAttempted] = useState(false);
  
  const handleNext = () => {
    setValidationAttempted(true);
    onNext();
  };
  
  const handleSubmit = () => {
    setValidationAttempted(true);
    onSubmit();
  };

  return (
    <div className="flex justify-between w-full">
      {!isFirstStep && (
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          aria-label="Gå till föregående steg"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Föregående</span>
          <span className="sr-only"> (Alt+Vänsterpil)</span>
        </Button>
      )}
      
      {isLastStep ? (
        <Button 
          type="button"
          className={`${isFirstStep ? "ml-auto" : ""}`}
          disabled={isSubmitting}
          aria-label="Skicka formulär"
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Skickar...</span>
            </>
          ) : (
            <span>Skicka svar</span>
          )}
        </Button>
      ) : (
        <div className="flex flex-col items-end">
          <Button 
            type="button"
            onClick={handleNext}
            className={`${isFirstStep ? "ml-auto" : ""}`}
            aria-label="Gå till nästa steg"
          >
            <span>Nästa</span>
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            <span className="sr-only"> (Alt+Högerpil)</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default FormNavigation;
