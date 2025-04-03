
/**
 * This component renders the content for the current form step,
 * including all visible sections and their questions.
 * Enhanced with accessibility attributes for better screen reader support.
 */

import React from "react";
import { FormSection } from "@/components/PatientForm/FormSection";

interface FormStepContentProps {
  sections: Array<any>;
  currentValues: Record<string, any>;
}

const FormStepContent: React.FC<FormStepContentProps> = ({
  sections,
  currentValues
}) => {
  if (!sections || sections.length === 0) {
    return (
      <div 
        className="text-center py-4 text-gray-500"
        role="status"
        aria-live="polite"
      >
        Inga frågor att visa i detta steg.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="sr-only" role="status">
        Visar {sections.length} sektion(er) i detta steg.
      </div>
      {sections.map((section, idx) => (
        <FormSection 
          key={`${section.section_title}-${idx}`} 
          section={section}
          currentValues={currentValues}
        />
      ))}
    </div>
  );
};

export default FormStepContent;
