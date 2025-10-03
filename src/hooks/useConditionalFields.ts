
/**
 * This hook analyzes the form template and current values to determine
 * which sections and questions should be visible based on the conditional logic.
 * It now also handles dynamic follow-up questions and the "contains" condition
 * for checkbox fields.
 */

import { useCallback, useEffect, useState } from "react";
import { FormTemplate, FormSection, FormQuestion } from "@/types/anamnesis";

export const useConditionalFields = (
  template: FormTemplate | null,
  values: Record<string, any>,
  isOpticianMode = false
) => {
  const [visibleSections, setVisibleSections] = useState<Array<Array<FormSection>>>([]);
  const [totalSections, setTotalSections] = useState(0);
  
  // Helper function to evaluate if a section or question should be shown based on conditions
  const evaluateCondition = useCallback((condition: any, values: Record<string, any>): boolean => {
    if (!condition) return true;
    
    const { question, equals, contains } = condition;
    
    // If dependent question doesn't exist in values, don't show the item
    if (!(question in values)) {
      return false;
    }
    
    const value = values[question];

    // Handle 'contains' condition for checkboxes and multi-select fields
    if (contains !== undefined) {
      if (Array.isArray(value)) {
        return value.includes(contains);
      }
      // If value is a string, check if it's equal to contains
      return value === contains;
    }
    
    // Handle 'equals' condition
    if (equals !== undefined) {
      // Handle array of possible values
      if (Array.isArray(equals)) {
        return equals.includes(value);
      }
      
      // Handle single value
      return value === equals;
    }
    
    // If no specific condition is provided but the question is specified,
    // show the item if the value is truthy
    return !!value;
  }, []);


  // Filter out any questions that should only be shown in optician mode
  const filterQuestionsByMode = useCallback((questions: FormQuestion[], isOpticianMode: boolean) => {
    return questions.filter(question => {
      // Skip follow-up templates - they should never be rendered directly
      if (question.is_followup_template) return false;

      // If there's no mode restriction, or we're in optician mode and it's marked for opticians, show it
      if (!question.show_in_mode || (isOpticianMode && question.show_in_mode === "optician")) {
        return true;
      }
      
      // Otherwise, filter out questions with mode restrictions
      return false;
    });
  }, []);

  // Update the sections when the template or values change
  useEffect(() => {
    if (!template) {
      setVisibleSections([]);
      setTotalSections(0);
      return;
    }
    
    try {
      
      // Start with all sections from the template
      let allSections = template.sections;
      let visibleSectionsArray: Array<Array<FormSection>> = [];
      
      // Group sections by step, respecting conditions
      let currentStep: FormSection[] = [];
      
      // Process each section, applying conditions
      allSections.forEach((section) => {
        // Apply section visibility condition
        const sectionVisible = evaluateCondition(section.show_if, values);
        
        if (sectionVisible) {
          // Clone the section to modify its questions without mutating the original
          const processedSection = { ...section };
          
          // Filter questions based on their conditions and optician mode
          const visibleQuestions = section.questions.filter(question => {
            // Skip follow-up templates - they're never rendered directly
            if (question.is_followup_template) return false;
            
            // First, check mode restrictions
            const meetsModeCriteria = !question.show_in_mode || 
              (isOpticianMode && question.show_in_mode === "optician");
            
            if (!meetsModeCriteria) return false;
            
            // Then check conditional logic
            return evaluateCondition(question.show_if, values);
          });
          
          // Update the processed section with filtered questions
          processedSection.questions = visibleQuestions;
          
          // Add the section to the current step if it has visible questions
          if (processedSection.questions.length > 0) {
            currentStep.push(processedSection);
            
            // In the future, we could implement multi-step form by checking for a "new_step" flag
            // and creating a new step array when encountered
            
            // For now, we'll create a new step for each section
            visibleSectionsArray.push([...currentStep]);
            currentStep = [];
          }
        }
      });
      
      // Add any remaining sections in the current step
      if (currentStep.length > 0) {
        visibleSectionsArray.push(currentStep);
      }
      
      // Update state with the visible sections and total count
      setVisibleSections(visibleSectionsArray);
      setTotalSections(visibleSectionsArray.length);
      
    } catch (error) {
      console.error("Error in useConditionalFields:", error);
      // In case of error, reset to empty state
      setVisibleSections([]);
      setTotalSections(0);
    }
  }, [template, values, evaluateCondition, isOpticianMode]);
  
  return {
    visibleSections,
    totalSections,
  };
};
