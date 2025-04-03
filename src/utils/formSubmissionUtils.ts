
/**
 * This utility file contains functions to process and format form submissions.
 * It ensures that only relevant answers from dynamic forms are saved in a 
 * consistent structure based on the form template that was used.
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
 * Only includes sections and questions that were shown to the user and answered
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

  // Function to evaluate show_if conditions
  const evaluateCondition = (
    condition: { question: string; equals: string | string[] } | undefined
  ): boolean => {
    if (!condition) return true;

    const { question, equals } = condition;
    const dependentValue = userInputs[question];

    if (Array.isArray(equals)) {
      return equals.includes(dependentValue);
    }

    return dependentValue === equals;
  };

  // Process each section in the template
  formTemplate.sections.forEach(section => {
    // Skip sections that shouldn't be shown based on conditions
    if (!evaluateCondition(section.show_if)) {
      return;
    }

    // Create a new section for the formatted answer
    const formattedSection = {
      section_title: section.section_title,
      responses: []
    };

    // Process each question in the section
    section.questions.forEach(question => {
      // Skip questions that shouldn't be shown based on conditions
      if (!evaluateCondition(question.show_if)) {
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

      // Handle "Other" option for radio buttons and dropdowns
      if (
        (question.type === 'radio' || question.type === 'dropdown') &&
        question.options && 
        question.options.includes('Övrigt') &&
        userAnswer === 'Övrigt'
      ) {
        // Look for the associated "other" text input (usually has _other or _övrigt suffix)
        const otherFieldId = `${question.id}_other`;
        const alternativeOtherFieldId = `${question.id}_övrigt`;
        
        const otherAnswer = userInputs[otherFieldId] || userInputs[alternativeOtherFieldId];
        
        if (otherAnswer) {
          formattedSection.responses.push({
            id: otherFieldId in userInputs ? otherFieldId : alternativeOtherFieldId,
            answer: otherAnswer
          });
        }
      }
    });

    // Only include sections that have responses
    if (formattedSection.responses.length > 0) {
      formattedAnswer.answeredSections.push(formattedSection);
    }
  });

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
