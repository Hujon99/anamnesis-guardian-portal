/**
 * This file contains types for the anamnesis forms and entries in the system.
 * These types define the structure of form templates and the patient data entries.
 */

export type AnamnesesEntry = {
  id: string;
  organization_id: string;
  form_id: string;
  status: string;
  internal_notes: string | null;
  access_token: string | null;
  answers: any | null;
  created_at: string | null;
  expires_at: string | null;
  patient_email: string | null;
  sent_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  ai_summary: string | null;
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
