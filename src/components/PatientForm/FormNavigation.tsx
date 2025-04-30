
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
  console.log("[FormNavigation]: Rendering with isLastStep:", isLastStep, "isSubmitting:", isSubmitting);
  
  const handleSubmitClick = () => {
    console.log("[FormNavigation/handleSubmitClick]: Submit button clicked, calling onSubmit handler");
    // Add a detailed log to track submission flow
    try {
      onSubmit();
      console.log("[FormNavigation/handleSubmitClick]: onSubmit handler called successfully");
    } catch (error) {
      console.error("[FormNavigation/handleSubmitClick]: Error calling onSubmit handler:", error);
    }
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
          type="button" // Changed from "submit" to "button" to prevent automatic submission
          className={`${isFirstStep ? "ml-auto" : ""}`}
          disabled={isSubmitting}
          aria-label="Skicka formulär"
          onClick={handleSubmitClick}
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
        <Button 
          type="button"
          onClick={() => {
            console.log("[FormNavigation]: Next button clicked");
            onNext();
          }}
          className={`${isFirstStep ? "ml-auto" : ""}`}
          aria-label="Gå till nästa steg"
        >
          <span>Nästa</span>
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          <span className="sr-only"> (Alt+Högerpil)</span>
        </Button>
      )}
    </div>
  );
};

export default FormNavigation;
