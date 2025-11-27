/**
 * This component provides a single-question-at-a-time form layout optimized for mobile and tablet use.
 * It shows one question per screen with touch-friendly inputs and navigation, while maintaining
 * section headers as "chapters" and preserving all existing form functionality.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { isSafari } from "@/utils/safariDetection";

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
    setShowConsentStep,
    tracking
  } = useFormContext();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Loop detection: Track question visit history to detect when users get stuck
  const questionVisitHistory = useRef<Array<{ questionId: string; timestamp: number; index: number }>>([]);
  const hasNavigated = useRef(false);
  const loopDismissedAt = useRef<number | null>(null);
  const [loopDetected, setLoopDetected] = useState(false);
  const [loopQuestionId, setLoopQuestionId] = useState<string | null>(null);
  const loopDetectionThreshold = 3; // Trigger after visiting same question 3 times
  const loopDetectionTimeWindow = 30000; // Within 30 seconds

  // Grace period after mount to allow form to stabilize
  useEffect(() => {
    // Clear any previous history on mount to prevent false positives
    questionVisitHistory.current = [];
    hasNavigated.current = false;
    loopDismissedAt.current = null;
    
    const timer = setTimeout(() => setIsInitialLoad(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
  // Performance optimization: Only watch when not navigating to reduce unnecessary re-renders
  const currentFormValues = form.watch();
  
  // Memoized visibility checker with cache to avoid repeated calculations
  const shouldShowQuestionMemo = useMemo(() => {
    const cache = new Map<string, boolean>();
    
    return (question: FormQuestion, values: Record<string, any>): boolean => {
      // Create cache key from question ID and relevant values
      const cacheKey = question.id + JSON.stringify(question.show_if) + JSON.stringify(values);
      
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
      }
      
      const result = shouldShowQuestion(question, values);
      cache.set(cacheKey, result);
      
      // Limit cache size to prevent memory leaks
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      return result;
    };
  }, []);

  // Build a STABLE question list that includes ALL questions without filtering by current values
  // Visibility is checked dynamically during navigation, NOT when building the list
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
        // Include ALL questions (except templates and optician-only) regardless of visibility
        section.questions.forEach((q, qIndex) => {
          // Skip follow-up templates
          if (q.is_followup_template) return;
          
          // Skip optician-only questions in patient mode
          if (q.show_in_mode === "optician") return;
          
          // DO NOT filter by shouldShowQuestion - include all questions for stable indexing
          questions.push({
            question: q,
            sectionTitle: section.section_title,
            sectionIndex,
            questionIndex: qIndex
          });
        });

        // Add placeholders for ALL possible dynamic follow-up questions
        // These are generated based on parent question configuration, not current values
        section.questions.forEach((parentQuestion) => {
          if (!parentQuestion.followup_question_ids) return;
          
          // For each followup template, add it to the stable list
          parentQuestion.followup_question_ids.forEach((followupId) => {
            const template = section.questions.find(
              (q) => q.id === followupId && q.is_followup_template
            );
            
            if (template) {
              // Add as a placeholder - will be populated dynamically
              questions.push({
                question: {
                  ...template,
                  parentId: parentQuestion.id,
                  // Mark as dynamic placeholder
                  isDynamicPlaceholder: true
                } as any,
                sectionTitle: section.section_title,
                sectionIndex,
                questionIndex: section.questions.length
              });
            }
          });
        });
      });
    });

    return questions;
  }, [visibleSections]); // ONLY depends on visibleSections, NOT currentFormValues

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

  // Loop detection: Track question visits and detect if user is stuck
  useEffect(() => {
    if (!currentQuestion) return;
    
    // Don't trigger during initial load grace period
    if (isInitialLoad) return;
    
    // Don't trigger until user has navigated at least once
    if (!hasNavigated.current) return;
    
    // Don't trigger if recently dismissed (30 second cooldown - increased from 10)
    if (loopDismissedAt.current && Date.now() - loopDismissedAt.current < 30000) {
      return;
    }
    
    const questionId = currentQuestion.question.id;
    const now = Date.now();
    
    // Add current visit to history
    questionVisitHistory.current.push({
      questionId,
      timestamp: now,
      index: currentQuestionIndex
    });
    
    // Clean up old visits outside time window
    questionVisitHistory.current = questionVisitHistory.current.filter(
      visit => now - visit.timestamp < loopDetectionTimeWindow
    );
    
    // Count visits to current question within time window
    const visitsToCurrentQuestion = questionVisitHistory.current.filter(
      visit => visit.questionId === questionId
    );
    
    // Detect loop if visited same question multiple times
    if (visitsToCurrentQuestion.length >= loopDetectionThreshold && !loopDetected) {
      console.warn('[SingleQuestionLayout] Loop detected:', {
        questionId,
        visitCount: visitsToCurrentQuestion.length,
        questionIndex: currentQuestionIndex,
        timeWindow: loopDetectionTimeWindow
      });
      
      // Log loop detection event
      tracking?.logLoopDetected(questionId, visitsToCurrentQuestion.length, currentQuestionIndex);
      
      // Show recovery UI
      setLoopDetected(true);
      setLoopQuestionId(questionId);
    }
  }, [currentQuestionIndex, loopDetected, isInitialLoad, tracking]);


  // Helper to find next visible question in a given direction (optimized with memoized checker)
  const findNextVisibleQuestion = useCallback((fromIndex: number, direction: 1 | -1): number => {
    let index = fromIndex + direction;
    let attempts = 0;
    const maxAttempts = allQuestions.length;
    
    while (attempts < maxAttempts && index >= 0 && index < allQuestions.length) {
      const question = allQuestions[index];
      
      // Use memoized visibility checker for better performance
      if (shouldShowQuestionMemo(question.question, currentFormValues)) {
        // For dynamic questions, verify they have a valid parentValue
        if ((question.question as any).isDynamicPlaceholder) {
          const parentId = (question.question as any).parentId;
          const parentValue = currentFormValues[parentId];
          
          // Skip if parent has no value
          if (!parentValue || (Array.isArray(parentValue) && parentValue.length === 0)) {
            index += direction;
            attempts++;
            continue;
          }
        }
        
        return index;
      }
      
      index += direction;
      attempts++;
    }
    
    // No visible question found, stay at current
    return fromIndex;
  }, [allQuestions, currentFormValues, shouldShowQuestionMemo]);

  // Check if current question is answered (optimized with memoized checker)
  const isCurrentQuestionAnswered = useCallback(() => {
    if (!currentQuestion) return false;
    
    // Use memoized visibility checker
    if (!shouldShowQuestionMemo(currentQuestion.question, currentFormValues)) {
      return true;
    }
    
    const fieldId = (currentQuestion.question as DynamicFollowupQuestion).runtimeId || currentQuestion.question.id;
    
    // Använd form.watch direkt för omedelbar feedback (inte watchedValues som är debounced)
    const value = form.watch(fieldId);
    
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }, [currentQuestion, currentFormValues, form, shouldShowQuestionMemo]);

  // REMOVED: Destructive cleanup effect
  // Previous code deleted field values when questions became invisible due to conditional logic
  // This caused data loss and navigation loops. Field visibility is now handled at render time.

  // Debounced navigation handler to prevent rapid double-taps
  const handleNext = useCallback(() => {
    if (isNavigating) {
      console.log('[SingleQuestionLayout] Navigation already in progress, ignoring');
      return;
    }
    
    if (currentQuestionIndex >= totalQuestions - 1) return;
    
    // Mark that user has navigated at least once
    hasNavigated.current = true;
    
    setIsNavigating(true);
    
    // Find next VISIBLE question
    const nextIndex = findNextVisibleQuestion(currentQuestionIndex, 1);
    
    if (nextIndex === currentQuestionIndex) {
      console.log('[SingleQuestionLayout] No next visible question found');
      setIsNavigating(false);
      return;
    }
    
    const nextQuestion = allQuestions[nextIndex];
    const fromQuestionId = currentQuestion?.question.id || 'unknown';
    const toQuestionId = nextQuestion?.question.id || 'unknown';
    const progressPercent = Math.round(((nextIndex + 1) / totalQuestions) * 100);
    
    console.log('[SingleQuestionLayout] Navigation Next:', {
      from: currentQuestionIndex,
      to: nextIndex,
      currentQuestionId: fromQuestionId,
      nextQuestionId: toQuestionId,
      totalQuestions: allQuestions.length,
      progress: progressPercent
    });
    
    // Log navigation event for debugging
    tracking?.logNavigation('next', currentQuestionIndex, nextIndex, fromQuestionId, toQuestionId, progressPercent);
    
    // Navigera med animation
    setAnimationClass("slide-out-left");
    setTimeout(() => {
      setCurrentQuestionIndex(nextIndex);
      setAnimationClass("slide-in-right");
      
      // iOS Safari scroll fix - use instant scroll after animation to avoid glitches
      setTimeout(() => {
        window.scrollTo({ 
          top: 0, 
          behavior: isSafari() ? 'instant' : 'smooth' 
        });
        setAnimationClass("");
        setIsNavigating(false); // Re-enable navigation after animation completes
      }, 100);
    }, 200);
  }, [isNavigating, currentQuestionIndex, totalQuestions, findNextVisibleQuestion, allQuestions, currentQuestion, tracking]);

  // Debounced navigation handler to prevent rapid double-taps
  const handlePrevious = useCallback(() => {
    if (isNavigating) {
      console.log('[SingleQuestionLayout] Navigation already in progress, ignoring');
      return;
    }
    
    if (currentQuestionIndex <= 0) return;
    
    // Mark that user has navigated at least once
    hasNavigated.current = true;
    
    setIsNavigating(true);
    
    // Find previous VISIBLE question
    const prevIndex = findNextVisibleQuestion(currentQuestionIndex, -1);
    
    if (prevIndex === currentQuestionIndex) {
      console.log('[SingleQuestionLayout] No previous visible question found');
      setIsNavigating(false);
      return;
    }
    
    const prevQuestion = allQuestions[prevIndex];
    const fromQuestionId = currentQuestion?.question.id || 'unknown';
    const toQuestionId = prevQuestion?.question.id || 'unknown';
    const progressPercent = Math.round(((prevIndex + 1) / totalQuestions) * 100);
    
    console.log('[SingleQuestionLayout] Navigation Previous:', {
      from: currentQuestionIndex,
      to: prevIndex,
      currentQuestionId: fromQuestionId,
      prevQuestionId: toQuestionId,
      totalQuestions: allQuestions.length,
      progress: progressPercent
    });
    
    // Log navigation event for debugging
    tracking?.logNavigation('previous', currentQuestionIndex, prevIndex, fromQuestionId, toQuestionId, progressPercent);
    
    // Navigera med animation
    setAnimationClass("slide-out-right");
    setTimeout(() => {
      setCurrentQuestionIndex(prevIndex);
      setAnimationClass("slide-in-left");
      
      // iOS Safari scroll fix - use instant scroll after animation to avoid glitches
      setTimeout(() => {
        window.scrollTo({ 
          top: 0, 
          behavior: isSafari() ? 'instant' : 'smooth' 
        });
        setAnimationClass("");
        setIsNavigating(false); // Re-enable navigation after animation completes
      }, 100);
    }, 200);
  }, [isNavigating, currentQuestionIndex, findNextVisibleQuestion, allQuestions, currentQuestion, totalQuestions, tracking]);

  const handleFormSubmit = () => {
    console.log("Form submit triggered");
    console.log("Current question index:", currentQuestionIndex);
    console.log("Total questions:", totalQuestions);
    console.log("Is last question:", currentQuestionIndex === totalQuestions - 1);
    toast.info("Skickar in dina svar...");
    const submitHandler = contextHandleSubmit();
    submitHandler(form.getValues());
  };
  
  // Recovery functions for loop detection
  const handleForceSkipToNext = useCallback(() => {
    console.log('[SingleQuestionLayout] Force skipping to next question due to loop');
    
    // Reset loop detection
    setLoopDetected(false);
    setLoopQuestionId(null);
    questionVisitHistory.current = [];
    
    // Find next visible question
    const nextIndex = findNextVisibleQuestion(currentQuestionIndex, 1);
    
    if (nextIndex !== currentQuestionIndex) {
      toast.success("Hoppar till nästa fråga");
      setCurrentQuestionIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.info("Ingen fler frågor, försöker skicka in formuläret");
      handleFormSubmit();
    }
  }, [currentQuestionIndex, findNextVisibleQuestion]);
  
  const handleContinueTrying = useCallback(() => {
    console.log('[SingleQuestionLayout] User chose to continue trying');
    
    // First hide the modal
    setLoopDetected(false);
    setLoopQuestionId(null);
    
    // Clear history completely to prevent immediate re-trigger
    questionVisitHistory.current = [];
    
    // Set a strong cooldown - 30 seconds to give user time to work
    loopDismissedAt.current = Date.now();
    
    // Also reset navigation flag to require fresh navigation
    hasNavigated.current = false;
    
    toast.info("Försök att svara på frågan igen");
  }, []);

  if (totalQuestions === 0) {
    return (
      <CardContent className="text-center py-12">
        <p className="text-muted-foreground">Inga frågor att visa</p>
      </CardContent>
    );
  }

  return (
    <>
      {/* Loop Detection Alert */}
      {loopDetected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Har du fastnat?
              </h3>
              <p className="text-sm text-muted-foreground">
                Vi har märkt att du har besökt samma fråga flera gånger. Det kan bero på ett tekniskt problem eller att frågan är svår att besvara.
              </p>
              <p className="text-sm text-muted-foreground">
                Vad vill du göra?
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleForceSkipToNext}
                className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white"
              >
                Hoppa till nästa fråga
              </Button>
              <Button
                onClick={handleContinueTrying}
                variant="outline"
                className="w-full"
              >
                Fortsätt försöka
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Om problemet kvarstår, kontakta din optiker för hjälp.
            </p>
          </div>
        </div>
      )}
      
      {/* Header with progress - compact padding for iPad */}
      <div className="p-3 sm:p-4 border-b bg-background sticky top-0 z-10">
        <div className="space-y-2 sm:space-y-3">
          {/* Chapter/Section indicator */}
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1.5 sm:py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium max-w-full">
              <span className="truncate">{currentQuestion.sectionTitle}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
              <span>Fråga {currentQuestionIndex + 1}</span>
              <span className="hidden xs:inline">{totalQuestions} frågor totalt</span>
              <span className="xs:hidden">{totalQuestions} tot.</span>
            </div>
            <Progress value={progress} className="h-1.5 sm:h-2" />
          </div>

          {/* Created by info */}
          {createdByName && (
            <p className="text-center text-xs sm:text-sm text-muted-foreground truncate">
              Undersökning skapad av {createdByName}
            </p>
          )}
        </div>
      </div>

      {/* Question content - compact padding for iPad to fit all content */}
      <CardContent className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden">
        <div className={`transition-all duration-300 ${animationClass} min-h-[250px] sm:min-h-[350px] flex flex-col justify-center`}>
          {currentQuestion && (
            <div className="space-y-4 sm:space-y-6">
              {/* Question number indicator */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm sm:text-base">
                    {currentQuestionIndex + 1}
                  </div>
                  <span>av {totalQuestions}</span>
                </div>
              </div>

              {/* Question - responsive container */}
              <div className="w-full max-w-3xl mx-auto px-2 sm:px-4">
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

      {/* Navigation - compact padding for iPad */}
      <CardFooter className="p-2.5 sm:p-3 md:p-4 border-t bg-card shadow-lg sticky bottom-0 z-10">
        <div className="w-full space-y-2 sm:space-y-3">
          <div className="flex justify-between items-center gap-2 sm:gap-3 md:gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || isNavigating}
              className="h-11 sm:h-12 px-3 sm:px-4 md:px-6 flex-shrink-0 text-sm sm:text-base"
            >
              <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{isNavigating ? "Laddar..." : "Föregående"}</span>
              <span className="sm:hidden">{isNavigating ? "..." : "Föreg."}</span>
            </Button>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <Button
                onClick={handleFormSubmit}
                disabled={isSubmitting || !isCurrentQuestionAnswered() || isNavigating}
                className="h-11 sm:h-12 px-4 sm:px-6 md:px-8 !bg-accent-teal hover:!bg-accent-teal/90 text-white disabled:opacity-50 flex-shrink-0 transition-all text-sm sm:text-base font-medium"
              >
                <CheckCircle className="w-4 h-4 mr-1 sm:mr-2" />
                {isSubmitting ? "Skickar..." : "Skicka in"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isCurrentQuestionAnswered() || isNavigating}
                className="h-11 sm:h-12 px-3 sm:px-4 md:px-6 flex-shrink-0 text-sm sm:text-base"
              >
                {isNavigating ? "Laddar..." : "Nästa"}
                <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
              </Button>
            )}
          </div>

          {/* Answer status indicator */}
          <div className="text-center">
            {isCurrentQuestionAnswered() ? (
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-accent-teal">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Besvarat</span>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-muted-foreground">
                Besvara frågan för att fortsätta
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center leading-tight">
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
