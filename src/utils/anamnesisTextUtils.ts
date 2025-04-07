
/**
 * This utility file contains functions for optimizing anamnesis data into text format.
 * It helps prepare patient form data for AI summarization by converting complex JSON structures
 * into a more token-efficient plain text representation.
 */

import { FormTemplate } from "@/types/anamnesis";

/**
 * Creates an optimized text representation of anamnesis data by combining
 * questions from the form template with answers from the patient submission.
 * 
 * @param formTemplateJSON - The original form template with questions structure
 * @param formattedAnswersJSON - The patient's answered questions
 * @returns A plain text string with question-answer pairs for efficient token usage
 */
export const createOptimizedPromptInput = (
  formTemplateJSON: FormTemplate,
  formattedAnswersJSON: any
): string => {
  // Initialize output text
  let outputText = "Patientens anamnesinformation:\n";

  // Create a map of question IDs to their labels for quick lookup
  const questionLabelMap = new Map<string, string>();
  
  // Populate the map from the form template
  if (formTemplateJSON && formTemplateJSON.sections) {
    formTemplateJSON.sections.forEach(section => {
      if (section.questions) {
        section.questions.forEach(question => {
          questionLabelMap.set(question.id, question.label);
        });
      }
    });
  }

  // Process all answered sections
  if (formattedAnswersJSON && formattedAnswersJSON.answeredSections) {
    formattedAnswersJSON.answeredSections.forEach(section => {
      if (section.responses && section.responses.length > 0) {
        // Add section title if available
        if (section.section_title) {
          outputText += `\n-- ${section.section_title} --\n`;
        }

        // Process each response
        section.responses.forEach(response => {
          const { id, answer } = response;
          
          // Get the question label from our map
          const label = questionLabelMap.get(id) || id; // Fallback to ID if label not found
          
          // Format and add the question-answer pair
          const formattedAnswer = answer !== null && answer !== undefined 
            ? String(answer) 
            : "Inget svar";
          
          outputText += `${label}: ${formattedAnswer}\n`;
        });
      }
    });
  }

  return outputText;
};

/**
 * Extracts the formatted answers structure from various possible answer formats
 * in the anamnesis entry. Handles different nesting levels of the data.
 * 
 * @param answers - The answers object from an anamnesis entry
 * @returns The standardized formatted answers object or undefined if not found
 */
export const extractFormattedAnswers = (answers: Record<string, any>): any | undefined => {
  // Case 1: New format with double nesting: answers.formattedAnswers.formattedAnswers
  if (
    answers && 
    typeof answers === 'object' && 
    'formattedAnswers' in answers && 
    answers.formattedAnswers && 
    typeof answers.formattedAnswers === 'object' &&
    'formattedAnswers' in answers.formattedAnswers &&
    answers.formattedAnswers.formattedAnswers
  ) {
    return answers.formattedAnswers.formattedAnswers;
  }
  
  // Case 2: Single nesting: answers.formattedAnswers
  if (
    answers && 
    typeof answers === 'object' && 
    'formattedAnswers' in answers && 
    answers.formattedAnswers && 
    typeof answers.formattedAnswers === 'object' &&
    'answeredSections' in answers.formattedAnswers
  ) {
    return answers.formattedAnswers;
  }
  
  // Case 3: Direct structure: answers.answeredSections
  if (
    answers && 
    typeof answers === 'object' && 
    'answeredSections' in answers
  ) {
    return answers;
  }
  
  // No structured answers found
  return undefined;
};
