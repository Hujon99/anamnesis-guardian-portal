/**
 * PrintableQuestion Component
 * 
 * Renders individual form questions in a print-friendly format.
 * Provides appropriate layouts for different question types:
 * - Radio/Checkbox: Shows circles/boxes to check
 * - Text/Textarea: Shows lined space for writing
 * - Dropdown: Lists all options as checkboxes
 * - Number: Shows grid pattern for digits
 * 
 * Handles conditional questions with clear visual indentation and instructions.
 */

import React from 'react';
import { FormQuestion, DynamicFollowupQuestion } from '@/types/anamnesis';

interface PrintableQuestionProps {
  question: FormQuestion | DynamicFollowupQuestion;
  questionNumber: string;
  isConditional?: boolean;
  conditionalInstruction?: string;
}

export const PrintableQuestion: React.FC<PrintableQuestionProps> = ({
  question,
  questionNumber,
  isConditional = false,
  conditionalInstruction
}) => {
  const renderAnswerSpace = () => {
    // Type guard to check if it's a FormQuestion
    if (!('type' in question)) return null;
    
    // Helper to extract option value
    const getOptionValue = (option: any): string => {
      if (typeof option === 'string') return option;
      return option?.value || '';
    };
    
    switch (question.type) {
      case 'radio':
        return (
          <div className="space-y-2 ml-4">
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="inline-block w-5 h-5 border-2 border-gray-700 rounded-full"></span>
                <span>{getOptionValue(option)}</span>
              </div>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2 ml-4">
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="inline-block w-5 h-5 border-2 border-gray-700"></span>
                <span>{getOptionValue(option)}</span>
              </div>
            ))}
          </div>
        );

      case 'dropdown':
      case 'select':
        return (
          <div className="space-y-2 ml-4">
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="inline-block w-5 h-5 border-2 border-gray-700"></span>
                <span>{getOptionValue(option)}</span>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div className="mt-2">
            <div className="border-b-2 border-gray-400 h-8"></div>
          </div>
        );

      case 'textarea':
        return (
          <div className="mt-2 space-y-3">
            <div className="border-b border-gray-400 h-6"></div>
            <div className="border-b border-gray-400 h-6"></div>
            <div className="border-b border-gray-400 h-6"></div>
            <div className="border-b border-gray-400 h-6"></div>
          </div>
        );

      case 'number':
        return (
          <div className="mt-2 flex gap-2">
            {[...Array(10)].map((_, idx) => (
              <span key={idx} className="inline-block w-8 h-10 border-2 border-gray-400"></span>
            ))}
          </div>
        );

      default:
        return (
          <div className="mt-2">
            <div className="border-b-2 border-gray-400 h-8"></div>
          </div>
        );
    }
  };

  return (
    <div className={`print-question mb-6 ${isConditional ? 'ml-8 pl-4 border-l-4 border-gray-300' : ''}`}>
      {isConditional && conditionalInstruction && (
        <div className="text-sm italic text-gray-600 mb-2 flex items-center gap-2">
          <span>↳</span>
          <span>{conditionalInstruction}</span>
        </div>
      )}
      
      <div className="question-header mb-3">
        <div className="flex items-start gap-3">
          <span className="font-bold text-base">
            {questionNumber}.
          </span>
          <div className="flex-1">
            <span className="font-semibold text-base">
              {question.label}
              {question.required && <span className="text-red-600 ml-1">*</span>}
            </span>
            {question.help_text && (
              <div className="text-sm text-gray-600 mt-1">
                {question.help_text}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="answer-space">
        {renderAnswerSpace()}
      </div>
    </div>
  );
};
