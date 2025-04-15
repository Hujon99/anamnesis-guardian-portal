
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
          if (!response) return; // Skip null/undefined responses
          
          const { id, answer } = response;
          if (!id) return; // Skip responses without an ID
          
          // Get the question label from our map
          const label = questionLabelMap.get(id) || id;
          
          // Handle complex answer structures
          let formattedAnswer = "";
          if (answer === null || answer === undefined) {
            formattedAnswer = "Inget svar";
          } else if (typeof answer === "object") {
            if ("value" in answer) {
              // Handle dynamic follow-up answer format
              formattedAnswer = String(answer.value);
            } else if (Array.isArray(answer)) {
              // Handle array answers (e.g., multiple choice)
              formattedAnswer = answer.map(item => 
                typeof item === "object" && "value" in item ? item.value : String(item)
              ).join(", ");
            } else {
              // Handle other object structures
              formattedAnswer = JSON.stringify(answer);
            }
          } else {
            formattedAnswer = String(answer);
          }
          
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
      if ('formattedAnswers' in formattedAnswers) {
        console.log("Found double-nested formattedAnswers structure");
        return formattedAnswers.formattedAnswers;
      }
      
      if ('answeredSections' in formattedAnswers) {
        console.log("Found single-nested formattedAnswers structure");
        return formattedAnswers;
      }
    }
  }

  // Case 3: Raw answers format that needs transformation
  if (Object.keys(answers).length > 0) {
    console.log("Transforming raw answers to formatted structure");
    // Convert raw answers to formatted structure
    return {
      answeredSections: [{
        section_title: "Patientens svar",
        responses: Object.entries(answers)
          .filter(([key]) => !['formMetadata', 'metadata'].includes(key))
          .map(([id, answer]) => ({ id, answer }))
      }]
    };
  }

  console.log("No valid answer structure found");
  return undefined;
};

