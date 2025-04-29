
/**
 * This hook provides utilities for formatting raw form data for submission and display.
 * It converts raw form values into structured data that can be saved to the database.
 */

import { useCallback } from "react";
import { FormTemplate, FormSection, FormQuestion, FormattedAnswerData } from "@/types/anamnesis";

export function useFormattedRawData() {
  /**
   * Formats form answers for submission by organizing them by section
   */
  const formatAnswersForSubmission = useCallback((
    formValues: Record<string, any>,
    formTemplate: FormTemplate,
    isOpticianMode: boolean = false,
    timestamp: string = new Date().toISOString()
  ): FormattedAnswerData => {
    // Create an object to hold the formatted answers
    const result: FormattedAnswerData = {
      formTitle: formTemplate.title,
      submissionTimestamp: timestamp,
      answeredSections: [],
      isOpticianSubmission: isOpticianMode
    };

    // Process each section in the form template
    formTemplate.sections.forEach((section: FormSection) => {
      const responses: { id: string; answer: any }[] = [];

      // Process each question in the section
      section.questions.forEach((question: FormQuestion) => {
        const answer = formValues[question.id];
        
        // Only include answers that have values
        if (answer !== undefined && answer !== null && answer !== '') {
          responses.push({
            id: question.id,
            answer
          });
        }
      });

      // Also check for dynamic follow-up questions
      Object.entries(formValues).forEach(([key, value]) => {
        if (key.includes('_for_') && value !== undefined && value !== null && value !== '') {
          responses.push({
            id: key,
            answer: value
          });
        }
      });

      // Only add the section if it has responses
      if (responses.length > 0) {
        result.answeredSections.push({
          section_title: section.section_title,
          responses
        });
      }
    });

    return result;
  }, []);

  return {
    formatAnswersForSubmission
  };
}
