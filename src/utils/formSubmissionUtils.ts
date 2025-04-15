
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
  
  console.log("Grouped dynamic questions:", dynamicQuestions);
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
  console.log("[formSubmissionUtils/prepareFormSubmission]: Raw userInputs:", userInputs);
  console.log("[formSubmissionUtils/prepareFormSubmission]: Pre-processed formattedAnswers:", formattedAnswers);
  
  // Always check for dynamic follow-up questions in the userInputs
  const hasDynamicQuestions = Object.keys(userInputs).some(key => key.includes('_for_'));
  console.log("[formSubmissionUtils/prepareFormSubmission]: Has dynamic questions:", hasDynamicQuestions);
  
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
  
  // If formattedAnswers is provided and it has valid structure, use it directly
  if (processedAnswers && (
      (processedAnswers.formattedAnswers && processedAnswers.formattedAnswers.answeredSections) ||
      (processedAnswers.answeredSections)
    )) {
    console.log("[formSubmissionUtils/prepareFormSubmission]: Using pre-processed formattedAnswers");
    
    // If there are dynamic questions, ensure they are included
    if (hasDynamicQuestions) {
      console.log("[formSubmissionUtils/prepareFormSubmission]: Adding dynamic questions to pre-processed answers");
      // Use the enhanced form processing to make sure dynamic questions are included
      const enhancedAnswers = enhancedProcessFormAnswers(formTemplate, userInputs);
      
      // Combine with pre-processed answers
      const targetStructure = processedAnswers.formattedAnswers || processedAnswers;
      const combinedSections = [...(targetStructure.answeredSections || [])];
      
      // Add dynamic questions from enhanced processing
      enhancedAnswers.answeredSections.forEach(enhancedSection => {
        // Find if this section exists in the combined sections
        const existingSection = combinedSections.find(
          section => section.section_title === enhancedSection.section_title
        );
        
        if (existingSection) {
          // Add only the dynamic question responses
          enhancedSection.responses.forEach(response => {
            if (response.id.includes('_for_')) {
              // Check if this response already exists
              const existingResponse = existingSection.responses.find(r => r.id === response.id);
              if (!existingResponse) {
                existingSection.responses.push(response);
              }
            }
          });
        } else {
          // Add the entire section
          combinedSections.push(enhancedSection);
        }
      });
      
      // Update the processed answers with combined sections
      if (processedAnswers.formattedAnswers) {
        processedAnswers.formattedAnswers.answeredSections = combinedSections;
      } else {
        processedAnswers.answeredSections = combinedSections;
      }
    }
    
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
    console.log("[formSubmissionUtils/prepareFormSubmission]: Using enhancedProcessFormAnswers approach");
    
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

  // Create a map to track which dynamic questions belong to which section
  const dynamicQuestionSectionMap: Record<string, string> = {};
  
  // First pass - find the section for each base question that might have dynamic follow-ups
  formTemplate.sections.forEach(section => {
    section.questions.forEach(question => {
      // Map the original question ID to its section
      dynamicQuestionSectionMap[question.id] = section.section_title;
    });
  });

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

  // Track runtime IDs already processed to avoid duplicates
  const processedRuntimeIds = new Set<string>();

  // Process each section in the template
  formTemplate.sections.forEach(section => {
    // Create a new section for the formatted answer
    const formattedSection = {
      section_title: section.section_title,
      responses: []
    };

    // First, collect all direct answers (non-dynamic questions)
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

    // Look for dynamic follow-up questions that belong to this section only
    Object.keys(userInputs).forEach(key => {
      if (key.includes('_for_') && !processedRuntimeIds.has(key)) {
        const originalId = getOriginalQuestionId(key);
        
        // Only include this dynamic question if its parent belongs to this section
        if (dynamicQuestionSectionMap[originalId] === section.section_title) {
          // Get the answer and normalize it if needed
          let userAnswer = userInputs[key];
          
          // If the answer is an object with a 'value' property (as sometimes happens in form state),
          // extract just the value
          if (userAnswer && typeof userAnswer === 'object' && 'value' in userAnswer) {
            console.log(`[formSubmissionUtils]: Extracting value from nested object for ${key}`);
            userAnswer = userAnswer.value;
          }
          
          // Skip if no answer
          if (
            userAnswer === undefined || 
            userAnswer === null || 
            (typeof userAnswer === 'string' && userAnswer.trim() === '') ||
            (Array.isArray(userAnswer) && userAnswer.length === 0)
          ) {
            return;
          }
          
          // Get the parent value from the runtime ID
          const parentValue = getParentValueFromRuntimeId(key);
          
          // Add the formatted follow-up response
          formattedSection.responses.push({
            id: key, // Use the full runtime ID as the answer identifier
            answer: {
              parent_question: originalId,
              parent_value: parentValue,
              value: userAnswer
            }
          });
          
          // Mark this runtime ID as processed to avoid duplicates
          processedRuntimeIds.add(key);
          
          // Also handle "Övrigt" option for follow-up questions
          if (
            (typeof userAnswer === 'string' && userAnswer === 'Övrigt') ||
            (Array.isArray(userAnswer) && userAnswer.includes('Övrigt'))
          ) {
            const otherFieldId = `${key}_other`;
            const alternativeOtherFieldId = `${key}_övrigt`;
            
            const otherAnswer = userInputs[otherFieldId] || userInputs[alternativeOtherFieldId];
            
            if (otherAnswer) {
              formattedSection.responses.push({
                id: otherFieldId in userInputs ? otherFieldId : alternativeOtherFieldId,
                answer: otherAnswer
              });
            }
          }
        }
      }
    });

    // Only include sections that have responses
    if (formattedSection.responses.length > 0) {
      formattedAnswer.answeredSections.push(formattedSection);
    }
  });

  console.log("[formSubmissionUtils/enhancedProcessFormAnswers]: Formatted answer:", formattedAnswer);
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
  return enhancedProcessFormAnswers(formTemplate, userInputs);
};

