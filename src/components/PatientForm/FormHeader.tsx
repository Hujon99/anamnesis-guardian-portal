
/**
 * This component renders the header section of the form, including the progress bar,
 * section navigation, and title. It provides visual feedback about the form completion
 * progress and allows direct navigation between sections.
 */

import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import SegmentProgress from "./SegmentProgress";
import SectionNavigation from "./SectionNavigation";

interface FormHeaderProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  createdByName?: string | null;
  visibleSections?: any[];
  onSectionClick?: (stepIndex: number) => void;
  completedSteps?: number[];
  canNavigateToStep?: (stepIndex: number) => boolean;
}

const FormHeader: React.FC<FormHeaderProps> = ({ 
  currentStep, 
  totalSteps, 
  progress,
  createdByName,
  visibleSections = [],
  onSectionClick,
  completedSteps = [],
  canNavigateToStep
}) => {
  return (
    <CardHeader className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <CardTitle className="text-xl font-semibold font-display" id="form-title">Hälsodeklaration</CardTitle>
        <span className="text-sm text-muted-foreground">
          Steg {currentStep + 1} av {totalSteps}
        </span>
      </div>
      
      <SegmentProgress 
        currentStep={currentStep}
        totalSteps={totalSteps}
      />
      
      {/* Section Navigation */}
      {visibleSections.length > 0 && onSectionClick && (
        <div className="pt-2">
          <SectionNavigation
            sections={visibleSections}
            currentStep={currentStep}
            onSectionClick={onSectionClick}
            completedSteps={completedSteps}
            canNavigateToStep={canNavigateToStep}
          />
        </div>
      )}
      
      {createdByName && (
        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <User className="h-4 w-4" strokeWidth={1.5} />
          <span>Ansvarig optiker: {createdByName}</span>
        </div>
      )}
    </CardHeader>
  );
};

export default FormHeader;
