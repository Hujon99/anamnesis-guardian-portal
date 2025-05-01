
/**
 * This hook provides utilities for formatting raw form data for submission and display.
 * It converts raw form values into structured data that can be saved to the database,
 * and provides functionality to generate, edit and save formatted raw data.
 */

import { useCallback, useState } from "react";
import { FormTemplate, FormSection, FormQuestion, FormattedAnswerData } from "@/types/anamnesis";
import { createOptimizedPromptInput, extractFormattedAnswers } from "@/utils/anamnesisTextUtils";

export function useFormattedRawData(
  initialData: string = "", 
  answers: Record<string, any> = {}, 
  hasAnswers: boolean = false,
  formTemplate: FormTemplate | null = null,
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
   * Generate formatted raw data from answers object using the createOptimizedPromptInput utility
   */
  const generateRawData = useCallback(async () => {
    if (!hasAnswers || !answers) {
      console.log("[useFormattedRawData/generateRawData]: No answers to format");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log("[useFormattedRawData/generateRawData]: Starting to generate formatted data");
      
      let formattedText = "";
      
      // Try to extract structured answers from the data
      const formattedAnswersObj = extractFormattedAnswers(answers);
      
      if (formTemplate && formattedAnswersObj) {
        // Use the optimized prompt input creator which properly maps questions to their labels
        formattedText = createOptimizedPromptInput(formTemplate, formattedAnswersObj);
        console.log("[useFormattedRawData/generateRawData]: Created formatted text using template and answers");
      } else if (formTemplate && typeof answers === 'object' && answers !== null) {
        // Try direct approach with raw answers
        const rawAnswersObj = {
          answeredSections: [{
            section_title: "Patientens svar",
            responses: Object.entries(answers)
              .filter(([key]) => !['formMetadata', 'metadata'].includes(key))
              .map(([id, answer]) => ({ id, answer }))
          }]
        };
        
        formattedText = createOptimizedPromptInput(formTemplate, rawAnswersObj);
        console.log("[useFormattedRawData/generateRawData]: Created formatted text using template and raw answers");
      } else {
        // Fallback to simple key-value pairs if we can't use the optimized approach
        console.log("[useFormattedRawData/generateRawData]: Using fallback simple formatting");
        formattedText = "Patientens anamnesinformation:\n\n";
        
        if (typeof answers === 'object' && answers !== null) {
          Object.entries(answers).forEach(([key, value]) => {
            if (key !== 'formMetadata' && key !== 'metadata' && value !== null && value !== undefined && value !== '') {
              // Handle arrays and objects specially
              let displayValue = value;
              if (Array.isArray(value)) {
                displayValue = value.join(", ");
              } else if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value);
              }
              formattedText += `${key}: ${displayValue}\n`;
            }
          });
        }
      }
      
      console.log("[useFormattedRawData/generateRawData]: Setting formatted text:", formattedText.substring(0, 100) + "...");
      setFormattedRawData(formattedText);
      
      // If onSave is provided, call it with the formatted text
      if (onSave) {
        onSave(formattedText);
      }
    } catch (error) {
      console.error("[useFormattedRawData/generateRawData]: Error generating formatted data:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [answers, hasAnswers, formTemplate, onSave]);

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
