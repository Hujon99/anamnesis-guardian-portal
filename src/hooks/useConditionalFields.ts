
/**
 * This hook analyzes the form template and current values to determine
 * which sections and questions should be visible based on the conditional logic.
 * It now also handles dynamic follow-up questions, the "contains" condition
 * for checkbox fields, and advanced conditions (any_answer, section_score).
 */

import { useCallback, useEffect, useState, useMemo } from "react";
import { FormTemplate, FormSection, FormQuestion, DynamicFollowupQuestion, AdvancedCondition } from "@/types/anamnesis";
import { generateRuntimeId } from "@/utils/questionIdUtils";

/**
 * Calculate the total score for a specific section based on current form values.
 * Only considers questions that have scoring enabled.
 */
const calculateSectionScore = (
  section: FormSection,
  values: Record<string, any>
): number => {
  let totalScore = 0;
  
  section.questions.forEach(question => {
    if (question.scoring?.enabled) {
      const answer = values[question.id];
      if (answer !== undefined && answer !== null && answer !== '') {
        const numericValue = parseInt(String(answer), 10);
        if (!isNaN(numericValue)) {
          totalScore += numericValue;
        }
      }
    }
  });
  
  return totalScore;
};

/**
 * Evaluate a single advanced condition against current form values.
 */
const evaluateAdvancedCondition = (
  condition: AdvancedCondition,
  values: Record<string, any>,
  sections: FormSection[]
): boolean => {
  switch (condition.type) {
    case 'answer': {
      // Standard answer-based condition
      if (!condition.question_id) return true;
      const value = values[condition.question_id];
      if (value === undefined) return false;
      
      const targetValues = Array.isArray(condition.values) 
        ? condition.values 
        : [condition.values].filter(Boolean);
      
      if (Array.isArray(value)) {
        return targetValues.some(target => value.includes(target));
      }
      return targetValues.includes(String(value));
    }
    
    case 'any_answer': {
      // Check if ANY question in a section has a specific value
      const targetSectionIndex = condition.section_index;
      if (targetSectionIndex === undefined || !sections[targetSectionIndex]) return false;
      
      const targetSection = sections[targetSectionIndex];
      const targetValues = Array.isArray(condition.any_value) 
        ? condition.any_value 
        : [condition.any_value].filter(Boolean);
      
      // Check all questions in the target section
      for (const question of targetSection.questions) {
        const value = values[question.id];
        if (value === undefined || value === null || value === '') continue;
        
        if (Array.isArray(value)) {
          if (targetValues.some(target => value.includes(target))) {
            return true;
          }
        } else {
          if (targetValues.includes(String(value))) {
            return true;
          }
        }
      }
      return false;
    }
    
    case 'section_score': {
      // Check total score of a section against a threshold
      const targetSectionIndex = condition.target_section_index;
      if (targetSectionIndex === undefined || !sections[targetSectionIndex]) return false;
      if (condition.threshold === undefined) return false;
      
      const targetSection = sections[targetSectionIndex];
      const sectionScore = calculateSectionScore(targetSection, values);
      
      switch (condition.operator) {
        case 'less_than':
          return sectionScore < condition.threshold;
        case 'greater_than':
          return sectionScore > condition.threshold;
        case 'equals':
          return sectionScore === condition.threshold;
        default:
          return false;
      }
    }
    
    default:
      return false;
  }
};

export const useConditionalFields = (
  template: FormTemplate | null,
  values: Record<string, any>,
  isOpticianMode = false
) => {
  const [visibleSections, setVisibleSections] = useState<Array<Array<FormSection>>>([]);
  const [totalSections, setTotalSections] = useState(0);
  
  // Helper function to evaluate if a section or question should be shown based on conditions
  const evaluateCondition = useCallback((
    condition: FormSection['show_if'] | FormQuestion['show_if'],
    values: Record<string, any>,
    allSections: FormSection[] = []
  ): boolean => {
    if (!condition) return true;
    
    // Handle advanced conditions array (new logic)
    if ('conditions' in condition && condition.conditions && condition.conditions.length > 0) {
      const logic = condition.logic || 'or';
      
      if (logic === 'or') {
        // OR logic: return true if ANY condition is met
        return condition.conditions.some(cond => 
          evaluateAdvancedCondition(cond, values, allSections)
        );
      } else {
        // AND logic: return true only if ALL conditions are met
        return condition.conditions.every(cond => 
          evaluateAdvancedCondition(cond, values, allSections)
        );
      }
    }
    
    // Handle legacy question-based condition
    const { question, equals, contains } = condition;
    
    // If no question is specified but there are no advanced conditions, show the item
    if (!question) return true;
    
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
      // If value is an array (checkbox), check if it contains the target value(s)
      if (Array.isArray(value)) {
        if (Array.isArray(equals)) {
          // Both are arrays: check if any of equals values are in value array
          const result = equals.some(eq => value.includes(eq));
          console.log(`[useConditionalFields/evaluateCondition]: Equals check (both arrays): ${result}`);
          return result;
        } else {
          // equals is string, value is array: check if value contains equals
          const result = value.includes(equals);
          console.log(`[useConditionalFields/evaluateCondition]: Equals check (value array, equals string): ${result}`);
          return result;
        }
      }
      
      // value is a single value (radio, dropdown)
      if (Array.isArray(equals)) {
        const result = equals.includes(value);
        console.log(`[useConditionalFields/evaluateCondition]: Equals check (equals array, value string): ${result}`);
        return result;
      }
      
      // Both are single values
      const result = value === equals;
      console.log(`[useConditionalFields/evaluateCondition]: Equals check (both strings): ${result}`);
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
        // Apply section visibility condition (pass all sections for advanced conditions)
        const sectionVisible = evaluateCondition(section.show_if, safeValues, allSections);
        
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
            
            // Then check conditional logic (pass all sections for potential advanced conditions)
            return evaluateCondition(question.show_if, safeValues, allSections);
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
