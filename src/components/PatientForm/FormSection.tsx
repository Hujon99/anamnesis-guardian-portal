
/**
 * This component renders a section of the patient anamnesis form.
 * It handles conditional rendering of questions based on the form values
 * and validates required fields.
 */

import React from "react";
import { FormSection as FormSectionType, FormQuestion } from "@/types/anamnesis";
import { FormFieldRenderer } from "./FormFieldRenderer";
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
  
  // Get isOpticianMode from our custom form context
  const { isOpticianMode } = useFormContext();

  // Determine if the section should be shown based on its show_if condition
  const shouldShowSection = () => {
    if (!section.show_if) return true;
    
    const { question, equals } = section.show_if;
    const dependentValue = currentValues[question];
    
    if (Array.isArray(equals)) {
      return equals.includes(dependentValue);
    }
    
    return dependentValue === equals;
  };

  // If the section has a show_if condition and it's not met, don't render the section
  if (!shouldShowSection()) {
    return null;
  }

  // Generate a section ID for accessibility linking
  const sectionId = `section-${section.section_title.toLowerCase().replace(/\s+/g, '-')}`;

  // Filter questions based on optician mode
  const visibleQuestions = section.questions.filter(question => {
    // If it's a regular question with no mode restriction, show it
    if (!question.show_in_mode) {
      return true;
    }
    
    // If it's an optician-only question, only show it in optician mode
    if (question.show_in_mode === "optician") {
      return isOpticianMode;
    }
    
    // For any other mode restrictions, use default logic
    return true;
  });

  return (
    <div className="mb-6" role="region" aria-labelledby={sectionId}>
      <h3 id={sectionId} className="text-lg font-medium mb-4">{section.section_title}</h3>
      <div className="space-y-6">
        {visibleQuestions.map((question) => {
          // Check if the question should be shown based on its own show_if condition
          const shouldShowQuestion = () => {
            if (!question.show_if) return true;
            
            const { question: dependentQuestionId, equals } = question.show_if;
            const dependentValue = currentValues[dependentQuestionId];
            
            if (Array.isArray(equals)) {
              return equals.includes(dependentValue);
            }
            
            return dependentValue === equals;
          };

          if (!shouldShowQuestion()) {
            return null;
          }

          const hasError = errors[question.id] !== undefined;

          // Special styling for optician-specific fields
          const isOpticianField = question.show_in_mode === "optician";

          return (
            <div 
              key={question.id} 
              className={`${hasError ? "animate-shake" : ""} ${isOpticianField ? "border-l-4 border-primary pl-4" : ""}`}
            >
              <FormFieldRenderer 
                question={question} 
                error={errors[question.id]} 
                isOpticianField={isOpticianField}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
