
/**
 * This hook analyzes the form template and current values to determine
 * which sections and questions should be visible based on the conditional logic.
 * It now also handles dynamic follow-up questions and the "contains" condition
 * for checkbox fields.
 */

import { useCallback, useEffect, useState, useMemo } from "react";
import { FormTemplate, FormSection, FormQuestion, DynamicFollowupQuestion } from "@/types/anamnesis";
import { generateRuntimeId } from "@/utils/questionIdUtils";

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
      console.log(`[useConditionalFields/evaluateCondition]: Question "${question}" not found in values, hiding dependent field`);
      return false;
    }
    
    const value = values[question];
    console.log(`[useConditionalFields/evaluateCondition]: Evaluating condition for question "${question}", value:`, value, 'condition:', { equals, contains });

    // Handle 'contains' condition for checkboxes and multi-select fields
    if (contains !== undefined) {
      if (Array.isArray(value)) {
        const result = value.includes(contains);
        console.log(`[useConditionalFields/evaluateCondition]: Contains check (array): ${result}`);
        return result;
      }
      // If value is a string, check if it's equal to contains
      const result = value === contains;
      console.log(`[useConditionalFields/evaluateCondition]: Contains check (string): ${result}`);
      return result;
    }
    
    // Handle 'equals' condition
    if (equals !== undefined) {
      // Handle array of possible values
      if (Array.isArray(equals)) {
        const result = equals.includes(value);
        console.log(`[useConditionalFields/evaluateCondition]: Equals check (array): ${result}`);
        return result;
      }
      
      // Handle single value
      const result = value === equals;
      console.log(`[useConditionalFields/evaluateCondition]: Equals check (single): ${result}`);
      return result;
    }
    
    // If no specific condition is provided but the question is specified,
    // show the item if the value is truthy
    const result = !!value;
    console.log(`[useConditionalFields/evaluateCondition]: Truthy check: ${result}`);
    return result;
  }, []);


  // Generate dynamic follow-up questions for a section based on current values
  const generateDynamicQuestions = useCallback((section: FormSection, values: Record<string, any>): DynamicFollowupQuestion[] => {
    const dynamicQuestions: DynamicFollowupQuestion[] = [];
    
    console.log(`[useConditionalFields/generateDynamicQuestions]: Processing section "${section.section_title}"`);
    
    section.questions.forEach(parentQuestion => {
      if (parentQuestion.followup_question_ids && parentQuestion.followup_question_ids.length > 0) {
        const parentValue = values[parentQuestion.id];
        console.log(`[useConditionalFields/generateDynamicQuestions]: Parent question "${parentQuestion.id}" has value:`, parentValue);
        
        // Guard against undefined/null values
        if (parentValue === undefined || parentValue === null) {
          console.log(`[useConditionalFields/generateDynamicQuestions]: Parent value is undefined/null, skipping follow-ups`);
          return;
        }
        
        // Handle both checkbox (array) and single-value responses
        const selectedValues = Array.isArray(parentValue) ? parentValue : (parentValue ? [parentValue] : []);
        console.log(`[useConditionalFields/generateDynamicQuestions]: Selected values for follow-ups:`, selectedValues);
        
        selectedValues.forEach((value: string) => {
          // For each selected value, create instances of all follow-up questions
          parentQuestion.followup_question_ids?.forEach(followupId => {
            const template = section.questions.find(
              q => q.id === followupId && q.is_followup_template
            );
            
            if (template) {
              // Create runtime ID using first word only
              const runtimeId = generateRuntimeId(followupId, value);
              console.log(`[useConditionalFields/generateDynamicQuestions]: Creating dynamic question with runtimeId: ${runtimeId}`);
              
              // Create a dynamic question instance
              const dynamicQuestion: DynamicFollowupQuestion = {
                ...template,
                parentId: parentQuestion.id,
                parentValue: value,
                runtimeId: runtimeId,
                originalId: template.id,
                label: template.label.replace(/\{option\}/g, value)
              };
              
              // Remove the is_followup_template flag
              delete (dynamicQuestion as any).is_followup_template;
              
              dynamicQuestions.push(dynamicQuestion);
            } else {
              console.warn(`[useConditionalFields/generateDynamicQuestions]: Follow-up template not found for id: ${followupId}`);
            }
          });
        });
      }
    });
    
    console.log(`[useConditionalFields/generateDynamicQuestions]: Generated ${dynamicQuestions.length} dynamic questions for section "${section.section_title}"`);
    return dynamicQuestions;
  }, []);

  // Track values directly (no JSON.stringify to avoid timing issues)
  // This ensures we re-evaluate immediately when values change
  // Guard against undefined values
  const safeValues = values || {};

  // Update the sections when the template or values change
  useEffect(() => {
    console.log('[useConditionalFields]: Re-evaluating conditional logic with values:', safeValues);
    
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
        const sectionVisible = evaluateCondition(section.show_if, safeValues);
        
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
            return evaluateCondition(question.show_if, safeValues);
          });
          
          // Generate dynamic follow-up questions for this section
          const dynamicQuestions = generateDynamicQuestions(section, safeValues);
          
          // Combine regular and dynamic questions
          const allQuestions = [...visibleQuestions, ...dynamicQuestions];
          
          // Update the processed section with all questions (regular + dynamic)
          processedSection.questions = allQuestions;
          
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
  }, [template, values, evaluateCondition, isOpticianMode, generateDynamicQuestions]);
  
  return {
    visibleSections,
    totalSections,
  };
};
