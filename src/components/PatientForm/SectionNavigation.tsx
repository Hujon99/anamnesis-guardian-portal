
/**
 * This component renders clickable section navigation for the multi-step form.
 * It allows users to jump directly to any section while respecting validation rules.
 * Features responsive design, visual indicators for current/completed sections,
 * and automatic scrolling in mobile view to keep the active section visible.
 */

import React, { useRef, useEffect } from "react";
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
  // Refs for scroll container and buttons
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-scroll to active section in mobile view
  useEffect(() => {
    const scrollToActiveSection = () => {
      const container = scrollContainerRef.current;
      const activeButton = buttonRefs.current[currentStep];
      
      if (container && activeButton) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          activeButton.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }, 100);
      }
    };

    scrollToActiveSection();
  }, [currentStep]);

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
          
          // Get the first section title for this step using the correct property name
          const sectionTitle = stepSections[0]?.section_title || `Steg ${index + 1}`;
          
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
                <span className="text-xs font-medium truncate max-w-[140px]">
                  {sectionTitle}
                </span>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Mobile Navigation - Horizontal Scroll with Auto-scroll */}
      <div className="md:hidden">
        <div 
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {sections.map((stepSections, index) => {
            const isActive = index === currentStep;
            const isCompleted = completedSteps.includes(index);
            const canNavigate = canNavigateToStep(index);
            const isPast = index < currentStep;
            
            // Get section title and create mobile-friendly version
            const sectionTitle = stepSections[0]?.section_title || `Steg ${index + 1}`;
            const abbreviatedTitle = sectionTitle.length > 18 
              ? sectionTitle.substring(0, 15) + "..." 
              : sectionTitle;
            
            return (
              <Button
                key={index}
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => canNavigate && onSectionClick(index)}
                disabled={!canNavigate && !isPast}
                className={cn(
                  "transition-all duration-200 flex-shrink-0 min-w-[120px]",
                  isActive && "bg-primary text-primary-foreground shadow-md",
                  isCompleted && !isActive && "bg-accent-1/10 border-accent-1/30 text-accent-1",
                  !canNavigate && !isPast && "opacity-50 cursor-not-allowed",
                  isPast && "hover:bg-accent-1/20 hover:border-accent-1/50"
                )}
                aria-current={isActive ? "step" : undefined}
                aria-label={`${sectionTitle} - ${isActive ? 'nuvarande steg' : isCompleted ? 'slutfört' : 'väntande'}`}
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
