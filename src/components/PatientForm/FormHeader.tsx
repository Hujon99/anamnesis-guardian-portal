
/**
 * This component renders the form header with title, description, and progress bar.
 * It displays the current step progress and form title information.
 */

import React from "react";
import { Progress } from "@/components/ui/progress";
import { FileQuestion } from "lucide-react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface FormHeaderProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
}

const FormHeader: React.FC<FormHeaderProps> = ({
  title,
  currentStep,
  totalSteps,
  progress
}) => {
  return (
    <CardHeader>
      <div className="flex justify-center mb-4" aria-hidden="true">
        <FileQuestion className="h-10 w-10 text-primary" />
      </div>
      <CardTitle className="text-center" id="form-title">
        {title}
      </CardTitle>
      <CardDescription className="text-center">
        Vänligen fyll i formuläret nedan för att hjälpa din optiker förbereda din undersökning.
      </CardDescription>
      
      {/* Progress bar */}
      <div className="w-full mt-4">
        <div className="flex justify-between mb-2">
          <span className="text-xs">Steg {currentStep + 1} av {totalSteps}</span>
          <span className="text-xs">{progress}% klart</span>
        </div>
        <Progress 
          value={progress} 
          className="h-2" 
          aria-label={`Formulärets framsteg: ${progress}% klart`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        />
      </div>
    </CardHeader>
  );
};

export default FormHeader;
