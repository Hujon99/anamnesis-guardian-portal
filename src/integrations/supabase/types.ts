export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          expires_at: string | null
          first_name: string | null
          form_id: string
          formatted_raw_data: string | null
          id: string
          internal_notes: string | null
          is_magic_link: boolean | null
          optician_id: string | null
          organization_id: string
          patient_identifier: string | null
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
          expires_at?: string | null
          first_name?: string | null
          form_id: string
          formatted_raw_data?: string | null
          id?: string
          internal_notes?: string | null
          is_magic_link?: boolean | null
          optician_id?: string | null
          organization_id: string
          patient_identifier?: string | null
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
          expires_at?: string | null
          first_name?: string | null
          form_id?: string
          formatted_raw_data?: string | null
          id?: string
          internal_notes?: string | null
          is_magic_link?: boolean | null
          optician_id?: string | null
          organization_id?: string
          patient_identifier?: string | null
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
      get_form_organization_id: {
        Args: { form_id_param: string }
        Returns: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
