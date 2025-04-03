
/**
 * This component renders a section of the patient anamnesis form.
 * It handles conditional rendering of questions based on the form values
 * and validates required fields.
 */

import React from "react";
import { FormSection as FormSectionType, FormQuestion } from "@/types/anamnesis";
import { FormFieldRenderer } from "./FormFieldRenderer";
import { useFormContext } from "react-hook-form";

interface FormSectionProps {
  section: FormSectionType;
  currentValues: Record<string, any>;
}

export const FormSection: React.FC<FormSectionProps> = ({ 
  section, 
  currentValues 
}) => {
  const { formState } = useFormContext();
  const { errors } = formState;

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

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-4">{section.section_title}</h3>
      <div className="space-y-6">
        {section.questions.map((question) => {
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

          return (
            <FormFieldRenderer 
              key={question.id} 
              question={question} 
              error={errors[question.id]} 
            />
          );
        })}
      </div>
    </div>
  );
};
