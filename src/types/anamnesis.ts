
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
  // GDPR redaction flags
  is_redacted?: boolean;
  redacted_at?: string | null;
  // Magic link related properties
  booking_id?: string | null;
  store_id?: string | null;
  first_name?: string | null;
  booking_date?: string | null;
  is_magic_link?: boolean | null;
  // New properties
  optician_id?: string | null;
  // Form-related properties
  examination_type?: string | null;
  // ID verification fields
  id_verification_completed?: boolean;
  id_type?: string | null;
  personal_number?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  // GDPR consent fields
  consent_given?: boolean;
  consent_timestamp?: string | null;
  privacy_policy_version?: string | null;
  terms_version?: string | null;
  // Unified GDPR fields
  gdpr_method?: 'online_consent' | 'store_verbal' | null;
  gdpr_confirmed_by?: string | null;
  gdpr_confirmed_by_name?: string | null;
  gdpr_info_type?: 'full' | 'short' | null;
  gdpr_notes?: string | null;
  // Performance optimization: pre-loaded driving license status
  driving_license_status?: {
    isCompleted: boolean;
    examination: any;
  };
  // Scoring result for CISS and other scoring forms
  scoring_result?: {
    total_score: number;
    max_possible_score: number;
    percentage: number;
    threshold_exceeded: boolean;
    flagged_questions: Array<{
      question_id: string;
      label: string;
      score: number;
      warning_message?: string;
    }>;
  };
};

export type FormQuestionOption = string | {
  value: string;
  triggers_followups: boolean;
};

export interface FormQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'radio' | 'select' | 'checkbox' | 'dropdown' | 'number' | 'date' | 'email' | 'tel' | 'url';
  options?: FormQuestionOption[];
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  show_if?: {
    question: string;
    equals?: string | string[];
    contains?: string;
  };
  is_followup_template?: boolean;
  followup_question_ids?: string[];
  show_in_mode?: 'patient' | 'optician' | 'all';
  scoring?: {
    enabled: boolean;
    min_value: number;
    max_value: number;
    flag_threshold?: number;
    warning_message?: string;
  };
}

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
  scoring_config?: {
    enabled: boolean;
    total_threshold: number;
    show_score_to_patient: boolean;
    threshold_message?: string;
    disable_ai_summary?: boolean;
  };
  kiosk_mode?: {
    enabled: boolean;
    require_supervisor_code?: boolean;
    auto_submit?: boolean;
  };
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

// Updated Store type to properly handle Supabase's JSON type
export type Store = {
  id: string;
  name: string;
  organization_id: string;
  external_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  // Updated definition to handle all possible JSON values from Supabase
  metadata: Record<string, any> | null | string | number | boolean | any[];
  created_at: string;
  updated_at: string;
};
