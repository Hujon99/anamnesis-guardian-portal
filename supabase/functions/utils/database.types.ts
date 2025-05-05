export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      anamnes_entries: {
        Row: {
          id: string
          organization_id: string
          status: string | null
          auto_deletion_timestamp: string | null
          access_token: string | null
          ai_summary: string | null
          answers: Json | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          expires_at: string | null
          form_id: string
          formatted_raw_data: string | null
          internal_notes: string | null
          patient_identifier: string | null
          sent_at: string | null
          updated_at: string | null
          booking_id?: string | null
          store_id?: string | null
          first_name?: string | null
          booking_date?: string | null
          is_magic_link?: boolean | null
        }
        Insert: {
          id?: string
          organization_id: string
          status?: string | null
          auto_deletion_timestamp?: string | null
          access_token?: string | null
          ai_summary?: string | null
          answers?: Json | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expires_at?: string | null
          form_id: string
          formatted_raw_data?: string | null
          internal_notes?: string | null
          patient_identifier?: string | null
          sent_at?: string | null
          updated_at?: string | null
          booking_id?: string | null
          store_id?: string | null
          first_name?: string | null
          booking_date?: string | null
          is_magic_link?: boolean | null
        }
        Update: {
          id?: string
          organization_id?: string
          status?: string | null
          auto_deletion_timestamp?: string | null
          access_token?: string | null
          ai_summary?: string | null
          answers?: Json | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expires_at?: string | null
          form_id?: string
          formatted_raw_data?: string | null
          internal_notes?: string | null
          patient_identifier?: string | null
          sent_at?: string | null
          updated_at?: string | null
          booking_id?: string | null
          store_id?: string | null
          first_name?: string | null
          booking_date?: string | null
          is_magic_link?: boolean | null
        }
      }
      anamnes_forms: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          schema: Json
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          schema: Json
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          schema?: Json
          title?: string
        }
      }
      auto_deletion_logs: {
        Row: {
          id: string
          run_at: string | null
          error: string | null
          organizations_affected: string[] | null
          status: string | null
          entries_deleted: number | null
        }
        Insert: {
          id?: string
          run_at?: string | null
          error?: string | null
          organizations_affected?: string[] | null
          status?: string | null
          entries_deleted?: number | null
        }
        Update: {
          id?: string
          run_at?: string | null
          error?: string | null
          organizations_affected?: string[] | null
          status?: string | null
          entries_deleted?: number | null
        }
      }
      organization_settings: {
        Row: {
          created_at: string | null
          last_auto_deletion_run: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          last_auto_deletion_run?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          last_auto_deletion_run?: string | null
          organization_id?: string
          updated_at?: string | null
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
      }
      test_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          organization_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          organization_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          title?: string | null
          user_id?: string
        }
      }
      users: {
        Row: {
          clerk_user_id: string
          id: string
          organization_id: string
          role: string
        }
        Insert: {
          clerk_user_id: string
          id?: string
          organization_id: string
          role: string
        }
        Update: {
          clerk_user_id?: string
          id?: string
          organization_id?: string
          role?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_access_token: {
        Args: { token: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
