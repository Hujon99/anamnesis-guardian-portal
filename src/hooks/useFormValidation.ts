/**
 * Hook for validating form structure and schema.
 * Ensures form data integrity before saving and provides
 * validation feedback for the Form Builder interface.
 */

import { FormTemplate, FormSection, FormQuestion } from "@/types/anamnesis";

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  location?: string;
  field?: string;
}

export const useFormValidation = () => {
  const validateQuestion = (question: FormQuestion, sectionIndex: number, questionIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const location = `Sektion ${sectionIndex + 1}, Fråga ${questionIndex + 1}`;

    // Required fields
    if (!question.id?.trim()) {
      errors.push({
        type: 'error',
        message: 'Fråge-ID krävs',
        location,
        field: 'id'
      });
    }

    if (!question.label?.trim()) {
      errors.push({
        type: 'error',
        message: 'Frågetext krävs',
        location,
        field: 'label'
      });
    }

    if (!question.type?.trim()) {
      errors.push({
        type: 'error',
        message: 'Frågetyp krävs',
        location,
        field: 'type'
      });
    }

    // Type-specific validation
    if (question.type === 'radio' || question.type === 'dropdown') {
      if (!question.options || question.options.length === 0) {
        errors.push({
          type: 'error',
          message: 'Alternativ krävs för radio/dropdown frågor',
          location,
          field: 'options'
        });
      } else {
        question.options.forEach((option, optionIndex) => {
          if (typeof option === 'string') {
            if (!option.trim()) {
              errors.push({
                type: 'warning',
                message: `Tom option ${optionIndex + 1}`,
                location,
                field: 'options'
              });
            }
          } else if (typeof option === 'object') {
            if (!option.value?.trim()) {
              errors.push({
                type: 'error',
                message: `Option ${optionIndex + 1} saknar värde`,
                location,
                field: 'options'
              });
            }
          }
        });
      }
    }

    // Conditional logic validation
    if (question.show_if) {
      if (!question.show_if.question?.trim()) {
        errors.push({
          type: 'error',
          message: 'Villkorlig logik saknar referens-fråga',
          location,
          field: 'show_if'
        });
      }
      if (!question.show_if.equals) {
        errors.push({
          type: 'warning',
          message: 'Villkorlig logik saknar svarsvärde',
          location,
          field: 'show_if'
        });
      }
    }

    return errors;
  };

  const validateSection = (section: FormSection, sectionIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const location = `Sektion ${sectionIndex + 1}`;

    // Section title
    if (!section.section_title?.trim()) {
      errors.push({
        type: 'error',
        message: 'Sektionsrubrik krävs',
        location,
        field: 'section_title'
      });
    }

    // Questions
    if (!section.questions || section.questions.length === 0) {
      errors.push({
        type: 'warning',
        message: 'Sektion saknar frågor',
        location,
        field: 'questions'
      });
    } else {
      section.questions.forEach((question, questionIndex) => {
        errors.push(...validateQuestion(question, sectionIndex, questionIndex));
      });
    }

    return errors;
  };

  const validateForm = (form: FormTemplate): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Form title
    if (!form.title?.trim()) {
      errors.push({
        type: 'error',
        message: 'Formulärtitel krävs',
        field: 'title'
      });
    }

    // Sections
    if (!form.sections || form.sections.length === 0) {
      errors.push({
        type: 'error',
        message: 'Formulär måste ha minst en sektion',
        field: 'sections'
      });
    } else {
      form.sections.forEach((section, sectionIndex) => {
        errors.push(...validateSection(section, sectionIndex));
      });
    }

    // Check for duplicate question IDs
    const questionIds: string[] = [];
    form.sections?.forEach((section, sectionIndex) => {
      section.questions?.forEach((question, questionIndex) => {
        if (question.id) {
          if (questionIds.includes(question.id)) {
            errors.push({
              type: 'error',
              message: `Duplicerat fråge-ID: ${question.id}`,
              location: `Sektion ${sectionIndex + 1}, Fråga ${questionIndex + 1}`,
              field: 'id'
            });
          } else {
            questionIds.push(question.id);
          }
        }
      });
    });

    return errors;
  };

  const validateFormMetadata = (title: string, examinationType: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!title?.trim()) {
      errors.push({
        type: 'error',
        message: 'Formulärtitel krävs',
        field: 'title'
      });
    }

    if (!examinationType?.trim()) {
      errors.push({
        type: 'error',
        message: 'Undersökningstyp krävs',
        field: 'examination_type'
      });
    }

    return errors;
  };

  const hasErrors = (errors: ValidationError[]): boolean => {
    return errors.some(error => error.type === 'error');
  };

  const hasWarnings = (errors: ValidationError[]): boolean => {
    return errors.some(error => error.type === 'warning');
  };

  const getErrorsByType = (errors: ValidationError[], type: 'error' | 'warning'): ValidationError[] => {
    return errors.filter(error => error.type === type);
  };

  return {
    validateForm,
    validateSection,
    validateQuestion,
    validateFormMetadata,
    hasErrors,
    hasWarnings,
    getErrorsByType
  };
};