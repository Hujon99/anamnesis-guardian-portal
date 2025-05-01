/**
 * This utility file contains functions for optimizing anamnesis data into text format.
 * It helps prepare patient form data for AI summarization by converting complex JSON structures
 * into a more token-efficient plain text representation.
 */

import { FormTemplate, FormQuestion, FormSection } from "@/types/anamnesis";

/**
 * Creates an optimized text representation of anamnesis data by combining
 * questions from the form template with answers from the patient submission.
 * This function preserves the original order from the form template and
 * only includes questions that have been answered.
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
  
  // Create a map of all answered questions for quick lookup
  const answeredQuestionsMap = new Map<string, any>();
  
  // Collect all answers into a map for easier and faster lookup
  if (formattedAnswersJSON && formattedAnswersJSON.answeredSections) {
    formattedAnswersJSON.answeredSections.forEach((section: any) => {
      if (section.responses && section.responses.length > 0) {
        section.responses.forEach((response: any) => {
          if (response && response.id && response.answer !== undefined && 
              response.answer !== null && response.answer !== '') {
            answeredQuestionsMap.set(response.id, response.answer);
          }
        });
      }
    });
  }

  // If we have no answers, return early with a message
  if (answeredQuestionsMap.size === 0) {
    return outputText + "\nIngen information tillgänglig";
  }
  
  // Populate the question label map from the form template
  if (formTemplateJSON && formTemplateJSON.sections) {
    formTemplateJSON.sections.forEach(section => {
      if (section.questions) {
        section.questions.forEach(question => {
          // Skip optician-only questions
          if (question.show_in_mode === "optician") return;
          
          questionLabelMap.set(question.id, question.label);
        });
      }
    });
  }

  // Process sections in the original template order
  if (formTemplateJSON && formTemplateJSON.sections) {
    formTemplateJSON.sections.forEach((section: FormSection) => {
      // Skip sections without questions
      if (!section.questions || section.questions.length === 0) return;
      
      // Track if we've added any questions from this section
      let sectionAdded = false;
      
      // Process questions in the original template order
      section.questions.forEach((question: FormQuestion) => {
        // Skip optician-only questions
        if (question.show_in_mode === "optician") return;
        
        // Get the answer if it exists
        const answer = answeredQuestionsMap.get(question.id);
        
        // Skip questions without answers
        if (answer === undefined) return;
        
        // If this is the first question added for this section, add the section title
        if (!sectionAdded) {
          outputText += `\n-- ${section.section_title} --\n`;
          sectionAdded = true;
        }
        
        // Get the question label
        const label = questionLabelMap.get(question.id) || question.label || question.id;
        
        // Handle different answer types
        let formattedAnswer = formatAnswerValue(answer);
        
        // Add the question-answer pair
        outputText += `${label}: ${formattedAnswer}\n`;
      });
      
      // Look for follow-up questions related to this section
      Array.from(answeredQuestionsMap.keys()).forEach(key => {
        // Check if this is a follow-up question (_for_ indicates this)
        if (key.includes('_for_')) {
          const [baseQuestionId] = key.split('_for_');
          
          // Check if the base question belongs to this section
          const baseQuestionBelongsToThisSection = section.questions.some(q => q.id === baseQuestionId);
          
          if (baseQuestionBelongsToThisSection) {
            const followUpAnswer = answeredQuestionsMap.get(key);
            
            // Skip if no answer
            if (followUpAnswer === undefined || followUpAnswer === null || followUpAnswer === '') return;
            
            // If this is the first question added for this section, add the section title
            if (!sectionAdded) {
              outputText += `\n-- ${section.section_title} --\n`;
              sectionAdded = true;
            }
            
            // Format the follow-up question label nicely
            const parentValue = key.split('_for_')[1].replace(/_/g, ' ');
            const baseQuestionLabel = questionLabelMap.get(baseQuestionId) || baseQuestionId;
            const followUpLabel = `${baseQuestionLabel} (${parentValue})`;
            
            // Format the answer
            let formattedAnswer = formatAnswerValue(followUpAnswer);
            
            // Add the follow-up question-answer pair
            outputText += `${followUpLabel}: ${formattedAnswer}\n`;
          }
        }
      });
    });
  }

  return outputText;
};

/**
 * Helper function to format different answer types consistently
 */
