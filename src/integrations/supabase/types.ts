export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      anamnes_entries: {
        Row: {
          access_token: string | null
          ai_summary: string | null
          answers: Json | null
          auto_deletion_timestamp: string | null
          booking_date: string | null
          booking_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          examination_type: string | null
          expires_at: string | null
          first_name: string | null
          form_id: string
          formatted_raw_data: string | null
          id: string
          internal_notes: string | null
          is_magic_link: boolean | null
          is_redacted: boolean
          optician_id: string | null
          organization_id: string
          patient_identifier: string | null
          redacted_at: string | null
          sent_at: string | null
          status: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          ai_summary?: string | null
          answers?: Json | null
          auto_deletion_timestamp?: string | null
          booking_date?: string | null
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          examination_type?: string | null
          expires_at?: string | null
          first_name?: string | null
          form_id: string
          formatted_raw_data?: string | null
          id?: string
          internal_notes?: string | null
          is_magic_link?: boolean | null
          is_redacted?: boolean
          optician_id?: string | null
          organization_id: string
          patient_identifier?: string | null
          redacted_at?: string | null
          sent_at?: string | null
          status?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          ai_summary?: string | null
          answers?: Json | null
          auto_deletion_timestamp?: string | null
          booking_date?: string | null
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          examination_type?: string | null
          expires_at?: string | null
          first_name?: string | null
          form_id?: string
          formatted_raw_data?: string | null
          id?: string
          internal_notes?: string | null
          is_magic_link?: boolean | null
          is_redacted?: boolean
          optician_id?: string | null
          organization_id?: string
          patient_identifier?: string | null
          redacted_at?: string | null
          sent_at?: string | null
          status?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnes_entries_optician_id_fkey"
            columns: ["optician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["clerk_user_id"]
          },
          {
            foreignKeyName: "fk_anamnes_entries_form_id"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "anamnes_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_anamnes_entries_store"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnes_forms: {
        Row: {
          created_at: string | null
          examination_type:
            | Database["public"]["Enums"]["Synundersökning"]
            | null
          id: string
          organization_id: string | null
          schema: Json
          title: string
        }
        Insert: {
          created_at?: string | null
          examination_type?:
            | Database["public"]["Enums"]["Synundersökning"]
            | null
          id?: string
          organization_id?: string | null
          schema: Json
          title: string
        }
        Update: {
          created_at?: string | null
          examination_type?:
            | Database["public"]["Enums"]["Synundersökning"]
            | null
          id?: string
          organization_id?: string | null
          schema?: Json
          title?: string
        }
        Relationships: []
      }
      audit_auth_logs: {
        Row: {
          clerk_user_id: string | null
          created_at: string
          email: string | null
          event_type: string
          id: string
          ip_address_anonymized: string | null
          metadata: Json | null
          organization_id: string
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          clerk_user_id?: string | null
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          ip_address_anonymized?: string | null
          metadata?: Json | null
          organization_id: string
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          clerk_user_id?: string | null
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address_anonymized?: string | null
          metadata?: Json | null
          organization_id?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_data_access: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address_anonymized: string | null
          organization_id: string
          purpose: string | null
          record_id: string | null
          route: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address_anonymized?: string | null
          organization_id: string
          purpose?: string | null
          record_id?: string | null
          route?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address_anonymized?: string | null
          organization_id?: string
          purpose?: string | null
          record_id?: string | null
          route?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auto_deletion_logs: {
        Row: {
          entries_deleted: number | null
          error: string | null
          id: string
          organizations_affected: string[] | null
          run_at: string | null
          status: string | null
        }
        Insert: {
          entries_deleted?: number | null
          error?: string | null
          id?: string
          organizations_affected?: string[] | null
          run_at?: string | null
          status?: string | null
        }
        Update: {
          entries_deleted?: number | null
          error?: string | null
          id?: string
          organizations_affected?: string[] | null
          run_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      auto_redaction_logs: {
        Row: {
          entries_redacted: number | null
          error: string | null
          id: string
          organizations_affected: string[] | null
          run_at: string | null
        }
        Insert: {
          entries_redacted?: number | null
          error?: string | null
          id?: string
          organizations_affected?: string[] | null
          run_at?: string | null
        }
        Update: {
          entries_redacted?: number | null
          error?: string | null
          id?: string
          organizations_affected?: string[] | null
          run_at?: string | null
        }
        Relationships: []
      }
      driving_license_examinations: {
        Row: {
          correction_type: Database["public"]["Enums"]["correction_type"] | null
          created_at: string
          created_by: string | null
          entry_id: string
          examination_status:
            | Database["public"]["Enums"]["examination_status"]
            | null
          id: string
          id_type: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed: boolean | null
          notes: string | null
          organization_id: string
          passed_examination: boolean | null
          requires_further_investigation: boolean | null
          requires_optician_visit: boolean | null
          updated_at: string
          uses_contact_lenses: boolean | null
          uses_glasses: boolean | null
          verified_at: string | null
          verified_by: string | null
          vision_below_limit: boolean | null
          visual_acuity_both_eyes: number | null
          visual_acuity_left_eye: number | null
          visual_acuity_right_eye: number | null
          visual_acuity_with_correction: number | null
          visual_acuity_with_correction_both: number | null
          visual_acuity_with_correction_left: number | null
          visual_acuity_with_correction_right: number | null
          warning_flags: Json | null
        }
        Insert: {
          correction_type?:
            | Database["public"]["Enums"]["correction_type"]
            | null
          created_at?: string
          created_by?: string | null
          entry_id: string
          examination_status?:
            | Database["public"]["Enums"]["examination_status"]
            | null
          id?: string
          id_type?: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed?: boolean | null
          notes?: string | null
          organization_id: string
          passed_examination?: boolean | null
          requires_further_investigation?: boolean | null
          requires_optician_visit?: boolean | null
          updated_at?: string
          uses_contact_lenses?: boolean | null
          uses_glasses?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          vision_below_limit?: boolean | null
          visual_acuity_both_eyes?: number | null
          visual_acuity_left_eye?: number | null
          visual_acuity_right_eye?: number | null
          visual_acuity_with_correction?: number | null
          visual_acuity_with_correction_both?: number | null
          visual_acuity_with_correction_left?: number | null
          visual_acuity_with_correction_right?: number | null
          warning_flags?: Json | null
        }
        Update: {
          correction_type?:
            | Database["public"]["Enums"]["correction_type"]
            | null
          created_at?: string
          created_by?: string | null
          entry_id?: string
          examination_status?:
            | Database["public"]["Enums"]["examination_status"]
            | null
          id?: string
          id_type?: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed?: boolean | null
          notes?: string | null
          organization_id?: string
          passed_examination?: boolean | null
          requires_further_investigation?: boolean | null
          requires_optician_visit?: boolean | null
          updated_at?: string
          uses_contact_lenses?: boolean | null
          uses_glasses?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          vision_below_limit?: boolean | null
          visual_acuity_both_eyes?: number | null
          visual_acuity_left_eye?: number | null
          visual_acuity_right_eye?: number | null
          visual_acuity_with_correction?: number | null
          visual_acuity_with_correction_both?: number | null
          visual_acuity_with_correction_left?: number | null
          visual_acuity_with_correction_right?: number | null
          warning_flags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_driving_license_examinations_entry_id"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "anamnes_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          organization_id: string
          screenshot_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          organization_id: string
          screenshot_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_logs: {
        Row: {
          entry_id: string | null
          error_details: string | null
          id: string
          is_optician: boolean | null
          status: string | null
          timestamp: string | null
          token: string | null
          update_data_sample: string | null
        }
        Insert: {
          entry_id?: string | null
          error_details?: string | null
          id?: string
          is_optician?: boolean | null
          status?: string | null
          timestamp?: string | null
          token?: string | null
          update_data_sample?: string | null
        }
        Update: {
          entry_id?: string | null
          error_details?: string | null
          id?: string
          is_optician?: boolean | null
          status?: string | null
          timestamp?: string | null
          token?: string | null
          update_data_sample?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "test_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_user_id: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string
          role: string
        }
        Insert: {
          clerk_user_id: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id: string
          role?: string
        }
        Update: {
          clerk_user_id?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_submission_logs_table_function: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      debug_current_form_id: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_form_id: string
          is_valid_uuid: boolean
          organization_from_form: string
        }[]
      }
      get_form_organization_id: {
        Args: { form_id_param: string }
        Returns: string
      }
      get_stores_for_form: {
        Args: { form_id: string }
        Returns: {
          address: string
          email: string
          id: string
          name: string
          organization_id: string
          phone: string
        }[]
      }
      log_access: {
        Args: {
          p_purpose?: string
          p_record_id?: string
          p_route?: string
          p_table_name: string
        }
        Returns: undefined
      }
      set_access_token: {
        Args: { token: string }
        Returns: undefined
      }
      set_current_form_id: {
        Args: { form_id: string }
        Returns: undefined
      }
    }
    Enums: {
      correction_type: "glasses" | "contact_lenses" | "both" | "none"
      examination_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "requires_booking"
      id_verification_type:
        | "swedish_license"
        | "swedish_id"
        | "passport"
        | "guardian_certificate"
      Synundersökning:
        | "Synundersökning"
        | "Körkortsundersökning"
        | "Linsundersökning"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      correction_type: ["glasses", "contact_lenses", "both", "none"],
      examination_status: [
        "pending",
        "in_progress",
        "completed",
        "requires_booking",
      ],
      id_verification_type: [
        "swedish_license",
        "swedish_id",
        "passport",
        "guardian_certificate",
      ],
      Synundersökning: [
        "Synundersökning",
        "Körkortsundersökning",
        "Linsundersökning",
      ],
    },
  },
} as const
