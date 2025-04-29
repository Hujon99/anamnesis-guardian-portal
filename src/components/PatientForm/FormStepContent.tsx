
/**
 * This component renders the content for the current form step.
 * It displays the appropriate sections and their questions based on 
 * the current step in the form flow.
 */

import React from "react";
import { FormSection as FormSectionType } from "@/types/anamnesis";
import { FormSection } from "./FormSection";
import { useFormContext } from "@/contexts/FormContext";

interface FormStepContentProps {
  sections: FormSectionType[];
  currentValues: Record<string, any>;
}

export const FormStepContent: React.FC<FormStepContentProps> = ({
  sections,
  currentValues
}) => {
  const { processSectionsWithDebounce } = useFormContext();
  
  // Update the form submission state when sections or values change
  React.useEffect(() => {
    // Process the current sections with the current form values
    if (processSectionsWithDebounce) {
      processSectionsWithDebounce(sections, currentValues);
    }
  }, [sections, currentValues, processSectionsWithDebounce]);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <FormSection 
          key={section.section_title} 
          section={section} 
          currentValues={currentValues}
        />
      ))}
    </div>
  );
};

export default FormStepContent;
