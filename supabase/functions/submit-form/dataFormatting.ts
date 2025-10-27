
/**
 * This module handles data formatting operations for the submit-form edge function.
 * It extracts and formats form data for database storage and generates a human-readable
 * version of the submitted answers.
 */

import { FormTemplate } from './types.ts';
import { Logger } from './logger.ts';

export class DataFormatter {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Extracts the formatted answers structure from various possible answer formats
   */
  extractFormattedAnswers(answers: Record<string, any>): any | undefined {
    if (!answers || typeof answers !== 'object') {
      this.logger.warn("No answers provided or invalid format");
      return undefined;
    }

    // Case 1: Direct structure with answeredSections
    if ('answeredSections' in answers && Array.isArray(answers.answeredSections)) {
      this.logger.debug("Found direct structure with answeredSections");
      return answers;
    }

    // Case 2: Nested in formattedAnswers
    if ('formattedAnswers' in answers) {
      const formattedAnswers = answers.formattedAnswers;
      
      if (formattedAnswers && typeof formattedAnswers === 'object') {
        if ('answeredSections' in formattedAnswers) {
          this.logger.debug("Found single-nested formattedAnswers structure");
          return formattedAnswers;
        }
        
        if ('formattedAnswers' in formattedAnswers) {
          this.logger.debug("Found double-nested formattedAnswers structure");
          return formattedAnswers.formattedAnswers;
        }
      }
    }

    // Case 3: Look for answers within a metadata wrapper
    if ('rawAnswers' in answers && typeof answers.rawAnswers === 'object') {
      this.logger.debug("Found rawAnswers field, checking inside");
      const innerResult = this.extractFormattedAnswers(answers.rawAnswers);
      if (innerResult) {
        return innerResult;
      }
    }

    // Case 4: Raw answers format that needs transformation
    if (Object.keys(answers).length > 0) {
      this.logger.debug("Transforming raw answers to formatted structure");
      
      return {
        answeredSections: [{
          section_title: "Patientens svar",
          responses: Object.entries(answers)
            .filter(([key]) => !['formMetadata', 'metadata', '_metadata', '_isOptician'].includes(key))
            .map(([id, answer]) => ({ id, answer }))
        }]
      };
    }

    this.logger.warn("No valid answer structure found");
    return undefined;
  }

