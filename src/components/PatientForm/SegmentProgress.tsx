
/**
 * This component renders a segmented progress bar that visually indicates
 * the current step and total steps in a multi-step form process.
 * It shows completed steps, the current step, and upcoming steps with
 * distinct styling for better user orientation.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface SegmentProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export const SegmentProgress: React.FC<SegmentProgressProps> = ({ 
  currentStep, 
  totalSteps,
  className
}) => {
  // Create an array of step indexes for rendering segments
  const steps = Array.from({ length: totalSteps }, (_, i) => i);
  
  return (
    <div 
      className={cn(
        "flex w-full h-1.5 gap-0.5 mb-4",
        className
      )}
      role="progressbar" 
      aria-valuemin={0} 
      aria-valuemax={totalSteps} 
      aria-valuenow={currentStep + 1}
      aria-label={`Steg ${currentStep + 1} av ${totalSteps}`}
    >
      {steps.map((step) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        
        return (
          <div
            key={step}
            style={{ width: `calc(${100 / totalSteps}% - ${(totalSteps - 1) * 0.125}rem / ${totalSteps})` }}
            className={cn(
              "h-full transition-colors duration-200 rounded-sm",
              isCompleted && "bg-primary",
              isCurrent && "bg-primary relative",
              !isCompleted && !isCurrent && "bg-surface-light"
            )}
          >
            {isCurrent && (
              <span 
                className="absolute right-0 top-0 h-full w-[2px] bg-[hsl(173,64%,45%)]"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SegmentProgress;
