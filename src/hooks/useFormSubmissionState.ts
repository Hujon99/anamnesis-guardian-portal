/**
 * This hook manages the incremental construction of form submission data.
 * It tracks visible sections and questions in real-time as the user navigates
 * through the form, ensuring accurate capture of conditional fields.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FormTemplate, FormSection, FormQuestion, FormattedAnswerData } from "@/types/anamnesis";

// Debounce utility (or import from 'lodash.debounce')
const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export function useFormSubmissionState(formTemplate: FormTemplate) {
  // Use ref for mutable submission data to avoid unnecessary re-renders
  const submissionDataRef = useRef<FormattedAnswerData>({
    formTitle: formTemplate.title,
    submissionTimestamp: "", // Will be set on finalization
    answeredSections: [],
    // Add isOpticianSubmission flag here if needed globally, or add it later
  });
  
  // Debugging state to track processing
  const [processingCount, setProcessingCount] = useState(0);
  
  // Track current step for section awareness
  const currentStepRef = useRef<number>(0);
  
  // Prevent excessive processing with a debounce mechanism
  const processingTimerRef = useRef<number | null>(null);
  const lastProcessedValuesRef = useRef<string>("");

  // Helper function to evaluate show_if conditions - MOVED TO THE TOP
  const evaluateCondition = useCallback(
    (
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
    },
    []
  );

  // Clean up any sections that no longer have answers
  const cleanEmptySections = useCallback(() => {
    const initialCount = submissionDataRef.current.answeredSections.length;
    
    submissionDataRef.current.answeredSections = submissionDataRef.current.answeredSections.filter(
      section => section.responses.length > 0
    );
    
    const removedCount = initialCount - submissionDataRef.current.answeredSections.length;
    if (removedCount > 0) {
      // console.log(`[FormSubmissionState/cleanEmptySections] Removed ${removedCount} empty sections`);
    }
  }, []);

  // Update the current step tracking
  const setCurrentStep = useCallback((step: number) => {
    if (currentStepRef.current !== step) {
      currentStepRef.current = step;
      // Reduced logging frequency
      if (process.env.NODE_ENV === 'development') {
        // console.log(`[FormSubmissionState] Current step updated to: ${step}`);
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
      // console.log(`[FormSubmissionState] Added new section: ${sectionTitle}`);
    }
    
    return sectionData;
  }, []);

  // Process a single question's visibility and answer
  const processQuestion = useCallback((
    question: FormQuestion,
    sectionTitle: string,
    currentValues: Record<string, any>
  ) => {
    try {
      const shouldShowQuestion = evaluateCondition(question.show_if, currentValues);
      // console.log(`[FormSubmissionState/processQuestion] Question "${question.id}" visible: ${shouldShowQuestion}`);

      // Find the section in our data
      const sectionIndex = submissionDataRef.current.answeredSections.findIndex(
        s => s.section_title === sectionTitle
      );

      // If section doesn't exist yet, create it
      let currentSectionIndex = sectionIndex;
      if (sectionIndex === -1) {
        // Create new section and get its index
        const newSection = {
          section_title: sectionTitle,
          responses: []
        };
        submissionDataRef.current.answeredSections.push(newSection);
        currentSectionIndex = submissionDataRef.current.answeredSections.length - 1;
        // console.log(`[FormSubmissionState/processQuestion] Created new section: ${sectionTitle}`);
      }

      // If question shouldn't be shown, remove any existing data
      if (!shouldShowQuestion) {
        if (currentSectionIndex !== -1) {
          const questionIndex = submissionDataRef.current.answeredSections[currentSectionIndex].responses.findIndex(
            r => r.id === question.id
          );

          if (questionIndex !== -1) {
            // console.log(`[FormSubmissionState/processQuestion] Removing hidden question: ${question.id}`);
            submissionDataRef.current.answeredSections[currentSectionIndex].responses.splice(questionIndex, 1);
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

      // For debugging, log the question and its answer
      // console.log(`[FormSubmissionState/processQuestion] Question: ${question.id}, Answer: ${isEmpty ? 'empty' : JSON.stringify(answer)}`);

      // This is critical - force log the current submission data structure
      // console.log(`[FormSubmissionState/processQuestion] Current submission data structure:`,
      //   JSON.stringify(submissionDataRef.current, null, 2));

      // Update or remove the answer
      if (isEmpty) {
        // Remove the answer if it exists but is now empty
        if (currentSectionIndex !== -1) {
          const existingResponseIndex = submissionDataRef.current.answeredSections[currentSectionIndex].responses.findIndex(
            r => r.id === question.id
          );

          if (existingResponseIndex !== -1) {
            // console.log(`[FormSubmissionState/processQuestion] Removing empty answer for: ${question.id}`);
            submissionDataRef.current.answeredSections[currentSectionIndex].responses.splice(existingResponseIndex, 1);
          }
        }
      } else {
        // Add or update the answer - ensure we're working with the right section index
        if (currentSectionIndex !== -1) {
          const existingResponseIndex = submissionDataRef.current.answeredSections[currentSectionIndex].responses.findIndex(
            r => r.id === question.id
          );

          if (existingResponseIndex !== -1) {
            submissionDataRef.current.answeredSections[currentSectionIndex].responses[existingResponseIndex].answer = answer;
            // console.log(`[FormSubmissionState/processQuestion] Updated answer for: ${question.id}`);
          } else {
            submissionDataRef.current.answeredSections[currentSectionIndex].responses.push({
              id: question.id,
              answer
            });
            // console.log(`[FormSubmissionState/processQuestion] Added new answer for: ${question.id}`);
          }
        } else {
          console.error(`[FormSubmissionState/processQuestion] Cannot find section for question: ${question.id}`);
        }
      }
    } catch (error) {
      console.error(`Error processing question ${question.id} in section ${sectionTitle}:`, error);
    }

    // Clean up empty sections
    cleanEmptySections();
  }, [evaluateCondition, cleanEmptySections]);

  // Process a section's visibility and its questions
  const processSection = useCallback((section: FormSection, currentValues: Record<string, any>) => {
    // console.log(`[FormSubmissionState/processSection] Processing section "${section.section_title}"`);

    const shouldShowSection = evaluateCondition(section.show_if, currentValues);
    // console.log(`[FormSubmissionState/processSection] Section "${section.section_title}" visible: ${shouldShowSection}`);

    if (!shouldShowSection) {
      // Remove any existing data for this section
      const sectionIndex = submissionDataRef.current.answeredSections.findIndex(
        s => s.section_title === section.section_title
      );

      if (sectionIndex !== -1) {
        // console.log(`[FormSubmissionState/processSection] Removing hidden section: ${section.section_title}`);
        submissionDataRef.current.answeredSections.splice(sectionIndex, 1);
      }
      return;
    }

    // Find or create section in our submission data
    findOrCreateSection(section.section_title); // Ensure section exists before processing questions

    // Process each question in the section
    section.questions.forEach(question => {
      processQuestion(question, section.section_title, currentValues); // Now processQuestion is defined
    });
  }, [findOrCreateSection, evaluateCondition, processQuestion]); // processQuestion is now available here

  // Process all sections with debouncing to prevent excessive processing
  const processSectionsWithDebounce = useCallback(
    debounce((sections: FormSection[], currentValues: Record<string, any>) => {
      // Create a hash of the current values to detect changes
      const valuesHash = JSON.stringify(currentValues);
      
      // Skip processing if values haven't changed
      if (valuesHash === lastProcessedValuesRef.current) {
        return;
      }
      
      // Update last processed values
      lastProcessedValuesRef.current = valuesHash;
      
      // console.log(`[FormSubmissionState/processSectionsWithDebounce] Processing ${sections.length} sections`);
      
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
        
        // console.log(`[FormSubmissionState/processSectionsWithDebounce] Current submission data:`, 
        //   JSON.stringify(submissionDataRef.current, null, 2));
        
        processingTimerRef.current = null;
      }, 100); // 100ms debounce
    }, 300), // 300ms debounce time
    [processSection] // Dependencies for the debounced function
  );

  // Update the timestamp and return the final data structure
  const finalizeSubmissionData = useCallback((): FormattedAnswerData => {
    submissionDataRef.current.submissionTimestamp = new Date().toISOString();

    console.log(`[FormSubmissionState/finalizeSubmissionData] Final formatted data:`,
      JSON.stringify(submissionDataRef.current, null, 2));

    // Return the ref's current value directly
    return { ...submissionDataRef.current }; // Return a copy

  }, []);

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
