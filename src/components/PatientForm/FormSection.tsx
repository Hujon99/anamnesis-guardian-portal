
/**
 * This component renders a section of the patient anamnesis form.
 * It handles conditional rendering of questions based on form values
 * and validates required fields. Now also supports dynamic follow-up questions
 * and complex condition checks for checkbox fields.
 */

import React from "react";
import { FormSection as FormSectionType, FormQuestion, DynamicFollowupQuestion } from "@/types/anamnesis";
import { FormFieldRenderer, FormFieldRendererProps } from "./FormFieldRenderer";
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
  
  // Log errors for debugging
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log(`[FormSection] Validation errors for section "${section.section_title}":`, errors);
    }
  }, [errors, section.section_title]);

  // Determine if the section should be shown based on its show_if condition
  const shouldShowSection = () => {
    if (!section.show_if) return true;
    
    const { question, equals, contains } = section.show_if;
    const dependentValue = currentValues[question];
    
    // Handle "contains" condition for checkbox array values
    if (contains !== undefined) {
      if (Array.isArray(dependentValue)) {
        return dependentValue.includes(contains);
      }
      // For non-array values, check equality
      return dependentValue === contains;
    }
    
    // Handle "equals" condition (existing logic)
    if (equals !== undefined) {
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
      return dependentValue === equals;
    }
    
    // If only the question is provided with no condition, show if the value is truthy
    return !!dependentValue;
  };

  // If the section has a show_if condition and it's not met, don't render the section
  if (!shouldShowSection()) {
    return null;
  }

  // Generate a section ID for accessibility linking
  const sectionId = `section-${section.section_title.toLowerCase().replace(/\s+/g, '-')}`;

  // Enhanced function to check if a question should be shown
  const shouldShowQuestion = (question: FormQuestion | DynamicFollowupQuestion): boolean => {
    // Skip follow-up templates - they should never be shown directly
    if ((question as FormQuestion).is_followup_template) {
      return false;
    }
    
    // Get the field ID (could be runtime ID for dynamic questions)
    const fieldId = (question as DynamicFollowupQuestion).runtimeId || question.id;
    
    // For dynamic questions, always show them (their parent condition was already checked)
    if ((question as DynamicFollowupQuestion).runtimeId) {
      return true;
    }
    
    // Check question's own show_if condition
    if (!question.show_if) return true;
    
    const { question: dependentQuestionId, equals, contains } = question.show_if;
    const dependentValue = currentValues[dependentQuestionId];
    
    // Handle "contains" condition for checkbox array values
    if (contains !== undefined) {
      if (Array.isArray(dependentValue)) {
        return dependentValue.includes(contains);
      }
      // For non-array values, check equality
      return dependentValue === contains;
    }
    
    // Handle "equals" condition (existing logic)
    if (equals !== undefined) {
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
      return dependentValue === equals;
    }
    
    // If only the question is provided with no condition, show if the value is truthy
    return !!dependentValue;
  };

  // Get all dynamic follow-up questions for this section
  const getDynamicQuestionsForSection = () => {
    const dynamicQuestions: DynamicFollowupQuestion[] = [];
    
    // Look through all form values to find dynamic questions
    Object.keys(currentValues).forEach(key => {
      // Only process keys that match the dynamic question pattern
      if (key.includes('_for_')) {
        const [originalId] = key.split('_for_');
        
        // Check if any question in this section has this ID
        let parentQuestion = section.questions.find(q => q.id === originalId);
        
        if (parentQuestion) {
          // This dynamic question belongs to this section
          const parentValue = key.split('_for_')[1].replace(/_/g, ' ');
          const parentSelected = Array.isArray(currentValues[originalId]) 
            ? currentValues[originalId].includes(parentValue) 
            : currentValues[originalId] === parentValue;
          
          if (parentSelected) {
            // Find the template for this follow-up question
            const template = section.questions.find(
              q => q.is_followup_template && 
              parentQuestion?.followup_question_ids?.includes(q.id)
            );
            
            if (template) {
              // Create a dynamic question instance
              const dynamicQuestion: DynamicFollowupQuestion = {
                ...template,
                parentId: originalId,
                parentValue: parentValue,
                runtimeId: key,
                originalId: template.id,
                label: template.label.replace(/\{option\}/g, parentValue)
              };
              
              // Remove the is_followup_template flag
              delete (dynamicQuestion as any).is_followup_template;
              
              dynamicQuestions.push(dynamicQuestion);
            }
          }
        }
      }
    });
    
    return dynamicQuestions;
  };

  // Filter questions based on optician mode and visibility conditions
  const visibleQuestions = section.questions.filter(question => {
    // Skip follow-up templates - they should never be shown directly
    if (question.is_followup_template) {
      return false;
    }
    
    // If it's a regular question with no mode restriction, check its visibility
    if (!question.show_in_mode) {
      return shouldShowQuestion(question);
    }
    
    // If it's an optician-only question, only show it in optician mode
    if (question.show_in_mode === "optician") {
      return isOpticianMode && shouldShowQuestion(question);
    }
    
    // For any other mode restrictions, use default logic
    return shouldShowQuestion(question);
  });
  
  // Get dynamic follow-up questions for this section
  const dynamicQuestions = getDynamicQuestionsForSection();
  
  // Combine regular and dynamic questions
  const allVisibleQuestions = [...visibleQuestions, ...dynamicQuestions];

  return (
    <div className="mb-6" role="region" aria-labelledby={sectionId}>
      <h3 id={sectionId} className="text-lg font-medium mb-4">{section.section_title}</h3>
      <div className="space-y-6">
        {allVisibleQuestions.map((question) => {
          // Get the field ID (could be runtime ID for dynamic questions)
          const fieldId = (question as DynamicFollowupQuestion).runtimeId || question.id;
          
          // Get validation errors using the correct field ID
          const hasError = errors[fieldId] !== undefined;
          
          // Log when we find an error
          if (hasError) {
            console.log(`[FormSection] Field "${fieldId}" has error:`, errors[fieldId]);
          }

          // Special styling for optician-specific fields
          const isOpticianField = question.show_in_mode === "optician";

          // Special styling for dynamic follow-up questions
          const isDynamicQuestion = 'runtimeId' in question;

          return (
            <div 
              key={fieldId} 
              className={`${hasError ? "animate-shake border-l-2 border-destructive pl-3 rounded" : ""} ${isOpticianField ? "border-l-4 border-primary pl-4" : ""}`}
            >
              <FormFieldRenderer 
                question={question} 
                error={errors[fieldId]} 
                isOpticianField={isOpticianField}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
