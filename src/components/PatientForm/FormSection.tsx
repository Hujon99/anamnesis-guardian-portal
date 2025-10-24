
/**
 * This component renders a section of the patient anamnesis form.
 * It displays questions that have already been filtered and processed
 * by useConditionalFields, including dynamic follow-up questions.
 * Validation errors are displayed inline with form fields.
 */

import React from "react";
import { FormSection as FormSectionType, DynamicFollowupQuestion } from "@/types/anamnesis";
import { FormFieldRenderer } from "./FormFieldRenderer";
import { TouchFriendlyFieldRenderer } from "./TouchFriendlyFieldRenderer";
import { useFormContext as useHookFormContext } from "react-hook-form";
import { useFormContext } from "@/contexts/FormContext";

interface FormSectionProps {
  section: FormSectionType;
  currentValues: Record<string, any>;
}

export const FormSection: React.FC<FormSectionProps> = ({ 
  section, 
  currentValues 
}) => {
  const { formState } = useHookFormContext();
  const { errors } = formState;
  
  // Get isOpticianMode and useTouchFriendly from our custom form context
  const { isOpticianMode, useTouchFriendly } = useFormContext();

  // Generate a section ID for accessibility linking
  const sectionId = `section-${section.section_title.toLowerCase().replace(/\s+/g, '-')}`;

  // All questions are already filtered and processed by useConditionalFields
  // This includes dynamic follow-up questions that have been generated
  const allVisibleQuestions = section.questions;
  
  // Choose the appropriate field renderer based on useTouchFriendly flag
  const FieldRenderer = useTouchFriendly ? TouchFriendlyFieldRenderer : FormFieldRenderer;

  return (
    <div className="mb-6" role="region" aria-labelledby={sectionId}>
      <h3 id={sectionId} className="text-lg font-medium mb-4">{section.section_title}</h3>
      <div className="space-y-6">
        {allVisibleQuestions.map((question) => {
          // Get the field ID (could be runtime ID for dynamic questions)
          const fieldId = (question as DynamicFollowupQuestion).runtimeId || question.id;
          
          // Get validation errors using the correct field ID
          const hasError = errors[fieldId] !== undefined;

          // Special styling for optician-specific fields
          const isOpticianField = question.show_in_mode === "optician";

          return (
            <div 
              key={fieldId} 
              className={`${hasError ? "animate-shake border-l-2 border-destructive pl-3 rounded" : ""} ${isOpticianField ? "border-l-4 border-primary pl-4" : ""}`}
            >
              {useTouchFriendly ? (
                <TouchFriendlyFieldRenderer 
                  question={question} 
                  error={errors[fieldId]} 
                />
              ) : (
                <FormFieldRenderer 
                  question={question} 
                  error={errors[fieldId]} 
                  isOpticianField={isOpticianField}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
