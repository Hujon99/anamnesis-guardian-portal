/**
 * This component provides a single-question-at-a-time form layout optimized for mobile and tablet use.
 * It shows one question per screen with touch-friendly inputs and navigation, while maintaining
 * section headers as "chapters" and preserving all existing form functionality.
 */

import React, { useState, useEffect, useMemo } from "react";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { TouchFriendlyFieldRenderer } from "./TouchFriendlyFieldRenderer";
import { FormStepContent } from "./FormStepContent";
import { LegalConsentStep } from "@/components/Legal/LegalConsentStep";
import { useFormContext } from "@/contexts/FormContext";
import { FormQuestion, DynamicFollowupQuestion, FormSection } from "@/types/anamnesis";
import { toast } from "sonner";
import { generateRuntimeId } from "@/utils/questionIdUtils";

interface SingleQuestionLayoutProps {
  createdByName?: string | null;
}

export const SingleQuestionLayout: React.FC<SingleQuestionLayoutProps> = ({ createdByName }) => {
  const {
    visibleSections,
    isSubmitting,
    handleSubmit: contextHandleSubmit,
    form,
    processSectionsWithDebounce,
    showConsentStep,
    consentGiven,
    onConsentChange,
    setShowConsentStep
  } = useFormContext();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState("");

  // Show consent step if needed
  if (showConsentStep) {
    return (
      <LegalConsentStep
        consentGiven={consentGiven}
        onConsentChange={onConsentChange}
        onContinue={() => setShowConsentStep(false)}
        organizationName="din optiker"
      />
    );
  }

  // Get current form values using immediate watch (not debounced)
  const currentFormValues = form.watch();

  // Flatten all visible questions with section context - memoized for performance
  const allQuestions = useMemo(() => {
    if (!visibleSections || visibleSections.length === 0) return [];
    
    const questions: Array<{
      question: FormQuestion | DynamicFollowupQuestion;
      sectionTitle: string;
      sectionIndex: number;
      questionIndex: number;
    }> = [];

    visibleSections.forEach((sections, sectionIndex) => {
      sections.forEach((section) => {
        // Filter visible questions
        section.questions.forEach((q, qIndex) => {
          // Skip follow-up templates
          if (q.is_followup_template) return;
          
          // Skip optician-only questions in patient mode
          if (q.show_in_mode === "optician") return;
          
          // Check conditional visibility using CURRENT form values
          if (!shouldShowQuestion(q, currentFormValues)) return;
          
          questions.push({
            question: q,
            sectionTitle: section.section_title,
            sectionIndex,
            questionIndex: qIndex
          });
        });

        // Add dynamic follow-up questions using CURRENT form values
        const dynamicQuestions = getDynamicQuestionsForSection(section, currentFormValues);
        dynamicQuestions.forEach((question, qIndex) => {
          questions.push({
            question,
            sectionTitle: section.section_title,
            sectionIndex,
            questionIndex: section.questions.length + qIndex
          });
        });
      });
    });

    return questions;
  }, [visibleSections, currentFormValues]);

  const currentQuestion = allQuestions[currentQuestionIndex];
  const totalQuestions = allQuestions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  
  // Process form sections for proper submission handling
  useEffect(() => {
    if (processSectionsWithDebounce && visibleSections.length > 0) {
      const allSections = visibleSections.flat();
      processSectionsWithDebounce(allSections, currentFormValues);
    }
  }, [visibleSections, currentFormValues, processSectionsWithDebounce]);

  // Function to clear invalid field values but preserve valid answers
  const clearInvalidFieldValues = () => {
    const currentQuestionIds = allQuestions.map(q => 
      (q.question as DynamicFollowupQuestion).runtimeId || q.question.id
    );
    
    // Only clear fields that don't correspond to any current questions
    // This preserves answers needed for follow-up question logic
    Object.keys(currentFormValues).forEach(fieldKey => {
      if (!currentQuestionIds.includes(fieldKey)) {
        form.setValue(fieldKey, undefined, { shouldValidate: false, shouldDirty: false });
      }
    });
    
    // Don't clear the current question field - let TouchFriendlyFieldRenderer handle inappropriate values
    // This allows follow-up questions to work properly
  };

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
    
    // Använd form.watch direkt för omedelbar feedback (inte watchedValues som är debounced)
    const value = form.watch(fieldId);
    
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  // Reset field when question changes to ensure clean state
  useEffect(() => {
    if (!currentQuestion) return;
    
    const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
    
    // Get all currently visible question IDs
    const visibleQuestionIds = allQuestions.map(q => 
      (q.question as DynamicFollowupQuestion).runtimeId || q.question.id
    );
    
    // Get all current form values
    const currentValues = form.getValues();
    
    // Clear any fields that are NOT in the visible questions list
    Object.keys(currentValues).forEach(key => {
      if (!visibleQuestionIds.includes(key) && !key.startsWith('_meta_')) {
        form.setValue(key, undefined, { shouldValidate: false, shouldDirty: false });
      }
    });
    
    // CRITICAL: For the current question, ALWAYS reset to undefined first
    // This ensures we start with a clean slate regardless of previous state
    form.setValue(fieldId, undefined, { shouldValidate: false, shouldDirty: false });
    
    // Then immediately check if we have a VALID saved answer for THIS specific question
    const savedValue = currentValues[fieldId];
    if (savedValue !== undefined && savedValue !== null && savedValue !== '') {
      // Validate that the saved value is actually valid for this question's options
      const isValidForQuestion = validateAnswerForQuestion(savedValue, currentQuestion.question);
      
      if (isValidForQuestion) {
        // Only restore if the value is valid for THIS question
        form.setValue(fieldId, savedValue, { shouldValidate: false, shouldDirty: true });
      }
    }
  }, [currentQuestionIndex, currentQuestion, form, allQuestions]);

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setAnimationClass("slide-out-left");
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        setAnimationClass("slide-in-right");
        setTimeout(() => {
          setAnimationClass("");
          // Clear field values after navigation is complete
          clearInvalidFieldValues();
        }, 100);
      }, 200);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setAnimationClass("slide-out-right");
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev - 1);
        setAnimationClass("slide-in-left");
        setTimeout(() => {
          setAnimationClass("");
          // Clear field values after navigation is complete
          clearInvalidFieldValues();
        }, 100);
      }, 200);
    }
  };

  const handleFormSubmit = () => {
    toast.info("Skickar in dina svar...");
    const submitHandler = contextHandleSubmit();
    submitHandler(form.getValues());
  };

  if (totalQuestions === 0) {
    return (
      <CardContent className="text-center py-12">
        <p className="text-muted-foreground">Inga frågor att visa</p>
      </CardContent>
    );
  }

  return (
    <>
      {/* Header with progress */}
      <div className="p-6 border-b bg-surface_light">
        <div className="space-y-4">
          {/* Chapter/Section indicator */}
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {currentQuestion.sectionTitle}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Fråga {currentQuestionIndex + 1}</span>
              <span>{totalQuestions} frågor totalt</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Created by info */}
          {createdByName && (
            <p className="text-center text-sm text-muted-foreground">
              Undersökning skapad av {createdByName}
            </p>
          )}
        </div>
      </div>

      {/* Question content */}
      <CardContent className="flex-1 p-6 md:p-8">
        <div className={`transition-all duration-300 ${animationClass} min-h-[400px] flex flex-col justify-center`}>
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question number indicator */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    {currentQuestionIndex + 1}
                  </div>
                  <span>av {totalQuestions}</span>
                </div>
              </div>

              {/* Question */}
              <div className="max-w-2xl mx-auto">
                <TouchFriendlyFieldRenderer
                  question={currentQuestion.question}
                  error={form.formState.errors[(currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id]}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Navigation */}
      <CardFooter className="p-6 border-t bg-surface_light">
        <div className="w-full space-y-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="h-12 px-6"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Föregående
            </Button>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <Button
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="h-12 px-8 bg-accent_teal hover:bg-accent_teal/90 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isSubmitting ? "Skickar..." : "Skicka in"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isCurrentQuestionAnswered() || currentQuestionIndex >= totalQuestions - 1}
                className="h-12 px-6"
              >
                Nästa
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Answer status indicator */}
          <div className="text-center">
            {isCurrentQuestionAnswered() ? (
              <div className="inline-flex items-center gap-2 text-sm text-accent_teal">
                <CheckCircle className="w-4 h-4" />
                <span>Besvarat</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Besvara frågan för att fortsätta
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            All information behandlas konfidentiellt och används endast för din synundersökning.
          </p>
        </div>
      </CardFooter>
    </>
  );
};

