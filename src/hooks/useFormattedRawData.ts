
/**
 * This hook provides utilities for formatting raw form data for submission and display.
 * It converts raw form values into structured data that can be saved to the database,
 * and provides functionality to generate, edit and save formatted raw data.
 */

import { useCallback, useState } from "react";
import { FormTemplate, FormSection, FormQuestion, FormattedAnswerData } from "@/types/anamnesis";

export function useFormattedRawData(
  initialData: string = "", 
  answers: Record<string, any> = {}, 
  hasAnswers: boolean = false,
  onSave?: (data: string) => void
) {
  const [formattedRawData, setFormattedRawData] = useState<string>(initialData);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [saveIndicator, setSaveIndicator] = useState<"saved" | "unsaved" | null>(null);

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

  /**
   * Generate formatted raw data from answers object
   */
  const generateRawData = useCallback(async () => {
    if (!hasAnswers) return;
    
    setIsGenerating(true);
    
    try {
      // Format answers into a readable text format
      let formattedText = "";
      
      if (typeof answers === 'object' && answers !== null) {
        // Simple formatting of answers into text
        Object.entries(answers).forEach(([key, value]) => {
          if (key !== 'formMetadata' && key !== 'metadata' && value !== null && value !== undefined && value !== '') {
            formattedText += `${key}: ${JSON.stringify(value)}\n`;
          }
        });
      }
      
      setFormattedRawData(formattedText);
    } catch (error) {
      console.error("Error generating formatted data:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [answers, hasAnswers]);

  return {
    formatAnswersForSubmission,
    formattedRawData,
    setFormattedRawData,
    generateRawData,
    isGenerating,
    saveIndicator,
    setSaveIndicator
  };
}
