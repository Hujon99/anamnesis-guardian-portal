/**
 * This hook manages the incremental construction of form submission data.
 * It tracks visible sections and questions in real-time as the user navigates
 * through the form, ensuring accurate capture of conditional fields.
 */

import { useCallback, useEffect, useRef } from "react";
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
  
  // Track current step for section awareness
  const currentStepRef = useRef<number>(0);

  // Update the current step tracking
  const setCurrentStep = useCallback((step: number) => {
    currentStepRef.current = step;
    console.log(`[FormSubmissionState] Current step updated to: ${step}`);
  }, []);

  // Process a section's visibility and its questions
  const processSection = useCallback((section: FormSection, currentValues: Record<string, any>) => {
    const shouldShowSection = evaluateCondition(section.show_if, currentValues);
    
    // Debug visibility of this section
    console.log(`[FormSubmissionState] Section "${section.section_title}" visible: ${shouldShowSection}`);
    
    if (!shouldShowSection) {
      // Remove any existing data for this section
      const sectionIndex = submissionDataRef.current.answeredSections.findIndex(
        s => s.section_title === section.section_title
      );
      
      if (sectionIndex !== -1) {
        console.log(`[FormSubmissionState] Removing hidden section: ${section.section_title}`);
        submissionDataRef.current.answeredSections.splice(sectionIndex, 1);
      }
      return;
    }
    
    // Find or create section in our submission data
    let sectionData = submissionDataRef.current.answeredSections.find(
      s => s.section_title === section.section_title
    );
    
    if (!sectionData) {
      sectionData = {
        section_title: section.section_title,
        responses: []
      };
      submissionDataRef.current.answeredSections.push(sectionData);
      console.log(`[FormSubmissionState] Added new section: ${section.section_title}`);
    }
    
    // Process each question in the section
    section.questions.forEach(question => {
      processQuestion(question, section.section_title, currentValues);
    });
  }, []);

  // Process a single question's visibility and answer
  const processQuestion = useCallback((
    question: FormQuestion, 
    sectionTitle: string, 
    currentValues: Record<string, any>
  ) => {
    const shouldShowQuestion = evaluateCondition(question.show_if, currentValues);
    
    // Debug visibility of this question
    console.log(`[FormSubmissionState] Question "${question.id}" visible: ${shouldShowQuestion}`);
    
    // Find the section in our data
    const sectionIndex = submissionDataRef.current.answeredSections.findIndex(
      s => s.section_title === sectionTitle
    );
    
    if (sectionIndex === -1) {
      console.error(`[FormSubmissionState] Section "${sectionTitle}" not found in submission data`);
      return;
    }
    
    // If question shouldn't be shown, remove any existing data
    if (!shouldShowQuestion) {
      const questionIndex = submissionDataRef.current.answeredSections[sectionIndex].responses.findIndex(
        r => r.id === question.id
      );
      
      if (questionIndex !== -1) {
        console.log(`[FormSubmissionState] Removing hidden question: ${question.id}`);
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
        console.log(`[FormSubmissionState] Removing empty answer for: ${question.id}`);
        submissionDataRef.current.answeredSections[sectionIndex].responses.splice(existingResponseIndex, 1);
      }
    } else {
      // Add or update the answer
      if (existingResponseIndex !== -1) {
        submissionDataRef.current.answeredSections[sectionIndex].responses[existingResponseIndex].answer = answer;
        console.log(`[FormSubmissionState] Updated answer for: ${question.id}`, answer);
      } else {
        submissionDataRef.current.answeredSections[sectionIndex].responses.push({
          id: question.id,
          answer
        });
        console.log(`[FormSubmissionState] Added new answer for: ${question.id}`, answer);
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
            console.log(`[FormSubmissionState] Updated "other" answer for: ${otherFieldIdToUse}`, otherAnswer);
          } else {
            submissionDataRef.current.answeredSections[sectionIndex].responses.push({
              id: otherFieldIdToUse,
              answer: otherAnswer
            });
            console.log(`[FormSubmissionState] Added new "other" answer for: ${otherFieldIdToUse}`, otherAnswer);
          }
        }
      }
    }
    
    // Clean up empty sections
    cleanEmptySections();
  }, []);

  // Clean up any sections that no longer have answers
  const cleanEmptySections = useCallback(() => {
    const initialCount = submissionDataRef.current.answeredSections.length;
    
    submissionDataRef.current.answeredSections = submissionDataRef.current.answeredSections.filter(
      section => section.responses.length > 0
    );
    
    const removedCount = initialCount - submissionDataRef.current.answeredSections.length;
    if (removedCount > 0) {
      console.log(`[FormSubmissionState] Removed ${removedCount} empty sections`);
    }
  }, []);

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

  return {
    processSection,
    processQuestion,
    setCurrentStep,
    finalizeSubmissionData
  };
}