  /**
   * Creates an optimized text representation of anamnesis data
   */
  createOptimizedPromptInput(
    formTemplate: FormTemplate,
    answersData: any
  ): string {
    // Initialize output text
    let outputText = "Patientens anamnesinformation:\n";

    // Create maps for questions and answers
    const questionLabelMap = new Map<string, string>();
    const answeredQuestionsMap = new Map<string, any>();
    
    // Extract answers into a map for easier lookup
    if (answersData && answersData.answeredSections) {
      answersData.answeredSections.forEach((section: any) => {
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

    // If we have no answers, return early
    if (answeredQuestionsMap.size === 0) {
      return outputText + "\nIngen information tillgänglig";
    }
    
    // Build question label map from form template
    if (formTemplate && formTemplate.sections) {
      formTemplate.sections.forEach(section => {
        if (section.questions) {
          section.questions.forEach(question => {
            // Skip optician-only questions
            if (question.show_in_mode === "optician") return;
            questionLabelMap.set(question.id, question.label || question.id);
          });
        }
      });
    }

    // Process sections in template order
    if (formTemplate && formTemplate.sections) {
      formTemplate.sections.forEach((section: FormSection) => {
        if (!section.questions || section.questions.length === 0) return;
        
        let sectionAdded = false;
        
        // Process questions in template order
        section.questions.forEach((question: FormQuestion) => {
          if (question.show_in_mode === "optician") return;
          
          const answer = answeredQuestionsMap.get(question.id);
          
          // Check if this question has dynamic follow-ups
          const hasDynamicFollowups = Array.from(answeredQuestionsMap.keys()).some(key => 
            key.includes('_for_') && key.split('_for_')[0] === question.id
          );
          
          // Skip if no answer and no dynamic follow-ups
          if (answer === undefined && !hasDynamicFollowups) return;
          
          if (!sectionAdded) {
            outputText += `\n-- ${section.section_title} --\n`;
            sectionAdded = true;
          }
          
          const label = questionLabelMap.get(question.id) || question.label || question.id;
          
          // Add the main question if it has an answer
          if (answer !== undefined) {
            let formattedAnswer = this.formatAnswerValue(answer);
            outputText += `${label}: ${formattedAnswer}\n`;
          }
          
          // Immediately add any dynamic follow-ups for this question (grouped together)
          Array.from(answeredQuestionsMap.keys()).forEach(key => {
            if (key.includes('_for_')) {
              const [baseQuestionId, parentValue] = key.split('_for_');
              
              // Only process follow-ups for THIS question
              if (baseQuestionId === question.id) {
                const followUpAnswer = answeredQuestionsMap.get(key);
                
                if (followUpAnswer === undefined || followUpAnswer === null || followUpAnswer === '') return;
                
                // Format with indentation for clarity
                const formattedParentValue = parentValue.replace(/_/g, ' ');
                const followUpLabel = `  └─ ${label} (${formattedParentValue})`;
                
                let formattedAnswer = this.formatAnswerValue(followUpAnswer);
                
                outputText += `${followUpLabel}: ${formattedAnswer}\n`;
              }
            }
          });
        });
      });
    }

    return outputText;
  }

  /**
   * Helper function to format different answer types consistently
   */
  formatAnswerValue(answer: any): string {
    if (answer === null || answer === undefined) {
      return "Inget svar";
    }
    
    // Handle arrays
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
      
      if ('parent_question' in answer && 'parent_value' in answer && 'value' in answer) {
        return String(answer.value);
      }
      
      return JSON.stringify(answer);
    }
    
    // Simple values
    return String(answer);
  }

  /**
   * Prepares the update data for database insertion
   */
  prepareUpdateData(
    formData: Record<string, any>,
    formattedRawData: string,
    status: string,
    examinationType?: string
  ): Record<string, any> {
    const now = new Date().toISOString();
    
    const updateData: Record<string, any> = {
      answers: formData,
      formatted_raw_data: formattedRawData,
      status: status,
      updated_at: now
    };
    
    // Persist GDPR consent and legal versions when provided
    if (typeof formData['consent_given'] === 'boolean') {
      updateData['consent_given'] = formData['consent_given'];
      if (formData['consent_given']) {
        updateData['consent_timestamp'] = now;
      }
    }
    if (typeof formData['privacy_policy_version'] === 'string') {
      updateData['privacy_policy_version'] = formData['privacy_policy_version'];
    }
    if (typeof formData['terms_version'] === 'string') {
      updateData['terms_version'] = formData['terms_version'];
    }

    // Optionally persist context fields if present in submission payload
    if (typeof formData['first_name'] === 'string' && formData['first_name'].length > 0) {
      updateData['first_name'] = formData['first_name'];
    }
    if (typeof formData['store_id'] === 'string' && formData['store_id'].length > 0) {
      updateData['store_id'] = formData['store_id'];
    }
    
    // Add sent_at if status is 'ready'
    if (status === 'ready') {
      updateData['sent_at'] = now;
    }
    
    // Add examination_type if provided (falls back to entry.anamnes_forms.examination_type)
    if (examinationType) {
      updateData['examination_type'] = examinationType;
    }
    
    return updateData;
  }

  /**
   * Extract form data from various possible submission formats
   */
  extractFormData(answers: Record<string, any>): Record<string, any> {
    if (answers.rawAnswers) {
      this.logger.debug("Using rawAnswers property");
      return answers.rawAnswers;
    } else if (answers.answers) {
      this.logger.debug("Using answers property");
      return answers.answers;
    } else if (typeof answers === 'object' && !Array.isArray(answers)) {
      this.logger.debug("Using answers object directly");
      // Filter out special properties that aren't actual form answers
      const formData = {};
      for (const key in answers) {
        if (!['metadata', 'formattedAnswers', 'rawAnswers', '_isOptician', '_metadata', 'kiosk_customer_data'].includes(key)) {
          formData[key] = answers[key];
        }
      }
      return formData;
    }
    
    throw new Error("Invalid answer structure in submission");
  }
}

// Create a default data formatter
export const createDataFormatter = (logger: Logger): DataFormatter => new DataFormatter(logger);
