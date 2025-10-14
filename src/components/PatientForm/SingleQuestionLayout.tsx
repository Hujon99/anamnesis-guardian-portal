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

  // Cleanup invisible fields (not in visible questions list)
  useEffect(() => {
    // Samla alla synliga field IDs
    const visibleFieldIds = allQuestions.map(q => 
      (q.question as DynamicFollowupQuestion).runtimeId || q.question.id
    );
    
    const currentValues = form.getValues();
    
    // Rensa ENDAST fält som inte är synliga OCH inte är metadata
    Object.keys(currentValues).forEach(key => {
      if (!visibleFieldIds.includes(key) && !key.startsWith('_meta_')) {
        form.setValue(key, undefined, { shouldValidate: false, shouldDirty: false });
      }
    });
  }, [allQuestions, form]);

  const handleNext = () => {
    if (currentQuestionIndex >= totalQuestions - 1) return;
    
    const nextIndex = currentQuestionIndex + 1;
    const nextQuestion = allQuestions[nextIndex];
    
    if (!nextQuestion) return;
    
    // KRITISKT: Rensa nästa frågas fält INNAN navigation
    const nextFieldId = (nextQuestion.question as DynamicFollowupQuestion).runtimeId || nextQuestion.question.id;
    form.setValue(nextFieldId, undefined, { shouldValidate: false, shouldDirty: false });
    
    // Navigera med animation
    setAnimationClass("slide-out-left");
    setTimeout(() => {
      setCurrentQuestionIndex(nextIndex);
      setAnimationClass("slide-in-right");
      setTimeout(() => setAnimationClass(""), 100);
    }, 200);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex <= 0) return;
    
    const prevIndex = currentQuestionIndex - 1;
    const prevQuestion = allQuestions[prevIndex];
    
    if (!prevQuestion) return;
    
    // KRITISKT: Kontrollera om vi har ett giltigt sparat svar
    const prevFieldId = (prevQuestion.question as DynamicFollowupQuestion).runtimeId || prevQuestion.question.id;
    const savedValue = form.getValues()[prevFieldId];
    
    // Om inget giltigt svar finns, rensa fältet
    if (savedValue === undefined || savedValue === null || savedValue === '') {
      form.setValue(prevFieldId, undefined, { shouldValidate: false, shouldDirty: false });
    }
    // Om det finns ett giltigt svar behöver vi inte göra något - det finns redan i form state
    
    // Navigera med animation
    setAnimationClass("slide-out-right");
    setTimeout(() => {
      setCurrentQuestionIndex(prevIndex);
      setAnimationClass("slide-in-left");
      setTimeout(() => setAnimationClass(""), 100);
    }, 200);
  };

  const handleFormSubmit = () => {
    console.log("Form submit triggered");
    console.log("Current question index:", currentQuestionIndex);
    console.log("Total questions:", totalQuestions);
    console.log("Is last question:", currentQuestionIndex === totalQuestions - 1);
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
      <CardContent className="flex-1 p-4 md:p-8 overflow-x-hidden">
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
              <div className="w-full max-w-2xl mx-auto px-2">
                <TouchFriendlyFieldRenderer
                  key={currentQuestionIndex}
                  question={currentQuestion.question}
                  error={form.formState.errors[(currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id]}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Navigation */}
      <CardFooter className="p-4 md:p-6 border-t bg-surface_light sticky bottom-0">
        <div className="w-full space-y-4">
          <div className="flex justify-between items-center gap-2 md:gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="h-12 px-4 md:px-6 flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Föregående</span>
              <span className="sm:hidden">Föreg.</span>
            </Button>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <Button
                onClick={handleFormSubmit}
                disabled={isSubmitting || !isCurrentQuestionAnswered()}
                className="h-12 px-4 md:px-8 bg-accent_teal hover:bg-accent_teal/90 text-white flex-shrink-0"
              >
                <CheckCircle className="w-4 h-4 mr-1 md:mr-2" />
                {isSubmitting ? "Skickar..." : "Skicka in"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isCurrentQuestionAnswered()}
                className="h-12 px-4 md:px-6 flex-shrink-0"
              >
                Nästa
                <ChevronRight className="w-4 h-4 ml-1 md:ml-2" />
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
