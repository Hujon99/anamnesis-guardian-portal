/**
 * This hook manages the incremental construction of form submission data.
 * It tracks visible sections and questions in real-time as the user navigates
 * through the form, ensuring accurate capture of conditional fields.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FormTemplate, FormSection, FormQuestion, FormattedAnswerData, SubmissionData, DynamicFollowupQuestion } from "@/types/anamnesis";

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

    // Also look for dynamic follow-up questions with runtime IDs
    Object.keys(currentValues).forEach(key => {
      if (key.includes('_for_')) {
        // This is a dynamic follow-up question
        // Create a synthetic question object to process it
        const dynamicQuestion: DynamicFollowupQuestion = {
          id: key.split('_for_')[0],
          runtimeId: key,
          label: `Dynamic Question ${key}`, // This doesn't matter for processing
          type: 'text', // Default type, doesn't matter for processing
          parentId: key.split('_for_')[0],
          parentValue: key.split('_for_')[1].replace(/_/g, ' '),
          originalId: key.split('_for_')[0],
        };
        
        processQuestion(dynamicQuestion, section.section_title, currentValues);
      }
    });
  }, [findOrCreateSection]);

  // Process a single question's visibility and answer
  const processQuestion = useCallback((
    question: FormQuestion | DynamicFollowupQuestion, 
    sectionTitle: string, 
    currentValues: Record<string, any>
  ) => {
    try {
      // Check if this is a dynamic question with a runtime ID
      const isDynamicQuestion = 'runtimeId' in question;
      const questionId = isDynamicQuestion ? (question as DynamicFollowupQuestion).runtimeId : question.id;
      
      // For dynamic questions, we always want to include them if they have a value
      const shouldShowQuestion = isDynamicQuestion ? true : evaluateCondition(question.show_if, currentValues);
      
      // Very limited logging - only for development
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log(`[FormSubmissionState] Question "${questionId}" visible: ${shouldShowQuestion}`);
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
          r => r.id === questionId
        );
        
        if (questionIndex !== -1) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FormSubmissionState] Removing hidden question: ${questionId}`);
          }
          submissionDataRef.current.answeredSections[sectionIndex].responses.splice(questionIndex, 1);
          
          // Also remove any associated "other" fields
          const otherFieldId = `${questionId}_other`;
          const alternativeOtherFieldId = `${questionId}_övrigt`;
          
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
      const answer = currentValues[questionId];
      
      // Skip if answer is undefined, null, or empty string (but keep false and 0)
      const isEmpty = 
        answer === undefined || 
        answer === null || 
        (typeof answer === 'string' && answer.trim() === '') ||
        (Array.isArray(answer) && answer.length === 0);
      
      // Update or remove the answer
      const existingResponseIndex = submissionDataRef.current.answeredSections[sectionIndex].responses.findIndex(
        r => r.id === questionId
      );
      
      if (isEmpty) {
        // Remove the answer if it exists but is now empty
        if (existingResponseIndex !== -1) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FormSubmissionState] Removing empty answer for: ${questionId}`);
          }
          submissionDataRef.current.answeredSections[sectionIndex].responses.splice(existingResponseIndex, 1);
        }
      } else {
        // For dynamic questions, format the answer differently
        let processedAnswer = answer;
        
        if (isDynamicQuestion) {
          const dynamicQuestion = question as DynamicFollowupQuestion;
          processedAnswer = {
            parent_question: dynamicQuestion.parentId,
            parent_value: dynamicQuestion.parentValue,
            value: answer
          };
        }
        
        // Add or update the answer
        if (existingResponseIndex !== -1) {
          submissionDataRef.current.answeredSections[sectionIndex].responses[existingResponseIndex].answer = processedAnswer;
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log(`[FormSubmissionState] Updated answer for: ${questionId}`);
          }
        } else {
          submissionDataRef.current.answeredSections[sectionIndex].responses.push({
            id: questionId,
            answer: processedAnswer
          });
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FormSubmissionState] Added new answer for: ${questionId}`);
          }
        }
        
        // Handle "Other" option for radio buttons and dropdowns
        if (
          (question.type === 'radio' || question.type === 'dropdown') &&
          question.options && 
          (
            (typeof answer === 'string' && answer === 'Övrigt') || 
            (Array.isArray(answer) && answer.includes('Övrigt'))
          )
        ) {
          // Look for the associated "other" text input
          const otherFieldId = `${questionId}_other`;
          const alternativeOtherFieldId = `${questionId}_övrigt`;
          
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
      console.error(`Error processing question ${isDynamicQuestion ? (question as DynamicFollowupQuestion).runtimeId : question.id} in section ${sectionTitle}:`, error);
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
    
    // Set a new timer for processing (debounce) - reduced from 100ms to 50ms for submission
    processingTimerRef.current = window.setTimeout(() => {
      // Update counter for debugging
      setProcessingCount(prev => prev + 1);
      
      // Process each section
      sections.forEach(section => {
        processSection(section, currentValues);
      });
      
      processingTimerRef.current = null;
    }, 50); // 50ms debounce, reduced from 100ms
  }, [processSection]);

  // Immediately process sections without debouncing for submission
  const processAllSectionsImmediately = useCallback((
    sections: Array<FormSection[]>,
    currentValues: Record<string, any>
  ) => {
    console.log('[FormSubmissionState] Processing all sections immediately for submission');
    console.log('[FormSubmissionState] Current form values:', currentValues);
    
    // Process each section in each step
    sections.forEach(stepSections => {
      stepSections.forEach(section => {
        processSection(section, currentValues);
      });
    });
    
    return submissionDataRef.current;
  }, [processSection]);

  // Update the timestamp before final submission
  const finalizeSubmissionData = useCallback((): SubmissionData => {
    console.log('[FormSubmissionState] Finalizing submission data');
    
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

  // Updated helper function to evaluate show_if conditions with the new type definition
  const evaluateCondition = (
    condition: { question: string; equals?: string | string[]; contains?: string; } | undefined,
    currentValues: Record<string, any>
  ): boolean => {
    // If no condition is provided, always show the element
    if (!condition) return true;

    // Check if the dependent question exists in the current values
    const { question, equals, contains } = condition;
    const dependentValue = currentValues[question];
    
    // Handle "contains" condition for checkbox array values
    if (contains !== undefined) {
      if (Array.isArray(dependentValue)) {
        return dependentValue.includes(contains);
      }
      // For non-array values, check equality
      return dependentValue === contains;
    }
    
    // Handle "equals" condition
    if (equals !== undefined) {
      // Handle array of possible values
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
      
      // Handle single value
      return dependentValue === equals;
    }
    
    // If no specific condition (equals/contains) is provided but the question is specified,
    // show the element if the value is truthy
    return !!dependentValue;
  };

  // For debugging - return the current processing count
  const getProcessingCount = useCallback(() => processingCount, [processingCount]);

  return {
    processSection,
    processQuestion,
    processSectionsWithDebounce,
    processAllSectionsImmediately,
    setCurrentStep,
    finalizeSubmissionData,
    getProcessingCount
  };
}
