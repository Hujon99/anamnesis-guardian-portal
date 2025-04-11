
/**
 * This utility file contains functions to process and format form submissions.
 * It ensures that only relevant answers from dynamic forms are saved in a 
 * consistent structure based on the form template that was used.
 * Enhanced to handle checkbox arrays and dynamic follow-up questions.
 */

import { FormTemplate, FormQuestion, DynamicFollowupQuestion } from "@/types/anamnesis";

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
  isOpticianSubmission?: boolean;
}

/**
 * Helper function to get the original question ID from a runtime ID
 * For example: "operation_type_for_Grå_starr" -> "operation_type"
 */
const getOriginalQuestionId = (runtimeId: string): string => {
  if (runtimeId.includes('_for_')) {
    return runtimeId.split('_for_')[0];
  }
  return runtimeId;
};

/**
 * Helper function to get the parent value from a runtime ID
 * For example: "operation_type_for_Grå_starr" -> "Grå starr"
 */
const getParentValueFromRuntimeId = (runtimeId: string): string => {
  if (runtimeId.includes('_for_')) {
    return runtimeId.split('_for_')[1].replace(/_/g, ' ');
  }
  return '';
};

/**
 * Groups dynamic follow-up questions by their parent questions
 */
const groupDynamicQuestions = (
  userInputs: Record<string, any>
): Record<string, Record<string, any>> => {
  const dynamicQuestions: Record<string, Record<string, any>> = {};
  
  // Identify dynamic follow-up questions (those with _for_ in their ID)
  Object.keys(userInputs).forEach(key => {
    if (key.includes('_for_')) {
      const originalId = getOriginalQuestionId(key);
      const parentValue = getParentValueFromRuntimeId(key);
      
      if (!dynamicQuestions[originalId]) {
        dynamicQuestions[originalId] = {};
      }
      
      dynamicQuestions[originalId][parentValue] = userInputs[key];
    }
  });
  
  return dynamicQuestions;
};

/**
 * Prepares form answers for submission to the API.
 * This combines the user inputs with additional metadata.
 * 
 * @param formTemplate - The form template used for the submission
 * @param userInputs - The raw user inputs
 * @param formattedAnswers - Pre-processed formatted answers from useFormSubmissionState
 * @param isOpticianMode - Whether this submission is from an optician
 * @returns An object ready for API submission
 */
export const prepareFormSubmission = (
  formTemplate: FormTemplate,
  userInputs: Record<string, any>,
  formattedAnswers?: any,
  isOpticianMode?: boolean
): Record<string, any> => {
  console.log("[formSubmissionUtils/prepareFormSubmission]: Called with isOpticianMode:", isOpticianMode);
  
  // Process the formatted answers if provided
  let processedAnswers = formattedAnswers;
  
  // If we're in optician mode, make sure to mark it in the formatted answers
  if (isOpticianMode && processedAnswers) {
    // Clone the formatted answers to avoid mutation
    processedAnswers = { ...formattedAnswers };
    
    // Mark this as an optician submission
    if (processedAnswers.formattedAnswers) {
      processedAnswers.formattedAnswers.isOpticianSubmission = true;
      console.log("[formSubmissionUtils/prepareFormSubmission]: Marked formattedAnswers.formattedAnswers as optician submission");
    } else if (processedAnswers) {
      processedAnswers.isOpticianSubmission = true;
      console.log("[formSubmissionUtils/prepareFormSubmission]: Marked processedAnswers as optician submission");
    }
  }
  
  // If formattedAnswers is provided, use it directly (new approach)
  if (processedAnswers) {
    console.log("[formSubmissionUtils/prepareFormSubmission]: Using pre-processed formattedAnswers");
    
    // Return an object structure suitable for API submission
    return {
      // Include the formatted answers
      ...processedAnswers,
      
      // Also include the raw answers for backward compatibility
      rawAnswers: { ...userInputs },
      
      // Add metadata for optician submissions if applicable
      ...(isOpticianMode && {
        _metadata: {
          submittedBy: 'optician',
          autoSetStatus: 'ready'
        }
      }),
      
      // Add general metadata
      metadata: {
        formTemplateId: formTemplate.title,
        submittedAt: processedAnswers.formattedAnswers?.submissionTimestamp || new Date().toISOString(),
        version: isOpticianMode ? "2.1" : "2.0"
      }
    };
  } else {
    console.log("[formSubmissionUtils/prepareFormSubmission]: Using enhanced processFormAnswers approach");
    
    // Use enhanced form processing for the new template structure
    const formattedAnswer = enhancedProcessFormAnswers(formTemplate, userInputs);
    
    return {
      // Include the formatted answers 
      formattedAnswers: formattedAnswer,
      
      // Also include the raw answers for backward compatibility
      rawAnswers: { ...userInputs },
      
      // Add metadata for optician submissions if applicable
      ...(isOpticianMode && {
        _metadata: {
          submittedBy: 'optician',
          autoSetStatus: 'ready'
        }
      }),
      
      // Add metadata
      metadata: {
        formTemplateId: formTemplate.title,
        submittedAt: new Date().toISOString(),
        version: isOpticianMode ? "2.1" : "2.0"
      }
    };
  }
};

