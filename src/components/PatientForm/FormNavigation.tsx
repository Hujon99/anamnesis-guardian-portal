
/**
 * This component provides navigation controls for multi-step forms.
 * It includes previous/next buttons and handles form submission.
 * Enhanced with better error handling and debugging to trace submission flow.
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
  // Handle next click with animation
  const handleNextClick = () => {
    // Add animation class to the button for visual feedback
    const button = document.getElementById('next-button');
    if (button) {
      button.classList.add('animate-pulse-once');
      // Remove the class after animation completes
      setTimeout(() => {
        button.classList.remove('animate-pulse-once');
      }, 400);
    }
    onNext();
  };
  
  // Handle submit click
  const handleSubmitClick = () => {
    // Add animation class to the button for visual feedback
    const button = document.getElementById('submit-button');
    if (button) {
      button.classList.add('animate-pulse-once');
      // Remove the class after animation completes
      setTimeout(() => {
        button.classList.remove('animate-pulse-once');
      }, 400);
    }
    onSubmit();
  };
  
  return (
    <div className="flex flex-col md:flex-row md:justify-start justify-between w-full gap-2">
      <div className="flex-1 md:flex-initial">
        {!isFirstStep && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            aria-label="Gå till föregående steg"
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Föregående</span>
            <span className="sr-only"> (Alt+Vänsterpil)</span>
          </Button>
        )}
      </div>
      
      <div className="flex-1 md:flex-initial flex justify-end md:justify-start">
        {isLastStep ? (
          <Button 
            id="submit-button"
            type="button"
            disabled={isSubmitting}
            aria-label="Skicka formulär"
            onClick={handleSubmitClick}
            className="w-full md:w-auto transition-all"
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
            id="next-button"
            type="button"
            onClick={handleNextClick}
            aria-label="Gå till nästa steg"
            className="w-full md:w-auto transition-all"
          >
            <span>Nästa</span>
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            <span className="sr-only"> (Alt+Högerpil)</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default FormNavigation;
