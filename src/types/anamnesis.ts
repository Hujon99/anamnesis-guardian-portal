/**
 * This file contains types for the anamnesis forms and entries in the system.
 * These types define the structure of form templates and the patient data entries.
 */

export type AnamnesesEntry = {
  id: string;
  organization_id: string;
  form_id: string;
  status: string;
  formatted_raw_data: string | null; // Field to store the formatted raw data
  access_token: string | null;
  answers: any | null;
  created_at: string | null;
  expires_at: string | null;
  patient_identifier: string | null; // Updated from patient_email to patient_identifier
  sent_at: string | null;
  created_by: string | null;
  created_by_name: string | null; // Add the creator's name
  updated_at: string | null;
  ai_summary: string | null;
  // internal_notes is deprecated and will be removed in future
  internal_notes: string | null;
};

export type FormQuestion = {
  id: string;
  label: string;
  type: "text" | "radio" | "select" | "checkbox" | "dropdown" | "number";
  options?: string[];
  required?: boolean;
  show_if?: {
    question: string;
    equals: string | string[];
  };
  // New property to indicate this field should only be shown in a specific mode
  show_in_mode?: "optician" | "patient";
};

export type FormSection = {
  section_title: string;
  questions: FormQuestion[];
  show_if?: {
    question: string;
    equals: string | string[];
  };
};

export type FormTemplate = {
  title: string;
  sections: FormSection[];
};

export type AnamnesForm = {
  id: string;
  organization_id: string | null;
  title: string;
  schema: FormTemplate;
  created_at: string | null;
};

// Add a new type for formatted answers to include the isOpticianSubmission property
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
  isOpticianSubmission?: boolean;
}

// Add a type for the submission data structure
export interface SubmissionData {
  formattedAnswers: FormattedAnswerData;
  rawAnswers: Record<string, any>;
  metadata: {
    formTemplateId: string;
    submittedAt: string;
    version: string;
  };
  _metadata?: {
    submittedBy: string;
    autoSetStatus: string;
  };
}
