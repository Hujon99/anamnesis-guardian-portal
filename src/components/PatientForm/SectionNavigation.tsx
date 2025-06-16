
/**
 * This component renders clickable section navigation for the multi-step form.
 * It allows users to jump directly to any section while respecting validation rules.
 * Features responsive design and visual indicators for current/completed sections.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionNavigationProps {
  sections: any[];
  currentStep: number;
  onSectionClick: (stepIndex: number) => void;
  completedSteps?: number[];
  canNavigateToStep?: (stepIndex: number) => boolean;
}

const SectionNavigation: React.FC<SectionNavigationProps> = ({
  sections,
  currentStep,
  onSectionClick,
  completedSteps = [],
  canNavigateToStep = () => true
}) => {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="w-full">
      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-wrap gap-2 justify-center">
        {sections.map((stepSections, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.includes(index);
          const canNavigate = canNavigateToStep(index);
          const isPast = index < currentStep;
          
          // Get the first section title for this step
          const sectionTitle = stepSections[0]?.title || `Steg ${index + 1}`;
          
          return (
            <Button
              key={index}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => canNavigate && onSectionClick(index)}
              disabled={!canNavigate && !isPast}
              className={cn(
                "transition-all duration-200 relative",
                isActive && "bg-primary text-primary-foreground shadow-md",
                isCompleted && !isActive && "bg-accent-1/10 border-accent-1/30 text-accent-1",
                !canNavigate && !isPast && "opacity-50 cursor-not-allowed",
                isPast && "hover:bg-accent-1/20 hover:border-accent-1/50"
              )}
            >
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <Check className="h-3 w-3" strokeWidth={2} />
                ) : !canNavigate && !isPast ? (
                  <Lock className="h-3 w-3" strokeWidth={1.5} />
                ) : (
                  <Circle className="h-3 w-3" strokeWidth={1.5} />
                )}
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {sectionTitle}
                </span>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Mobile Navigation - Horizontal Scroll */}
      <div className="md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
          {sections.map((stepSections, index) => {
            const isActive = index === currentStep;
            const isCompleted = completedSteps.includes(index);
            const canNavigate = canNavigateToStep(index);
            const isPast = index < currentStep;
            
            // Get abbreviated title for mobile
            const sectionTitle = stepSections[0]?.title || `Steg ${index + 1}`;
            const abbreviatedTitle = sectionTitle.length > 15 
              ? sectionTitle.substring(0, 12) + "..." 
              : sectionTitle;
            
            return (
              <Button
                key={index}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => canNavigate && onSectionClick(index)}
                disabled={!canNavigate && !isPast}
                className={cn(
                  "transition-all duration-200 flex-shrink-0 min-w-[100px]",
                  isActive && "bg-primary text-primary-foreground shadow-md",
                  isCompleted && !isActive && "bg-accent-1/10 border-accent-1/30 text-accent-1",
                  !canNavigate && !isPast && "opacity-50 cursor-not-allowed",
                  isPast && "hover:bg-accent-1/20 hover:border-accent-1/50"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {isCompleted ? (
                    <Check className="h-3 w-3" strokeWidth={2} />
                  ) : !canNavigate && !isPast ? (
                    <Lock className="h-3 w-3" strokeWidth={1.5} />
                  ) : (
                    <Circle className="h-3 w-3" strokeWidth={1.5} />
                  )}
                  <span className="text-xs font-medium">
                    {abbreviatedTitle}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SectionNavigation;
