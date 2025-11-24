/**
 * Utility functions for looking up form schema details.
 * Translates question IDs and section indices to human-readable titles.
 */

interface FormQuestion {
  id: string;
  question_text?: string;
  label?: string;
  type: string;
}

interface FormSection {
  section_title: string;
  questions: FormQuestion[];
}

interface FormTemplate {
  title: string;
  sections: FormSection[];
}

/**
 * Get the title of a section by its index
 */
export const getSectionTitle = (
  formSchema: FormTemplate | null,
  sectionIndex: number
): string => {
  if (!formSchema || !formSchema.sections || sectionIndex < 0) {
    return `Sektion ${sectionIndex + 1}`;
  }

  const section = formSchema.sections[sectionIndex];
  if (!section) {
    return `Sektion ${sectionIndex + 1}`;
  }

  return section.section_title || `Sektion ${sectionIndex + 1}`;
};

/**
 * Get the text/label of a question by its ID
 */
export const getQuestionText = (
  formSchema: FormTemplate | null,
  questionId: string
): string | null => {
  if (!formSchema || !formSchema.sections) {
    return null;
  }

  for (const section of formSchema.sections) {
    if (!section.questions) continue;
    
    const question = section.questions.find(q => q.id === questionId);
    if (question) {
      return question.question_text || question.label || questionId;
    }
  }

  return null;
};

/**
 * Get full location string: "Section Title: Question Text"
 */
export const getFullQuestionLocation = (
  formSchema: FormTemplate | null,
  sectionIndex: number | null,
  questionId: string | null
): string => {
  if (sectionIndex === null && questionId === null) {
    return "Ingen position spårad";
  }

  if (sectionIndex === null) {
    return "Okänd sektion";
  }

  const sectionTitle = getSectionTitle(formSchema, sectionIndex);

  if (!questionId) {
    return sectionTitle;
  }

  const questionText = getQuestionText(formSchema, questionId);
  if (!questionText) {
    return `${sectionTitle}: ${questionId}`;
  }

  return `${sectionTitle}: ${questionText}`;
};

/**
 * Get progress description with context
 */
export const getProgressDescription = (
  progress: number | null,
  sectionIndex: number | null,
  formSchema: FormTemplate | null
): string => {
  if (progress === null) {
    return "Progress okänt";
  }

  const progressText = `${progress}% genomfört`;
  
  if (sectionIndex !== null && formSchema) {
    const sectionTitle = getSectionTitle(formSchema, sectionIndex);
    return `${progressText} - stannade vid ${sectionTitle}`;
  }

  return progressText;
};
