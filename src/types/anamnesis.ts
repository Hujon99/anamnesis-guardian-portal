
/**
 * This file contains types for the anamnesis forms and entries in the system.
 * These types define the structure of form templates and the patient data entries.
 */

export type AnamnesesEntry = {
  id: string;
  organization_id: string;
  form_id: string;
  status: string;
  formatted_raw_data: string | null;
  access_token: string | null;
  answers: any | null;
  created_at: string | null;
  expires_at: string | null;
  patient_identifier: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  updated_at: string | null;
  ai_summary: string | null;
  internal_notes: string | null;
  auto_deletion_timestamp: string | null;
  // Magic link related properties
  booking_id?: string | null;
  store_id?: string | null;
  first_name?: string | null;
  booking_date?: string | null;
  is_magic_link?: boolean | null;
  // New properties
  optician_id?: string | null;
};

export type FormQuestionOption = string | {
  value: string;
  triggers_followups: boolean;
};

export type FormQuestion = {
  id: string;
  label: string;
  type: "text" | "radio" | "select" | "checkbox" | "dropdown" | "number";
  options?: FormQuestionOption[];
  required?: boolean;
  show_if?: {
    question: string;
    equals?: string | string[];
    contains?: string;
  };
  is_followup_template?: boolean;
  followup_question_ids?: string[];
  show_in_mode?: "optician" | "patient";
};

export type FormSection = {
  section_title: string;
  questions: FormQuestion[];
  show_if?: {
    question: string;
    equals?: string | string[];
    contains?: string;
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

export interface DynamicFollowupQuestion extends FormQuestion {
  parentId: string;
  parentValue: string;
  runtimeId: string;
  originalId: string;
}

// Updated Store type to make metadata compatible with Supabase's Json type
export type Store = {
  id: string;
  name: string;
  organization_id: string;
  external_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  metadata: Record<string, any> | null | string | number | boolean | any[]; // Modified to accept Json type values
  created_at: string;
  updated_at: string;
};
