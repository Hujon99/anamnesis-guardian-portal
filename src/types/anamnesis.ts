
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
};

export type AnamnesForm = {
  id: string;
  organization_id: string | null;
  title: string;
  schema: {
    title: string;
    questions: Array<{
      id: string;
      label: string;
      type: "text" | "radio" | "select" | "checkbox";
      options?: string[];
      show_if?: {
        question: string;
        equals: string;
      };
    }>;
  };
  created_at: string | null;
};
