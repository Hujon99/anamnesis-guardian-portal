/**
 * This utility file contains functions to process and format form submissions.
 * It ensures that all relevant answers from dynamic forms are saved in a 
 * consistent structure based on the form template that was used, including
 * conditional and follow-up questions.
 */

import { FormTemplate, FormSection, FormQuestion } from "@/types/anamnesis";

/**
 * Interface for the structured answer format
 */
export interface FormattedAnswer {
  formTitle: string;
  submissionTimestamp: string;
  answeredSections: {
    section_title: string;
    responses: {
      id: string;
      answer: any;
    }[];
  }[];
}

/**
 * Processes form answers based on the template structure and user inputs
 * Includes all relevant questions that were shown to the user based on conditional logic
 * 
 * @param formTemplate - The JSON template that defines the form structure
 * @param userInputs - The user's answers mapped to question IDs
 * @returns A formatted answer object containing only relevant answered questions
 */
export const processFormAnswers = (
  formTemplate: FormTemplate,
  userInputs: Record<string, any>
): FormattedAnswer => {
  // Initialize the structured answer object
  const formattedAnswer: FormattedAnswer = {
    formTitle: formTemplate.title,
    submissionTimestamp: new Date().toISOString(),
    answeredSections: []
  };

  // Create a map to track which questions should be included based on conditional logic
  const visibleQuestionIds = new Set<string>();
  
  // First pass: identify all questions that should be visible based on conditional logic
  const identifyVisibleQuestions = () => {
    // Helper function to evaluate show_if conditions
    const evaluateCondition = (
      condition: { question: string; equals: string | string[] } | undefined,
      inputs: Record<string, any>
    ): boolean => {
      if (!condition) return true;
  
      const { question, equals } = condition;
      const dependentValue = inputs[question];
  
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
  
      return dependentValue === equals;
    };
    
    // Process all sections and their questions recursively to account for nested conditions
    const processQuestionsRecursively = () => {
      let hasChanges = false;
      
      formTemplate.sections.forEach(section => {
        // Check if section should be shown
        const sectionShouldBeShown = evaluateCondition(section.show_if, userInputs);
        
        if (sectionShouldBeShown) {
          section.questions.forEach(question => {
            // If this question is already marked as visible, skip processing
            if (visibleQuestionIds.has(question.id)) {
              return;
            }
            
            // Check if question should be shown based on its condition
            const questionShouldBeShown = evaluateCondition(question.show_if, userInputs);
            
            if (questionShouldBeShown) {
              visibleQuestionIds.add(question.id);
              hasChanges = true;
              
              // Also check for special cases like "Other" fields
              if (
                (question.type === 'radio' || question.type === 'dropdown') &&
                question.options
              ) {
                const value = userInputs[question.id];
                if (value === 'Övrigt' || value === 'Annat' || value === 'Other') {
                  const suffixes = ['_other', '_övrigt', '_annat'];
                  suffixes.forEach(suffix => {
                    const otherFieldId = `${question.id}${suffix}`;
                    if (otherFieldId in userInputs) {
                      visibleQuestionIds.add(otherFieldId);
                    }
                  });
                }
              }
            }
          });
        }
      });
      
      return hasChanges;
    };
    
    // Keep processing until no new visible questions are found
    // This handles dependencies between conditional questions
    let iterations = 0;
    let maxIterations = 10; // Prevent infinite loops, adjust if needed
    
    while (processQuestionsRecursively() && iterations < maxIterations) {
      iterations++;
    }
    
    console.log(`Identified ${visibleQuestionIds.size} visible questions after ${iterations} iterations`);
  };
  
  // Call the function to identify all visible questions
  identifyVisibleQuestions();
  
  // Second pass: build the formatted answer structure
  formTemplate.sections.forEach(section => {
    // Skip sections that shouldn't be shown based on conditions
    if (section.show_if) {
      const { question, equals } = section.show_if;
      const dependentValue = userInputs[question];
      
      let sectionShouldBeShown = false;
      if (Array.isArray(equals)) {
        sectionShouldBeShown = equals.includes(dependentValue);
      } else {
        sectionShouldBeShown = dependentValue === equals;
      }
      
      if (!sectionShouldBeShown) {
        return;
      }
    }

    // Create a new section for the formatted answer
    const formattedSection = {
      section_title: section.section_title,
      responses: []
    };

    // Process each question in the section, but only include those we identified as visible
    section.questions.forEach(question => {
      // Only include questions that were determined to be visible
      if (!visibleQuestionIds.has(question.id)) {
        return;
      }

      const userAnswer = userInputs[question.id];

      // Skip if question wasn't answered (undefined, null, or empty string)
      // Note: we include false and 0 as valid answers
      if (
        userAnswer === undefined || 
        userAnswer === null || 
        (typeof userAnswer === 'string' && userAnswer.trim() === '')
      ) {
        return;
      }

      // Add the answer to the formatted section
      formattedSection.responses.push({
        id: question.id,
        answer: userAnswer
      });

      // Add any associated "Other" field answers
      if (
        (question.type === 'radio' || question.type === 'dropdown') &&
        question.options && 
        (
          (question.options.includes('Övrigt') && userAnswer === 'Övrigt') ||
          (question.options.includes('Annat') && userAnswer === 'Annat') ||
          (question.options.includes('Other') && userAnswer === 'Other')
        )
      ) {
        const possibleOtherFieldSuffixes = ['_other', '_övrigt', '_annat'];
        const baseId = question.id;
        
        for (const suffix of possibleOtherFieldSuffixes) {
          const otherFieldId = `${baseId}${suffix}`;
          if (visibleQuestionIds.has(otherFieldId) && otherFieldId in userInputs && userInputs[otherFieldId]) {
            formattedSection.responses.push({
              id: otherFieldId,
              answer: userInputs[otherFieldId]
            });
            break; // Found and added the "other" field, no need to check further
          }
        }
      }
    });

    // Only include sections that have responses
    if (formattedSection.responses.length > 0) {
      formattedAnswer.answeredSections.push(formattedSection);
    }
  });

  // Log the complete set of answers for debugging
  console.log(`Final form has ${formattedAnswer.answeredSections.length} sections with answers`);
  console.log(`Total answered questions: ${formattedAnswer.answeredSections.reduce((sum, section) => sum + section.responses.length, 0)}`);
  
  return formattedAnswer;
};

/**
 * Prepares form answers for submission to the API
 * This combines the user inputs with additional metadata
 * 
 * @param formTemplate - The form template used for the submission
 * @param userInputs - The raw user inputs
 * @returns An object ready for API submission
 */
export const prepareFormSubmission = (
  formTemplate: FormTemplate,
  userInputs: Record<string, any>
): Record<string, any> => {
  // Process the answers into the structured format
  const formattedAnswers = processFormAnswers(formTemplate, userInputs);
  
  // Return an object structure suitable for API submission
  return {
    // Include the formatted answers 
    formattedAnswers,
    
    // Also include the raw answers for backward compatibility
    rawAnswers: { ...userInputs },
    
    // Add metadata
    metadata: {
      formTemplateId: formTemplate.title,
      submittedAt: formattedAnswers.submissionTimestamp,
      version: "1.0"
    }
  };
};
