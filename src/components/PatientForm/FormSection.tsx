
/**
 * This component renders a section of the patient anamnesis form.
 * It handles conditional rendering of questions based on the form values
 * and validates required fields.
 */

import React, { useEffect } from "react";
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

  // Debug render cycle of sections
  useEffect(() => {
    console.log(`Rendering section: "${section.section_title}" with ${section.questions.length} questions`);
  }, [section]);

  // Determine if the section should be shown based on its show_if condition
  const shouldShowSection = () => {
    if (!section.show_if) return true;
    
    const { question, equals } = section.show_if;
    const dependentValue = currentValues[question];
    
    let shouldShow = false;
    if (Array.isArray(equals)) {
      shouldShow = equals.includes(dependentValue);
    } else {
      shouldShow = dependentValue === equals;
    }
    
    console.log(`Section "${section.section_title}" visibility check:`, 
      shouldShow ? "VISIBLE" : "HIDDEN", 
      `(depends on ${question}=${JSON.stringify(equals)}, actual value=${dependentValue})`
    );
    
    return shouldShow;
  };

  // If the section has a show_if condition and it's not met, don't render the section
  if (!shouldShowSection()) {
    return null;
  }

  // Generate a section ID for accessibility linking
  const sectionId = `section-${section.section_title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="mb-6" role="region" aria-labelledby={sectionId}>
      <h3 id={sectionId} className="text-lg font-medium mb-4">{section.section_title}</h3>
      <div className="space-y-6">
        {section.questions.map((question) => {
          // Check if the question should be shown based on its own show_if condition
          const shouldShowQuestion = () => {
            if (!question.show_if) return true;
            
            const { question: dependentQuestionId, equals } = question.show_if;
            const dependentValue = currentValues[dependentQuestionId];
            
            let shouldShow = false;
            if (Array.isArray(equals)) {
              shouldShow = equals.includes(dependentValue);
            } else {
              shouldShow = dependentValue === equals;
            }
            
            console.log(`Question "${question.label}" (${question.id}) visibility check:`, 
              shouldShow ? "VISIBLE" : "HIDDEN", 
              `(depends on ${dependentQuestionId}=${JSON.stringify(equals)}, actual value=${dependentValue})`
            );
            
            return shouldShow;
          };

          const isVisible = shouldShowQuestion();
          
          if (!isVisible) {
            return null;
          }

          const hasError = errors[question.id] !== undefined;

          return (
            <div 
              key={question.id} 
              className={hasError ? "animate-shake" : ""}
            >
              <FormFieldRenderer 
                question={question} 
                error={errors[question.id]} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
