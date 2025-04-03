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
  
  // Step 1: identify all questions that should be visible based on conditional logic
  const identifyVisibleQuestions = () => {
    // Helper function to evaluate show_if conditions
    const evaluateCondition = (
      condition: { question: string; equals: string | string[] } | undefined,
      inputs: Record<string, any>
    ): boolean => {
      if (!condition) return true;
  
      const { question, equals } = condition;
      const dependentValue = inputs[question];
      
      // Log condition evaluation for debugging
      console.log(`Evaluating condition: question=${question}, equals=${JSON.stringify(equals)}, actual value=${dependentValue}`);
  
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
  
      return dependentValue === equals;
    };
    
    // Process all sections and their questions recursively to account for nested conditions
    const processQuestionsRecursively = () => {
      let hasChanges = false;
      let visibleQuestionsBefore = visibleQuestionIds.size;
      
      formTemplate.sections.forEach((section, sectionIndex) => {
        // Check if section should be shown
        const sectionShouldBeShown = evaluateCondition(section.show_if, userInputs);
        
        if (sectionShouldBeShown) {
          console.log(`Section "${section.section_title}" (index ${sectionIndex}) should be shown`);
          
          section.questions.forEach((question, questionIndex) => {
            // If this question is already marked as visible, skip detailed processing
            if (visibleQuestionIds.has(question.id)) {
              return;
            }
            
            // Check if question should be shown based on its condition
            const questionShouldBeShown = evaluateCondition(question.show_if, userInputs);
            
            if (questionShouldBeShown) {
              console.log(`Question "${question.label}" (id: ${question.id}) should be shown`);
              visibleQuestionIds.add(question.id);
              hasChanges = true;
              
              // Get the user's answer to this question
              const answer = userInputs[question.id];
              
              // Check for "Other" fields that should be conditionally shown
              if (
                (question.type === 'radio' || question.type === 'dropdown') &&
                question.options
              ) {
                const otherOptions = ['Övrigt', 'Annat', 'Other'];
                
                // If answered with an "Other" option, show the corresponding field
                if (otherOptions.includes(answer)) {
                  const suffixes = ['_other', '_övrigt', '_annat'];
                  
                  suffixes.forEach(suffix => {
                    const otherFieldId = `${question.id}${suffix}`;
                    if (otherFieldId in userInputs) {
                      console.log(`Adding "Other" field: ${otherFieldId} with value: ${userInputs[otherFieldId]}`);
                      visibleQuestionIds.add(otherFieldId);
                      hasChanges = true;
                    }
                  });
                }
                
                // Special handling for conditional dependencies:
                // Some questions might depend on specific values from this question
                formTemplate.sections.forEach(depSection => {
                  depSection.questions.forEach(depQuestion => {
                    if (depQuestion.show_if && depQuestion.show_if.question === question.id) {
                      const { equals } = depQuestion.show_if;
                      
                      // If the current answer matches the condition
                      if ((Array.isArray(equals) && equals.includes(answer)) || equals === answer) {
                        console.log(`Found dependent question "${depQuestion.label}" (id: ${depQuestion.id}) that depends on ${question.id}=${answer}`);
                      }
                    }
                  });
                  
                  // Also check if any sections depend on this question
                  if (depSection.show_if && depSection.show_if.question === question.id) {
                    const { equals } = depSection.show_if;
                    
                    // If the current answer matches the condition
                    if ((Array.isArray(equals) && equals.includes(answer)) || equals === answer) {
                      console.log(`Found dependent section "${depSection.section_title}" that depends on ${question.id}=${answer}`);
                    }
                  }
                });
              }
            } else {
              console.log(`Question "${question.label}" (id: ${question.id}) should NOT be shown due to condition: ${JSON.stringify(question.show_if)}`);
            }
          });
        } else {
          console.log(`Section "${section.section_title}" (index ${sectionIndex}) should NOT be shown due to condition: ${JSON.stringify(section.show_if)}`);
        }
      });
      
      let visibleQuestionsAfter = visibleQuestionIds.size;
      console.log(`Iteration added ${visibleQuestionsAfter - visibleQuestionsBefore} visible questions`);
      
      return hasChanges;
    };
    
    // Keep processing until no new visible questions are found
    // This handles dependencies between conditional questions
    let iterations = 0;
    let maxIterations = 10; // Prevent infinite loops, adjust if needed
    
    console.log("Starting recursive question identification process");
    
    while (processQuestionsRecursively() && iterations < maxIterations) {
      iterations++;
      console.log(`Completed iteration ${iterations}, total visible questions so far: ${visibleQuestionIds.size}`);
      
      // Debug output - log all visible questions after each iteration
      console.log("Currently visible questions:");
      Array.from(visibleQuestionIds).forEach(id => {
        console.log(`- ${id}: ${userInputs[id]}`);
      });
    }
    
    console.log(`Identified ${visibleQuestionIds.size} visible questions after ${iterations} iterations`);
    console.log("Final list of visible questions:");
    Array.from(visibleQuestionIds).forEach(id => {
      console.log(`- ${id}: ${userInputs[id] !== undefined ? userInputs[id] : 'undefined'}`);
    });
  };
  
  // Call the function to identify all visible questions
  identifyVisibleQuestions();
  
  // Step 2: build the formatted answer structure based on ONLY visible questions and valid answers
  // This revised implementation doesn't double-check section visibility in this stage
  console.log("--- Building formatted answer structure ---");
  
  formTemplate.sections.forEach((section, sectionIndex) => {
    console.log(`Processing section "${section.section_title}" for final result`);
    
    // Temporary list to collect responses for this section
    const currentSectionResponses: { id: string; answer: any }[] = [];
    
    // Process each question in the section
    section.questions.forEach((question, questionIndex) => {
      // ONLY check if the question is in the visibleQuestionIds set from Step 1
      const isQuestionVisible = visibleQuestionIds.has(question.id);
      
      if (isQuestionVisible) {
        const userAnswer = userInputs[question.id];
        
        // Skip if question wasn't answered (undefined, null, or empty string)
        // Note: we include false and 0 as valid answers
        const hasValidAnswer = !(
          userAnswer === undefined || 
          userAnswer === null || 
          (typeof userAnswer === 'string' && userAnswer.trim() === '')
        );
        
        if (hasValidAnswer) {
          // Add the answer to the temporary responses list
          console.log(`Adding answer for question "${question.label}" (id: ${question.id}): ${userAnswer}`);
          currentSectionResponses.push({
            id: question.id,
            answer: userAnswer
          });
          
          // Check for additional "Other" fields if applicable
          if (
            (question.type === 'radio' || question.type === 'dropdown') &&
            question.options
          ) {
            const otherOptions = ['Övrigt', 'Annat', 'Other'];
            
            if (otherOptions.includes(userAnswer)) {
              const suffixes = ['_other', '_övrigt', '_annat'];
              
              for (const suffix of suffixes) {
                const otherFieldId = `${question.id}${suffix}`;
                
                if (
                  visibleQuestionIds.has(otherFieldId) && 
                  otherFieldId in userInputs && 
                  userInputs[otherFieldId]
                ) {
                  console.log(`Adding "Other" field answer: ${otherFieldId}=${userInputs[otherFieldId]}`);
                  currentSectionResponses.push({
                    id: otherFieldId,
                    answer: userInputs[otherFieldId]
                  });
                  break; // Found and added one "other" field, no need to check more
                }
              }
            }
          }
        } else {
          console.log(`Skipping question "${question.label}" (id: ${question.id}) because it has no valid answer`);
        }
      } else {
        console.log(`Skipping question "${question.label}" (id: ${question.id}) because it's not in the visible set`);
      }
    });
    
    // Only include the section if it has at least one response
    if (currentSectionResponses.length > 0) {
      console.log(`Adding section "${section.section_title}" with ${currentSectionResponses.length} responses to final result`);
      formattedAnswer.answeredSections.push({
        section_title: section.section_title,
        responses: currentSectionResponses
      });
    } else {
      console.log(`Skipping section "${section.section_title}" because it has no valid responses`);
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
  console.log("Preparing form submission with template:", formTemplate.title);
  console.log("Raw user inputs:", Object.keys(userInputs).length);
  
  // Process the answers into the structured format
  const formattedAnswers = processFormAnswers(formTemplate, userInputs);
  
  console.log("Formatted answers contains sections:", formattedAnswers.answeredSections.length);
  console.log("Total formatted responses:", formattedAnswers.answeredSections.reduce((sum, section) => sum + section.responses.length, 0));
  
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
