/**
 * This hook manages the incremental construction of form submission data.
 * It tracks visible sections and questions in real-time as the user navigates
 * through the form, ensuring accurate capture of conditional fields.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FormTemplate, FormSection, FormQuestion } from "@/types/anamnesis";

export interface FormattedAnswerData {
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

export function useFormSubmissionState(formTemplate: FormTemplate) {
  // Use ref for mutable submission data to avoid unnecessary re-renders
  const submissionDataRef = useRef<FormattedAnswerData>({
    formTitle: formTemplate.title,
    submissionTimestamp: new Date().toISOString(),
    answeredSections: []
  });
  
  // Debugging state to track processing
  const [processingCount, setProcessingCount] = useState(0);
  
  // Track current step for section awareness
  const currentStepRef = useRef<number>(0);
  
  // Prevent excessive processing with a debounce mechanism
  const processingTimerRef = useRef<number | null>(null);
  const lastProcessedValuesRef = useRef<string>("");

  // Update the current step tracking
  const setCurrentStep = useCallback((step: number) => {
    if (currentStepRef.current !== step) {
      currentStepRef.current = step;
      // Reduced logging frequency
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FormSubmissionState] Current step updated to: ${step}`);
      }
    }
  }, []);

  // Find or create a section in the submission data
  const findOrCreateSection = useCallback((sectionTitle: string) => {
    let sectionData = submissionDataRef.current.answeredSections.find(
      s => s.section_title === sectionTitle
    );
    
    if (!sectionData) {
      sectionData = {
        section_title: sectionTitle,
        responses: []
      };
      submissionDataRef.current.answeredSections.push(sectionData);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FormSubmissionState] Added new section: ${sectionTitle}`);
      }
    }
    
    return sectionData;
  }, []);

  // Process a section's visibility and its questions
  const processSection = useCallback((section: FormSection, currentValues: Record<string, any>) => {
    const shouldShowSection = evaluateCondition(section.show_if, currentValues);
    
    // Only log visibility changes or in debug mode (reduced frequency)
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log(`[FormSubmissionState] Section "${section.section_title}" visible: ${shouldShowSection}`);
    }
    
    if (!shouldShowSection) {
      // Remove any existing data for this section
      const sectionIndex = submissionDataRef.current.answeredSections.findIndex(
        s => s.section_title === section.section_title
      );
      
      if (sectionIndex !== -1) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[FormSubmissionState] Removing hidden section: ${section.section_title}`);
        }
        submissionDataRef.current.answeredSections.splice(sectionIndex, 1);
      }
      return;
    }
    
    // Find or create section in our submission data
    findOrCreateSection(section.section_title);
    
    // Process each question in the section
    section.questions.forEach(question => {
      processQuestion(question, section.section_title, currentValues);
    });
  }, [findOrCreateSection]);

  // Process a single question's visibility and answer
  const processQuestion = useCallback((
    question: FormQuestion, 
    sectionTitle: string, 
    currentValues: Record<string, any>
  ) => {
    try {
      const shouldShowQuestion = evaluateCondition(question.show_if, currentValues);
      
      // Very limited logging - only for development
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log(`[FormSubmissionState] Question "${question.id}" visible: ${shouldShowQuestion}`);
      }
      
      // Find the section in our data
      let sectionIndex = submissionDataRef.current.answeredSections.findIndex(
        s => s.section_title === sectionTitle
      );
      
      // If section doesn't exist yet, create it
      if (sectionIndex === -1) {
        findOrCreateSection(sectionTitle);
        sectionIndex = submissionDataRef.current.answeredSections.findIndex(
          s => s.section_title === sectionTitle
        );
      }
      
      // Safety check
      if (sectionIndex === -1) {
        throw new Error(`Section "${sectionTitle}" not found in submission data after creation attempt`);
      }
      
      // If question shouldn't be shown, remove any existing data
      if (!shouldShowQuestion) {
        const questionIndex = submissionDataRef.current.answeredSections[sectionIndex].responses.findIndex(
          r => r.id === question.id
        );
        
        if (questionIndex !== -1) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FormSubmissionState] Removing hidden question: ${question.id}`);
          }
          submissionDataRef.current.answeredSections[sectionIndex].responses.splice(questionIndex, 1);
          
          // Also remove any associated "other" fields
          const otherFieldId = `${question.id}_other`;
          const alternativeOtherFieldId = `${question.id}_övrigt`;
          
          const otherIndex = submissionDataRef.current.answeredSections[sectionIndex].responses.findIndex(
            r => r.id === otherFieldId || r.id === alternativeOtherFieldId
          );
          
          if (otherIndex !== -1) {
            submissionDataRef.current.answeredSections[sectionIndex].responses.splice(otherIndex, 1);
          }
        }
        return;
      }
      
      // Get the answer for this question
      const answer = currentValues[question.id];
      
      // Skip if answer is undefined, null, or empty string (but keep false and 0)
      const isEmpty = 
        answer === undefined || 
        answer === null || 
        (typeof answer === 'string' && answer.trim() === '');
      
      // Update or remove the answer
      const existingResponseIndex = submissionDataRef.current.answeredSections[sectionIndex].responses.findIndex(
        r => r.id === question.id
      );
      
      if (isEmpty) {
        // Remove the answer if it exists but is now empty
        if (existingResponseIndex !== -1) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FormSubmissionState] Removing empty answer for: ${question.id}`);
          }
          submissionDataRef.current.answeredSections[sectionIndex].responses.splice(existingResponseIndex, 1);
        }
      } else {
        // Add or update the answer
        if (existingResponseIndex !== -1) {
          submissionDataRef.current.answeredSections[sectionIndex].responses[existingResponseIndex].answer = answer;
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log(`[FormSubmissionState] Updated answer for: ${question.id}`);
          }
        } else {
          submissionDataRef.current.answeredSections[sectionIndex].responses.push({
            id: question.id,
            answer
          });
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FormSubmissionState] Added new answer for: ${question.id}`);
          }
        }
        
        // Handle "Other" option for radio buttons and dropdowns
        if (
          (question.type === 'radio' || question.type === 'dropdown') &&
          question.options && 
          question.options.includes('Övrigt') &&
          answer === 'Övrigt'
        ) {
          // Look for the associated "other" text input
          const otherFieldId = `${question.id}_other`;
          const alternativeOtherFieldId = `${question.id}_övrigt`;
          
          const otherAnswer = currentValues[otherFieldId] || currentValues[alternativeOtherFieldId];
          const otherFieldIdToUse = otherFieldId in currentValues ? otherFieldId : alternativeOtherFieldId;
          
          if (otherAnswer) {
            // Check if we already have this "other" answer
            const otherResponseIndex = submissionDataRef.current.answeredSections[sectionIndex].responses.findIndex(
              r => r.id === otherFieldIdToUse
            );
            
            if (otherResponseIndex !== -1) {
              submissionDataRef.current.answeredSections[sectionIndex].responses[otherResponseIndex].answer = otherAnswer;
              if (process.env.NODE_ENV === 'development') {
                console.log(`[FormSubmissionState] Updated "other" answer for: ${otherFieldIdToUse}`);
              }
            } else {
              submissionDataRef.current.answeredSections[sectionIndex].responses.push({
                id: otherFieldIdToUse,
                answer: otherAnswer
              });
              if (process.env.NODE_ENV === 'development') {
                console.log(`[FormSubmissionState] Added new "other" answer for: ${otherFieldIdToUse}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing question ${question.id} in section ${sectionTitle}:`, error);
    }
    
    // Clean up empty sections
    cleanEmptySections();
  }, [findOrCreateSection]);

  // Clean up any sections that no longer have answers
  const cleanEmptySections = useCallback(() => {
    const initialCount = submissionDataRef.current.answeredSections.length;
    
    submissionDataRef.current.answeredSections = submissionDataRef.current.answeredSections.filter(
      section => section.responses.length > 0
    );
    
    const removedCount = initialCount - submissionDataRef.current.answeredSections.length;
    if (removedCount > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[FormSubmissionState] Removed ${removedCount} empty sections`);
    }
  }, []);

  // Process all sections with debouncing to prevent excessive processing
  const processSectionsWithDebounce = useCallback((
    sections: FormSection[], 
    currentValues: Record<string, any>
  ) => {
    // Create a hash of the current values to detect changes
    const valuesHash = JSON.stringify(currentValues);
    
    // Skip processing if values haven't changed
    if (valuesHash === lastProcessedValuesRef.current) {
      return;
    }
    
    // Update last processed values
    lastProcessedValuesRef.current = valuesHash;
    
    // Clear any existing timer
    if (processingTimerRef.current !== null) {
      clearTimeout(processingTimerRef.current);
    }
    
    // Set a new timer for processing (debounce)
    processingTimerRef.current = window.setTimeout(() => {
      // Update counter for debugging
      setProcessingCount(prev => prev + 1);
      
      // Process each section
      sections.forEach(section => {
        processSection(section, currentValues);
      });
      
      processingTimerRef.current = null;
    }, 100); // 100ms debounce
  }, [processSection]);

  // Update the timestamp before final submission
  const finalizeSubmissionData = useCallback(() => {
    submissionDataRef.current.submissionTimestamp = new Date().toISOString();
    return {
      formattedAnswers: { ...submissionDataRef.current },
      rawAnswers: { /* Will be filled by the form submission hook */ },
      metadata: {
        formTemplateId: formTemplate.title,
        submittedAt: submissionDataRef.current.submissionTimestamp,
        version: "2.0"
      }
    };
  }, [formTemplate.title]);

  // Helper function to evaluate show_if conditions
  const evaluateCondition = (
    condition: { question: string; equals: string | string[] } | undefined,
    currentValues: Record<string, any>
  ): boolean => {
    if (!condition) return true;

    const { question, equals } = condition;
    const dependentValue = currentValues[question];

    if (Array.isArray(equals)) {
      return equals.includes(dependentValue);
    }

    return dependentValue === equals;
  };

  // For debugging - return the current processing count
  const getProcessingCount = useCallback(() => processingCount, [processingCount]);

  return {
    processSection,
    processQuestion,
    processSectionsWithDebounce,
    setCurrentStep,
    finalizeSubmissionData,
    getProcessingCount
  };
}