// Helper functions
function shouldShowQuestion(question: FormQuestion, values: Record<string, any>): boolean {
  if (!question.show_if) return true;
  
  const { question: dependentQuestionId, equals, contains } = question.show_if;
  const dependentValue = values[dependentQuestionId];
  
  if (contains !== undefined) {
    if (Array.isArray(dependentValue)) {
      return dependentValue.includes(contains);
    }
    return dependentValue === contains;
  }
  
  if (equals !== undefined) {
    if (Array.isArray(equals)) {
      return equals.includes(dependentValue);
    }
    return dependentValue === equals;
  }
  
  return !!dependentValue;
}

/**
 * Generate dynamic follow-up questions based on current form values.
 * This uses the same logic as FormSection.tsx for consistency.
 */
function getDynamicQuestionsForSection(section: FormSection, values: Record<string, any>): DynamicFollowupQuestion[] {
  const dynamicQuestions: DynamicFollowupQuestion[] = [];

  // Iterate through each question in the section
  section.questions.forEach((question) => {
    // Check if this question has follow-up questions defined
    const followupQuestionIds = question.followup_question_ids;
    
    if (!followupQuestionIds || followupQuestionIds.length === 0) {
      return; // Skip if no follow-ups
    }

    // Get the current value for this question
    const parentValue = values[question.id];
    
    // Determine selected values (handle both single and array values)
    let selectedValues: string[] = [];
    
    if (Array.isArray(parentValue)) {
      selectedValues = parentValue.filter(v => v != null && v !== '');
    } else if (parentValue != null && parentValue !== '') {
      selectedValues = [parentValue];
    }

    // Skip if no values selected
    if (selectedValues.length === 0) {
      return;
    }

    // For each selected value, create dynamic follow-up questions
    selectedValues.forEach((value) => {
      followupQuestionIds.forEach((followupId) => {
        const template = section.questions.find(
          (q) => q.id === followupId && q.is_followup_template
        );

        if (template) {
          // Use the sanitized utility function to generate runtime ID
          const runtimeId = generateRuntimeId(template.id, value);
          
          // Only add if not already present
          if (!dynamicQuestions.find(dq => dq.runtimeId === runtimeId)) {
            const dynamicQuestion: DynamicFollowupQuestion = {
              ...template,
              parentId: question.id,
              parentValue: value,
              runtimeId: runtimeId,
              originalId: template.id,
              label: template.label.replace(/\{option\}/g, value),
            };

            // Remove the template flag so it's treated as a regular question
            delete (dynamicQuestion as any).is_followup_template;
            dynamicQuestions.push(dynamicQuestion);
          }
        }
      });
    });
  });

  return dynamicQuestions;
};

/**
 * Validate that a saved answer is appropriate for the current question.
 * Prevents values from one question leaking into another.
 */
function validateAnswerForQuestion(value: any, question: FormQuestion | DynamicFollowupQuestion): boolean {
  if (value === undefined || value === null || value === '') return false;
  
  // For questions with options (radio, checkbox, dropdown), verify value matches options
  if ((question.type === "radio" || question.type === "dropdown") && question.options) {
    const validOptions = question.options.map(option => 
      typeof option === 'string' ? option : option.value
    );
    return validOptions.includes(value);
  }
  
  // For checkbox questions, ensure all values are valid options
  if (question.type === "checkbox" && question.options && Array.isArray(value)) {
    const validOptions = question.options.map(option => 
      typeof option === 'string' ? option : option.value
    );
    return value.every(v => validOptions.includes(v));
  }
  
  // For text/number questions, any non-empty value is valid
  if (question.type === "text" || question.type === "number") {
    return true;
  }
  
  return false;
}