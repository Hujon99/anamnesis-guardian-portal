
/**
 * This file contains shared type definitions for the submit-form edge function
 * and its supporting modules.
 */

// Request and response types
export interface FormSubmissionRequest {
  token: string;
  answers: Record<string, any>;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
  submitted: boolean;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}

// Form data types
export interface FormQuestion {
  id: string;
  label: string;
  type: string;
  options?: any[];
  show_in_mode?: string;
}

export interface FormSection {
  section_title: string;
  questions: FormQuestion[];
}

export interface FormTemplate {
  title: string;
  sections: FormSection[];
}

// Entry data types
export interface EntryData {
  id: string;
  status: string | null;
  is_magic_link: boolean | null;
  booking_id: string | null;
  form_id: string;
  organization_id: string;
  store_id?: string | null;
  first_name?: string | null;
  booking_date?: string | null;
  created_by_name?: string | null;
  anamnes_forms?: {
    examination_type: string;
  };
}

// Update operation types
export interface EntryUpdateData {
  answers: Record<string, any>;
  formatted_raw_data: string;
  status: string;
  updated_at: string;
  sent_at?: string;
  examination_type?: string;
  // Added fields to persist GDPR consent and legal versions
  consent_given?: boolean;
  consent_timestamp?: string;
  privacy_policy_version?: string;
  terms_version?: string;
  // Optional context fields
  first_name?: string;
  store_id?: string;
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
}

// Result types
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: string;
  errorCode?: string;
}
