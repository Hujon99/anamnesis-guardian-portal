
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
  console.log("[FormNavigation]: Rendering with isLastStep:", isLastStep, "isSubmitting:", isSubmitting);
  
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
      
      <Button 
        type={isLastStep ? "submit" : "button"} 
        onClick={() => {
          console.log("[FormNavigation]: Button clicked, isLastStep:", isLastStep);
          onNext();
        }}
        className={`${isFirstStep ? "ml-auto" : ""}`}
        disabled={isSubmitting}
        aria-label={isLastStep ? "Skicka formulär" : "Gå till nästa steg"}
        form={isLastStep ? "patient-form" : undefined}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Skickar...</span>
          </>
        ) : isLastStep ? (
          <span>Skicka svar</span>
        ) : (
          <>
            <span>Nästa</span>
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            <span className="sr-only"> (Alt+Högerpil)</span>
          </>
        )}
      </Button>
    </div>
  );
};

export default FormNavigation;
