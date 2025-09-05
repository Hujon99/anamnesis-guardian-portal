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
import { useFormContext } from "@/contexts/FormContext";
import { FormQuestion, DynamicFollowupQuestion } from "@/types/anamnesis";
import { toast } from "sonner";

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
    processSectionsWithDebounce
  } = useFormContext();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState("");

  // Flatten all visible questions with section context
  const allQuestions = useMemo(() => {
    const questions: Array<{
      question: FormQuestion | DynamicFollowupQuestion;
      sectionTitle: string;
      sectionIndex: number;
      questionIndex: number;
    }> = [];

    visibleSections.forEach((sections, sectionIndex) => {
      sections.forEach((section) => {
        // Add regular questions
        const visibleQuestions = section.questions.filter(q => {
          if (q.is_followup_template) return false;
          if (q.show_in_mode === "optician") return false; // Hide optician questions in patient mode
          return shouldShowQuestion(q, watchedValues);
        });

        visibleQuestions.forEach((question, qIndex) => {
          questions.push({
            question,
            sectionTitle: section.section_title,
            sectionIndex,
            questionIndex: qIndex
          });
        });

        // Add dynamic follow-up questions
        const dynamicQuestions = getDynamicQuestionsForSection(section, watchedValues);
        dynamicQuestions.forEach((question, qIndex) => {
          questions.push({
            question,
            sectionTitle: section.section_title,
            sectionIndex,
            questionIndex: visibleQuestions.length + qIndex
          });
        });
      });
    });

    return questions;
  }, [visibleSections, watchedValues]);

  const currentQuestion = allQuestions[currentQuestionIndex];
  const totalQuestions = allQuestions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  
  // Process form sections for proper submission handling
  useEffect(() => {
    if (processSectionsWithDebounce && visibleSections.length > 0) {
      const allSections = visibleSections.flat();
      processSectionsWithDebounce(allSections, watchedValues);
    }
  }, [visibleSections, watchedValues, processSectionsWithDebounce]);

  // Function to clear invalid field values that don't belong to any current questions
  const clearInvalidFieldValues = () => {
    const currentQuestionIds = allQuestions.map(q => 
      (q.question as DynamicFollowupQuestion).runtimeId || q.question.id
    );
    
    Object.keys(watchedValues).forEach(fieldKey => {
      if (!currentQuestionIds.includes(fieldKey)) {
        // Clear fields that don't correspond to any current questions
        form.setValue(fieldKey, undefined, { shouldValidate: false, shouldDirty: false });
      }
    });
  };

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
    const value = watchedValues[fieldId];
    
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      // Clear any invalid field values before navigating
      clearInvalidFieldValues();
      
      setAnimationClass("slide-out-left");
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        setAnimationClass("slide-in-right");
        setTimeout(() => setAnimationClass(""), 300);
      }, 200);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      // Clear any invalid field values before navigating
      clearInvalidFieldValues();
      
      setAnimationClass("slide-out-right");
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev - 1);
        setAnimationClass("slide-in-left");
        setTimeout(() => setAnimationClass(""), 300);
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

function getDynamicQuestionsForSection(section: any, values: Record<string, any>): DynamicFollowupQuestion[] {
  const dynamicQuestions: DynamicFollowupQuestion[] = [];
  
  Object.keys(values).forEach(key => {
    if (key.includes('_for_')) {
      const [originalId] = key.split('_for_');
      const parentQuestion = section.questions.find((q: any) => q.id === originalId);
      
      if (parentQuestion) {
        const parentValue = key.split('_for_')[1].replace(/_/g, ' ');
        const parentSelected = Array.isArray(values[originalId]) 
          ? values[originalId].includes(parentValue) 
          : values[originalId] === parentValue;
        
        if (parentSelected) {
          const template = section.questions.find(
            (q: any) => q.is_followup_template && 
            parentQuestion?.followup_question_ids?.includes(q.id)
          );
          
          if (template) {
            const dynamicQuestion: DynamicFollowupQuestion = {
              ...template,
              parentId: originalId,
              parentValue: parentValue,
              runtimeId: key,
              originalId: template.id,
              label: template.label.replace(/\{option\}/g, parentValue)
            };
            
            delete (dynamicQuestion as any).is_followup_template;
            dynamicQuestions.push(dynamicQuestion);
          }
        }
      }
    }
  });
  
  return dynamicQuestions;
}