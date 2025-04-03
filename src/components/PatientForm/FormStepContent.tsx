
/**
 * This component renders the content for the current form step,
 * including all visible sections and their questions.
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
    return <div className="text-center py-4 text-gray-500">Inga frågor att visa i detta steg.</div>;
  }

  return (
    <div className="space-y-8">
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
