
/**
 * This hook analyzes the form template and current values to determine
 * which sections and questions should be visible based on the conditional logic.
 * It now also handles dynamic follow-up questions and the "contains" condition
 * for checkbox fields.
 */

import { useCallback, useEffect, useState } from "react";
import { FormTemplate, FormSection, FormQuestion, DynamicFollowupQuestion } from "@/types/anamnesis";

export const useConditionalFields = (
  template: FormTemplate | null,
  values: Record<string, any>,
  isOpticianMode = false
) => {
  const [visibleSections, setVisibleSections] = useState<Array<Array<FormSection>>>([]);
  const [totalSections, setTotalSections] = useState(0);
  // Track dynamic follow-up questions that should be rendered
  const [dynamicQuestions, setDynamicQuestions] = useState<Record<string, DynamicFollowupQuestion[]>>({});
  
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

  // Generate dynamic follow-up questions based on checkbox selections
  const generateDynamicFollowupQuestions = useCallback((
    template: FormTemplate,
    values: Record<string, any>
  ) => {
    const dynamicQuestionsMap: Record<string, DynamicFollowupQuestion[]> = {};
    
    template.sections.forEach(section => {
      if (!section.questions) return;
      
      section.questions.forEach(question => {
        // Skip follow-up templates - they'll be instantiated dynamically
        if (question.is_followup_template) return;
        
        // Check if this question has followup questions defined
        if (question.followup_question_ids && question.followup_question_ids.length > 0) {
          const selectedValues = Array.isArray(values[question.id]) 
            ? values[question.id] 
            : (values[question.id] ? [values[question.id]] : []);
          
          // Find all the possible options that might trigger follow-ups
          const optionsWithFollowups = (question.options || [])
            .map(opt => {
              // Convert string options to standard format
              if (typeof opt === 'string') {
                return { value: opt, triggers_followups: false };
              }
              return opt;
            })
            .filter(opt => opt.triggers_followups || opt.value === 'Övrigt');
          
          // Filter to only selected options that trigger follow-ups
          const selectedOptionsWithFollowups = optionsWithFollowups.filter(
            opt => selectedValues.includes(opt.value)
          );
          
          // For each selected option that triggers follow-ups, create dynamic questions
          selectedOptionsWithFollowups.forEach(selectedOpt => {
            // Find the follow-up template questions
            const followupTemplates = question.followup_question_ids?.map(templateId => {
              // Search for the template across all sections
              for (const sect of template.sections) {
                const foundTemplate = sect.questions.find(
                  q => q.id === templateId && q.is_followup_template
                );
                if (foundTemplate) return foundTemplate;
              }
              return null;
            }).filter((template): template is FormQuestion => template !== null);
            
            if (!followupTemplates || followupTemplates.length === 0) return;
            
            // Create dynamic instances of these templates for this specific selected value
            const dynamicInstances: DynamicFollowupQuestion[] = followupTemplates.map(template => {
              const runtimeId = `${template.id}_for_${selectedOpt.value.replace(/\s+/g, '_')}`;
              
              // Create a dynamic question based on the template
              const dynamicQuestion: DynamicFollowupQuestion = {
                ...template,
                parentId: question.id,
                parentValue: selectedOpt.value,
                runtimeId: runtimeId, 
                originalId: template.id,
                // Update the label to be specific to this option if needed
                label: template.label.replace(
                  /\{option\}/g, 
                  selectedOpt.value
                )
              };
              
              // Remove the is_followup_template flag since this is now an actual question
              delete dynamicQuestion.is_followup_template;
              
              return dynamicQuestion;
            });
            
            // Store these dynamic questions by section
            if (!dynamicQuestionsMap[section.section_title]) {
              dynamicQuestionsMap[section.section_title] = [];
            }
            dynamicQuestionsMap[section.section_title] = [
              ...dynamicQuestionsMap[section.section_title],
              ...dynamicInstances
            ];
          });
        }
      });
    });
    
    return dynamicQuestionsMap;
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
      setDynamicQuestions({});
      return;
    }
    
    try {
      // Generate dynamic follow-up questions based on current values
      const dynamicQuestionsMap = generateDynamicFollowupQuestions(template, values);
      setDynamicQuestions(dynamicQuestionsMap);
      
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
          
          // Add dynamic follow-up questions that apply to this section
          if (dynamicQuestionsMap[section.section_title]) {
            // Filter dynamic questions based on their own conditions
            const visibleDynamicQuestions = dynamicQuestionsMap[section.section_title]
              .filter(dynQuestion => evaluateCondition(dynQuestion.show_if, values));
            
            // Add the dynamic questions to the section's questions
            processedSection.questions = [
              ...processedSection.questions,
              ...visibleDynamicQuestions
            ];
          }
          
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
      
      // Log for debugging
      console.log("[useConditionalFields]: Generated dynamic questions:", dynamicQuestionsMap);
      console.log("[useConditionalFields]: Visible sections after processing:", visibleSectionsArray);
      
    } catch (error) {
      console.error("Error in useConditionalFields:", error);
      // In case of error, reset to empty state
      setVisibleSections([]);
      setTotalSections(0);
      setDynamicQuestions({});
    }
  }, [template, values, evaluateCondition, isOpticianMode, generateDynamicFollowupQuestions]);
  
  return {
    visibleSections,
    totalSections,
    dynamicQuestions,
  };
};
