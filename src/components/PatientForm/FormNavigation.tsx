
/**
 * This component provides navigation controls for multi-step forms.
 * It includes previous/next buttons and handles form submission.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface FormNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

const FormNavigation: React.FC<FormNavigationProps> = ({
  isFirstStep,
  isLastStep,
  isSubmitting,
  onNext,
  onPrevious
}) => {
  return (
    <div className="flex justify-between w-full">
      {!isFirstStep && (
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Föregående
        </Button>
      )}
      
      <Button 
        type="button" 
        onClick={onNext}
        className={`${isFirstStep && "ml-auto"}`}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isLastStep ? (
          "Skicka svar"
        ) : (
          <>
            Nästa
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
};

export default FormNavigation;
