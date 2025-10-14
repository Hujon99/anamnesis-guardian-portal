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
import { validateFieldValue } from "@/utils/fieldValidation";

interface SingleQuestionLayoutProps {
  createdByName?: string | null;
}

export const SingleQuestionLayout: React.FC<SingleQuestionLayoutProps> = ({ createdByName }) => {
  const {
    visibleSections,
    watchedValues,
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
  
  // CRITICAL: Isolated state for all answers to prevent leakage between questions
  // Form state will only ever contain the CURRENT question's value
  const [allAnswers, setAllAnswers] = useState<Record<string, any>>({});

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

  // Flatten all visible questions with section context - memoized for performance
  // Uses visibleSections from useConditionalFields which already handles dynamic follow-up questions
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
        // All questions are already filtered and processed by useConditionalFields
        // This includes both regular questions and dynamic follow-ups
        section.questions.forEach((q, qIndex) => {
          questions.push({
            question: q,
            sectionTitle: section.section_title,
            sectionIndex,
            questionIndex: qIndex
          });
        });
      });
    });

    return questions;
  }, [visibleSections]);

  const currentQuestion = allQuestions[currentQuestionIndex];
  const totalQuestions = allQuestions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  
  // CRITICAL: Isolate form state to only the current question
  // This prevents values from leaking between questions
  useEffect(() => {
    if (!currentQuestion) return;
    
    const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
    const savedAnswer = allAnswers[fieldId];
    
    // Step 1: Clear ALL values from React Hook Form state
    const currentValues = form.getValues();
    Object.keys(currentValues).forEach(key => {
      form.setValue(key, undefined, { shouldValidate: false, shouldDirty: false });
    });
    
    // Step 2: Set ONLY this question's value (if it exists in our saved answers)
    if (savedAnswer !== undefined && savedAnswer !== null && savedAnswer !== '') {
      form.setValue(fieldId, savedAnswer, { shouldValidate: false, shouldDirty: false });
    }
  }, [currentQuestionIndex, currentQuestion, allAnswers, form]);
  
  // Process form sections for proper submission handling
  useEffect(() => {
    if (processSectionsWithDebounce && visibleSections.length > 0) {
      const allSections = visibleSections.flat();
      processSectionsWithDebounce(allSections, watchedValues);
    }
  }, [visibleSections, watchedValues, processSectionsWithDebounce]);


  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
    
    const value = form.watch(fieldId);
    
    // First check if value exists at all
    if (value === undefined || value === null || value === '') return false;
    if (value === false) return false;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    
    // CRITICAL: Validate that the value is appropriate for THIS question
    // This prevents leaked values from other questions from marking this as answered
    if (!validateFieldValue(value, currentQuestion.question)) {
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      // CRITICAL: Save the current question's answer before navigating
      if (currentQuestion) {
        const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
        const answer = form.watch(fieldId);
        
        // Save to our isolated state
        setAllAnswers(prev => ({ ...prev, [fieldId]: answer }));
      }
      
      setAnimationClass("slide-out-left");
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        setAnimationClass("slide-in-right");
        setTimeout(() => {
          setAnimationClass("");
        }, 100);
      }, 200);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      // CRITICAL: Save the current question's answer before navigating
      if (currentQuestion) {
        const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
        const answer = form.watch(fieldId);
        
        // Save to our isolated state
        setAllAnswers(prev => ({ ...prev, [fieldId]: answer }));
      }
      
      setAnimationClass("slide-out-right");
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev - 1);
        setAnimationClass("slide-in-left");
        setTimeout(() => {
          setAnimationClass("");
        }, 100);
      }, 200);
    }
  };

  const handleFormSubmit = () => {
    // CRITICAL: Save the final question's answer before submitting
    if (currentQuestion) {
      const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
      const answer = form.watch(fieldId);
      
      // Create final answers object with all saved answers plus the current one
      const finalAnswers = { ...allAnswers, [fieldId]: answer };
      
      toast.info("Skickar in dina svar...");
      const submitHandler = contextHandleSubmit();
      // Submit the isolated answers state, NOT form.getValues()
      submitHandler(finalAnswers);
    }
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