/**
 * Enhanced version that handles the new template structure with checkbox arrays
 * and dynamic follow-up questions
 */
export const enhancedProcessFormAnswers = (
  formTemplate: FormTemplate,
  userInputs: Record<string, any>
): FormattedAnswer => {
  // Initialize the structured answer object
  const formattedAnswer: FormattedAnswer = {
    formTitle: formTemplate.title,
    submissionTimestamp: new Date().toISOString(),
    answeredSections: []
  };

  // Find dynamic follow-up questions and group them by their parent
  const dynamicQuestionGroups = groupDynamicQuestions(userInputs);
  
  console.log("[formSubmissionUtils/enhancedProcessFormAnswers]: Dynamic question groups:", dynamicQuestionGroups);

  // Function to evaluate show_if conditions
  const evaluateCondition = (
    condition: { question: string; equals?: string | string[]; contains?: string; } | undefined,
    values: Record<string, any>
  ): boolean => {
    if (!condition) return true;

    const { question, equals, contains } = condition;
    const dependentValue = values[question];

    if (contains !== undefined) {
      if (Array.isArray(dependentValue)) {
        return dependentValue.includes(contains);
      }
      return dependentValue === contains;
    }

    if (equals !== undefined) {
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
      return dependentValue === equals;
    }

    return !!dependentValue;
  };

  // Process each section in the template
  formTemplate.sections.forEach(section => {
    // Create a new section for the formatted answer
    const formattedSection = {
      section_title: section.section_title,
      responses: []
    };

    // Process each question in the section
    section.questions.forEach(question => {
      // Skip follow-up templates - they'll be processed as dynamic instances
      if (question.is_followup_template) return;
      
      // Skip questions that shouldn't be shown based on conditions
      if (!evaluateCondition(question.show_if, userInputs)) {
        return;
      }

      const userAnswer = userInputs[question.id];

      // Skip if question wasn't answered (undefined, null, or empty string)
      // But include false, 0, and empty arrays as valid answers
      if (
        userAnswer === undefined || 
        userAnswer === null || 
        (typeof userAnswer === 'string' && userAnswer.trim() === '') ||
        (Array.isArray(userAnswer) && userAnswer.length === 0)
      ) {
        return;
      }

      // Add the answer to the formatted section
      formattedSection.responses.push({
        id: question.id,
        answer: userAnswer
      });

      // Handle dynamic follow-up questions for this parent question
      if (dynamicQuestionGroups[question.id]) {
        const followupGroup = dynamicQuestionGroups[question.id];
        
        // For each selected value that triggered follow-ups
        Object.entries(followupGroup).forEach(([parentValue, followupAnswer]) => {
          // Skip if the follow-up wasn't answered
          if (
            followupAnswer === undefined || 
            followupAnswer === null || 
            (typeof followupAnswer === 'string' && followupAnswer.trim() === '') ||
            (Array.isArray(followupAnswer) && followupAnswer.length === 0)
          ) {
            return;
          }
          
          // Identify which template this is from
          const templateId = getOriginalQuestionId(
            Object.keys(userInputs).find(key => 
              key.includes(`_for_${parentValue.replace(/\s+/g, '_')}`)
            ) || ''
          );
          
          // Add a structured response for the follow-up
          formattedSection.responses.push({
            id: `${templateId}_for_${parentValue.replace(/\s+/g, '_')}`,
            answer: {
              parent_question: question.id,
              parent_value: parentValue,
              value: followupAnswer
            }
          });
        });
      }

      // Handle "Övrigt" option for radio buttons, dropdowns, and checkboxes
      if (
        (question.type === 'radio' || question.type === 'dropdown') &&
        question.options && 
        typeof userAnswer === 'string' &&
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
      } else if (
        question.type === 'checkbox' &&
        Array.isArray(userAnswer) &&
        userAnswer.includes('Övrigt')
      ) {
        // For checkbox arrays with "Övrigt" selected
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
 * @deprecated Use enhancedProcessFormAnswers instead
 * This function is kept for backward compatibility.
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
    condition: { question: string; equals?: string | string[]; contains?: string; } | undefined
  ): boolean => {
    if (!condition) return true;

    const { question, equals, contains } = condition;
    const dependentValue = userInputs[question];

    if (contains !== undefined) {
      if (Array.isArray(dependentValue)) {
        return dependentValue.includes(contains);
      }
      return dependentValue === contains;
    }

    if (equals !== undefined) {
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
      return dependentValue === equals;
    }

    return !!dependentValue;
  };

  // Process each section in the template
  formTemplate.sections.forEach(section => {
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