function formatAnswerValue(answer: any): string {
  if (answer === null || answer === undefined) {
    return "Inget svar";
  }
  
  // Handle arrays (checkboxes, multiple selections)
  if (Array.isArray(answer)) {
    return answer
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          if ('value' in item) return item.value;
          return JSON.stringify(item);
        }
        return String(item);
      })
      .filter(value => value !== undefined && value !== null && value !== '')
      .join(', ');
  }
  
  // Handle objects with nested values
  if (typeof answer === 'object' && answer !== null) {
    if ('value' in answer) {
      return String(answer.value);
    }
    
    // Special handling for follow-up questions
    if ('parent_question' in answer && 'parent_value' in answer && 'value' in answer) {
      return String(answer.value);
    }
    
    // Fallback to JSON stringify for other object types
    return JSON.stringify(answer);
  }
  
  // Simple values
  return String(answer);
}

/**
 * Extracts the formatted answers structure from various possible answer formats
 * in the anamnesis entry. Handles different nesting levels of the data.
 * 
 * @param answers - The answers object from an anamnesis entry
 * @returns The standardized formatted answers object or undefined if not found
 */
export const extractFormattedAnswers = (answers: Record<string, any>): any | undefined => {
  if (!answers || typeof answers !== 'object') {
    console.log("No answers provided or invalid format");
    return undefined;
  }

  // Case 1: Direct structure with answeredSections
  if ('answeredSections' in answers && Array.isArray(answers.answeredSections)) {
    console.log("Found direct structure with answeredSections");
    return answers;
  }

  // Case 2: Nested in formattedAnswers
  if ('formattedAnswers' in answers) {
    const formattedAnswers = answers.formattedAnswers;
    
    // Handle double nesting
    if (formattedAnswers && typeof formattedAnswers === 'object') {
      // Check if it's already the right structure
      if ('answeredSections' in formattedAnswers) {
        console.log("Found single-nested formattedAnswers structure");
        return formattedAnswers;
      }
      
      // Check if there's another level of nesting
      if ('formattedAnswers' in formattedAnswers) {
        console.log("Found double-nested formattedAnswers structure");
        return formattedAnswers.formattedAnswers;
      }
    }
  }

  // Case 3: Look for answers within a metadata wrapper
  if ('rawAnswers' in answers && typeof answers.rawAnswers === 'object') {
    console.log("Found rawAnswers field, checking inside");
    // Try to find formatted answers inside the rawAnswers
    const innerResult = extractFormattedAnswers(answers.rawAnswers);
    if (innerResult) {
      return innerResult;
    }
  }

  // Case 4: Raw answers format that needs transformation
  if (Object.keys(answers).length > 0) {
    console.log("Transforming raw answers to formatted structure");
    
    // Look for follow-up questions (with _for_ in the key)
    const dynamicQuestions = Object.keys(answers).filter(key => key.includes('_for_'));
    console.log(`Found ${dynamicQuestions.length} follow-up questions`);
    
    // Convert raw answers to formatted structure
    return {
      answeredSections: [{
        section_title: "Patientens svar",
        responses: Object.entries(answers)
          .filter(([key]) => !['formMetadata', 'metadata'].includes(key))
          .map(([id, answer]) => {
            // Handle dynamic follow-up questions
            if (id.includes('_for_')) {
              const [baseQuestion, parentValue] = id.split('_for_');
              return {
                id,
                answer: {
                  parent_question: baseQuestion,
                  parent_value: parentValue.replace(/_/g, ' '),
                  value: answer
                }
              };
            }
            // Regular questions
            return { id, answer };
          })
      }]
    };
  }

  console.log("No valid answer structure found");
  return undefined;
};
