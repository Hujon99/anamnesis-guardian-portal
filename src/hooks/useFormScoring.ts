/**
 * Hook for calculating form scores in real-time for CISS and other scoring-enabled forms.
 * Tracks total score, flagged questions, and threshold status based on form configuration.
 */

import { useMemo } from 'react';
import { FormTemplate, FormQuestion, DynamicFollowupQuestion } from '@/types/anamnesis';

interface ScoringResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  thresholdExceeded: boolean;
  flaggedQuestions: Array<{
    question_id: string;
    label: string;
    score: number;
    warning_message?: string;
  }>;
}

export const useFormScoring = (
  formTemplate: FormTemplate,
  answers: Record<string, any>
): ScoringResult | null => {
  return useMemo(() => {
    // Check if scoring is enabled for this form
    if (!formTemplate.scoring_config?.enabled) {
      return null;
    }

    let totalScore = 0;
    let maxPossibleScore = 0;
    const flaggedQuestions: Array<{
      question_id: string;
      label: string;
      score: number;
      warning_message?: string;
    }> = [];

    // Iterate through all sections and questions
    formTemplate.sections.forEach((section) => {
      section.questions.forEach((question) => {
        if (!question.scoring?.enabled) {
          return;
        }

        // Calculate max possible score for this question
        maxPossibleScore += question.scoring.max_value;

        // Get the answer for this question
        const questionId = question.id;
        const answer = answers[questionId];

        if (answer === undefined || answer === null || answer === '') {
          return;
        }

        // Extract score from answer
        let score = 0;
        
        // For radio/select options with format "Label (X)" where X is the score
        if (typeof answer === 'string') {
          const scoreMatch = answer.match(/\((\d+)\)/);
          if (scoreMatch) {
            score = parseInt(scoreMatch[1], 10);
          }
        } else if (typeof answer === 'number') {
          score = answer;
        }

        // Add to total
        totalScore += score;

        // Check if this question should be flagged
        if (
          question.scoring.flag_threshold !== undefined &&
          score >= question.scoring.flag_threshold
        ) {
          flaggedQuestions.push({
            question_id: questionId,
            label: question.label,
            score,
            warning_message: question.scoring.warning_message,
          });
        }
      });
    });

    // Calculate percentage
    const percentage = maxPossibleScore > 0 
      ? Math.round((totalScore / maxPossibleScore) * 100) 
      : 0;

    // Check if threshold is exceeded
    const thresholdExceeded = formTemplate.scoring_config.total_threshold !== undefined
      ? totalScore >= formTemplate.scoring_config.total_threshold
      : false;

    return {
      totalScore,
      maxPossibleScore,
      percentage,
      thresholdExceeded,
      flaggedQuestions,
    };
  }, [formTemplate, answers]);
};
