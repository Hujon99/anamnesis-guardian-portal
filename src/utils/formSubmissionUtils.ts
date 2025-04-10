
/**
 * This utility file contains functions to process and format form submissions.
 * It ensures that only relevant answers from dynamic forms are saved in a 
 * consistent structure based on the form template that was used.
 */

import { FormTemplate } from "@/types/anamnesis";

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
  formTemplate: FormTemplate | null | undefined,
  userInputs: Record<string, any>,
  formattedAnswers?: any,
  isOpticianMode?: boolean
): Record<string, any> => {
  console.log("[formSubmissionUtils/prepareFormSubmission]: Called with isOpticianMode:", isOpticianMode);
  console.log("[formSubmissionUtils/prepareFormSubmission]: Initial formatted answers:", formattedAnswers);
  
  // Clone the formatted answers to avoid mutation
  let processedAnswers = formattedAnswers ? JSON.parse(JSON.stringify(formattedAnswers)) : null;
  
  // If we're in optician mode, make sure to mark it in the formatted answers
  if (isOpticianMode && processedAnswers) {
    console.log("[formSubmissionUtils/prepareFormSubmission]: Marking submission as optician mode");
    
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
    console.log("[formSubmissionUtils/prepareFormSubmission]: Formatted answers structure:", 
      JSON.stringify(processedAnswers, null, 2));
    
    // Extract formatted answers for inspection
    const formattedAnswersData = processedAnswers.formattedAnswers || processedAnswers;
    
    // Verify and log if we have actual answers
    if (formattedAnswersData.answeredSections && formattedAnswersData.answeredSections.length > 0) {
      console.log("[formSubmissionUtils/prepareFormSubmission]: Found answeredSections with responses:", 
        formattedAnswersData.answeredSections.reduce((total, section) => total + section.responses.length, 0));
    } else {
      console.warn("[formSubmissionUtils/prepareFormSubmission]: No answeredSections or empty answeredSections found");
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
        formTemplateId: formTemplate?.title || "Unknown Form",
        submittedAt: formattedAnswersData?.submissionTimestamp || new Date().toISOString(),
        version: isOpticianMode ? "2.1" : "2.0"
      }
    };
  } else {
    // If no pre-processed answers are provided, we need to process the raw answers ourselves
    console.log("[formSubmissionUtils/prepareFormSubmission]: No pre-processed answers. Need to process raw answers");
    
    // Bail out early if formTemplate is null or undefined
    if (!formTemplate) {
      console.error("[formSubmissionUtils/prepareFormSubmission]: No form template provided for processing");
      
      // Return a minimal valid structure with the raw answers
      return {
        formattedAnswers: {
          formTitle: "Unknown Form",
          submissionTimestamp: new Date().toISOString(),
          answeredSections: []
        },
        rawAnswers: { ...userInputs },
        ...(isOpticianMode && {
          _metadata: {
            submittedBy: 'optician',
            autoSetStatus: 'ready'
          }
        }),
        metadata: {
          formTemplateId: "Unknown Form",
          submittedAt: new Date().toISOString(),
          version: isOpticianMode ? "2.1" : "1.0"
        }
      };
    }
    
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

    // Process each section in the template if it exists
    if (formTemplate.sections && Array.isArray(formTemplate.sections)) {
      formTemplate.sections.forEach(section => {
        // Create a new section for the formatted answer
        const formattedSection = {
          section_title: section.section_title,
          responses: []
        };

        // Process each question in the section if it exists
        if (section.questions && Array.isArray(section.questions)) {
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
        }

        // Only include sections that have responses
        if (formattedSection.responses.length > 0) {
          formattedAnswer.answeredSections.push(formattedSection);
        }
      });
    }
      
    // If this is an optician submission, mark it
    if (isOpticianMode) {
      formattedAnswer.isOpticianSubmission = true;
      console.log("[formSubmissionUtils/prepareFormSubmission]: Marked formattedAnswer as optician submission");
    }
    
    // Log the final formatted answer
    console.log("[formSubmissionUtils/prepareFormSubmission]: Manually processed formatted answers:", 
      JSON.stringify(formattedAnswer, null, 2));
    
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
        version: isOpticianMode ? "2.1" : "1.0"
      }
    };
  }
};

/**
 * @deprecated Use the useFormSubmissionState hook instead
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

