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
          consent_given: boolean | null
          consent_timestamp: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          examination_type: string | null
          expires_at: string | null
          first_name: string | null
          form_id: string
          formatted_raw_data: string | null
          gdpr_confirmed_by: string | null
          gdpr_confirmed_by_name: string | null
          gdpr_info_type: string | null
          gdpr_method: string | null
          gdpr_notes: string | null
          id: string
          id_type: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed: boolean | null
          internal_notes: string | null
          is_kiosk_mode: boolean | null
          is_magic_link: boolean | null
          is_redacted: boolean
          optician_id: string | null
          organization_id: string
          patient_identifier: string | null
          personal_number: string | null
          privacy_policy_version: string | null
          redacted_at: string | null
          require_supervisor_code: boolean | null
          scoring_result: Json | null
          sent_at: string | null
          status: string | null
          store_id: string | null
          terms_version: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          access_token?: string | null
          ai_summary?: string | null
          answers?: Json | null
          auto_deletion_timestamp?: string | null
          booking_date?: string | null
          booking_id?: string | null
          consent_given?: boolean | null
          consent_timestamp?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          examination_type?: string | null
          expires_at?: string | null
          first_name?: string | null
          form_id: string
          formatted_raw_data?: string | null
          gdpr_confirmed_by?: string | null
          gdpr_confirmed_by_name?: string | null
          gdpr_info_type?: string | null
          gdpr_method?: string | null
          gdpr_notes?: string | null
          id?: string
          id_type?: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed?: boolean | null
          internal_notes?: string | null
          is_kiosk_mode?: boolean | null
          is_magic_link?: boolean | null
          is_redacted?: boolean
          optician_id?: string | null
          organization_id: string
          patient_identifier?: string | null
          personal_number?: string | null
          privacy_policy_version?: string | null
          redacted_at?: string | null
          require_supervisor_code?: boolean | null
          scoring_result?: Json | null
          sent_at?: string | null
          status?: string | null
          store_id?: string | null
          terms_version?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          access_token?: string | null
          ai_summary?: string | null
          answers?: Json | null
          auto_deletion_timestamp?: string | null
          booking_date?: string | null
          booking_id?: string | null
          consent_given?: boolean | null
          consent_timestamp?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          examination_type?: string | null
          expires_at?: string | null
          first_name?: string | null
          form_id?: string
          formatted_raw_data?: string | null
          gdpr_confirmed_by?: string | null
          gdpr_confirmed_by_name?: string | null
          gdpr_info_type?: string | null
          gdpr_method?: string | null
          gdpr_notes?: string | null
          id?: string
          id_type?: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed?: boolean | null
          internal_notes?: string | null
          is_kiosk_mode?: boolean | null
          is_magic_link?: boolean | null
          is_redacted?: boolean
          optician_id?: string | null
          organization_id?: string
          patient_identifier?: string | null
          personal_number?: string | null
          privacy_policy_version?: string | null
          redacted_at?: string | null
          require_supervisor_code?: boolean | null
          scoring_result?: Json | null
          sent_at?: string | null
          status?: string | null
          store_id?: string | null
          terms_version?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
          created_from_template_id: string | null
          examination_type:
            | Database["public"]["Enums"]["Synundersökning"]
            | null
          id: string
          is_active: boolean | null
          is_global_template: boolean | null
          is_template: boolean | null
          last_modified_by: string | null
          organization_id: string | null
          schema: Json
          template_category: string | null
          title: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_from_template_id?: string | null
          examination_type?:
            | Database["public"]["Enums"]["Synundersökning"]
            | null
          id?: string
          is_active?: boolean | null
          is_global_template?: boolean | null
          is_template?: boolean | null
          last_modified_by?: string | null
          organization_id?: string | null
          schema: Json
          template_category?: string | null
          title: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_from_template_id?: string | null
          examination_type?:
            | Database["public"]["Enums"]["Synundersökning"]
            | null
          id?: string
          is_active?: boolean | null
          is_global_template?: boolean | null
          is_template?: boolean | null
          last_modified_by?: string | null
          organization_id?: string | null
          schema?: Json
          template_category?: string | null
          title?: string
          version?: number | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          api_secret_hash: string
          created_at: string | null
          created_by: string | null
          environment: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
          organization_id: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_secret_hash: string
          created_at?: string | null
          created_by?: string | null
          environment?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
          organization_id: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_secret_hash?: string
          created_at?: string | null
          created_by?: string | null
          environment?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
          organization_id?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          created_entry_id: string | null
          endpoint: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          ip_address_anonymized: string | null
          method: string
          organization_id: string | null
          request_params: Json | null
          response_code: string | null
          response_status: number
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          created_entry_id?: string | null
          endpoint: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address_anonymized?: string | null
          method: string
          organization_id?: string | null
          request_params?: Json | null
          response_code?: string | null
          response_status: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          created_entry_id?: string | null
          endpoint?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address_anonymized?: string | null
          method?: string
          organization_id?: string | null
          request_params?: Json | null
          response_code?: string | null
          response_status?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
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
          decided_by: string | null
          entry_id: string
          examination_status:
            | Database["public"]["Enums"]["examination_status"]
            | null
          glasses_prescription_od_add: number | null
          glasses_prescription_od_axis: number | null
          glasses_prescription_od_cyl: number | null
          glasses_prescription_od_sph: number | null
          glasses_prescription_os_add: number | null
          glasses_prescription_os_axis: number | null
          glasses_prescription_os_cyl: number | null
          glasses_prescription_os_sph: number | null
          id: string
          id_type: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed: boolean | null
          notes: string | null
          optician_decision: string | null
          optician_decision_date: string | null
          optician_notes: string | null
          organization_id: string
          passed_examination: boolean | null
          personal_number: string | null
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
          decided_by?: string | null
          entry_id: string
          examination_status?:
            | Database["public"]["Enums"]["examination_status"]
            | null
          glasses_prescription_od_add?: number | null
          glasses_prescription_od_axis?: number | null
          glasses_prescription_od_cyl?: number | null
          glasses_prescription_od_sph?: number | null
          glasses_prescription_os_add?: number | null
          glasses_prescription_os_axis?: number | null
          glasses_prescription_os_cyl?: number | null
          glasses_prescription_os_sph?: number | null
          id?: string
          id_type?: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed?: boolean | null
          notes?: string | null
          optician_decision?: string | null
          optician_decision_date?: string | null
          optician_notes?: string | null
          organization_id: string
          passed_examination?: boolean | null
          personal_number?: string | null
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
          decided_by?: string | null
          entry_id?: string
          examination_status?:
            | Database["public"]["Enums"]["examination_status"]
            | null
          glasses_prescription_od_add?: number | null
          glasses_prescription_od_axis?: number | null
          glasses_prescription_od_cyl?: number | null
          glasses_prescription_od_sph?: number | null
          glasses_prescription_os_add?: number | null
          glasses_prescription_os_axis?: number | null
          glasses_prescription_os_cyl?: number | null
          glasses_prescription_os_sph?: number | null
          id?: string
          id_type?: Database["public"]["Enums"]["id_verification_type"] | null
          id_verification_completed?: boolean | null
          notes?: string | null
          optician_decision?: string | null
          optician_decision_date?: string | null
          optician_notes?: string | null
          organization_id?: string
          passed_examination?: boolean | null
          personal_number?: string | null
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
      form_attempt_reports: {
        Row: {
          created_at: string
          customer_attempted_online: boolean
          entry_id: string
          failure_description: string | null
          id: string
          organization_id: string
          reported_by: string
          reported_by_name: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          customer_attempted_online: boolean
          entry_id: string
          failure_description?: string | null
          id?: string
          organization_id: string
          reported_by: string
          reported_by_name: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          customer_attempted_online?: boolean
          entry_id?: string
          failure_description?: string | null
          id?: string
          organization_id?: string
          reported_by?: string
          reported_by_name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_attempt_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "anamnes_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_attempt_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_attempt_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      form_session_logs: {
        Row: {
          browser: string | null
          created_at: string | null
          current_question_id: string | null
          current_section_index: number | null
          device_type: string | null
          entry_id: string | null
          error_message: string | null
          error_type: string | null
          event_data: Json | null
          event_type: string
          form_progress_percent: number | null
          id: string
          is_touch_device: boolean | null
          organization_id: string
          session_id: string
          token: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          current_question_id?: string | null
          current_section_index?: number | null
          device_type?: string | null
          entry_id?: string | null
          error_message?: string | null
          error_type?: string | null
          event_data?: Json | null
          event_type: string
          form_progress_percent?: number | null
          id?: string
          is_touch_device?: boolean | null
          organization_id: string
          session_id: string
          token?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          current_question_id?: string | null
          current_section_index?: number | null
          device_type?: string | null
          entry_id?: string | null
          error_message?: string | null
          error_type?: string | null
          event_data?: Json | null
          event_type?: string
          form_progress_percent?: number | null
          id?: string
          is_touch_device?: boolean | null
          organization_id?: string
          session_id?: string
          token?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_session_logs_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "anamnes_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_session_logs: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          entry_id: string | null
          event_data: Json | null
          event_type: string
          form_id: string | null
          id: string
          is_touch_device: boolean | null
          journey_id: string
          organization_id: string | null
          page_type: string
          referrer: string | null
          store_id: string | null
          token: string | null
          url_params: Json | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          entry_id?: string | null
          event_data?: Json | null
          event_type: string
          form_id?: string | null
          id?: string
          is_touch_device?: boolean | null
          journey_id: string
          organization_id?: string | null
          page_type: string
          referrer?: string | null
          store_id?: string | null
          token?: string | null
          url_params?: Json | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          entry_id?: string | null
          event_data?: Json | null
          event_type?: string
          form_id?: string | null
          id?: string
          is_touch_device?: boolean | null
          journey_id?: string
          organization_id?: string | null
          page_type?: string
          referrer?: string | null
          store_id?: string | null
          token?: string | null
          url_params?: Json | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          ai_prompt_driving_license: string | null
          ai_prompt_general: string | null
          ai_prompt_lens_examination: string | null
          created_at: string | null
          is_global_default: boolean | null
          last_auto_deletion_run: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          ai_prompt_driving_license?: string | null
          ai_prompt_general?: string | null
          ai_prompt_lens_examination?: string | null
          created_at?: string | null
          is_global_default?: boolean | null
          last_auto_deletion_run?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          ai_prompt_driving_license?: string | null
          ai_prompt_general?: string | null
          ai_prompt_lens_examination?: string | null
          created_at?: string | null
          is_global_default?: boolean | null
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
          is_system_org: boolean | null
          name: string
        }
        Insert: {
          id: string
          is_system_org?: boolean | null
          name: string
        }
        Update: {
          id?: string
          is_system_org?: boolean | null
          name?: string
        }
        Relationships: []
      }
      store_forms: {
        Row: {
          created_at: string
          form_id: string
          id: string
          is_active: boolean
          organization_id: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          is_active?: boolean
          organization_id: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "anamnes_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_forms_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
      upgrade_conversions: {
        Row: {
          created_at: string
          entry_id: string
          examination_type: string | null
          form_id: string | null
          id: string
          organization_id: string
          store_id: string | null
          upgrade_accepted: boolean
          upgrade_question_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          examination_type?: string | null
          form_id?: string | null
          id?: string
          organization_id: string
          store_id?: string | null
          upgrade_accepted: boolean
          upgrade_question_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          examination_type?: string | null
          form_id?: string | null
          id?: string
          organization_id?: string
          store_id?: string | null
          upgrade_accepted?: boolean
          upgrade_question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_conversions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "anamnes_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_conversions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "anamnes_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_conversions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_conversions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
          onboarding_completed: boolean | null
          onboarding_step: number | null
          organization_id: string
          preferred_store_id: string | null
          role: string
        }
        Insert: {
          clerk_user_id: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          organization_id: string
          preferred_store_id?: string | null
          role?: string
        }
        Update: {
          clerk_user_id?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          organization_id?: string
          preferred_store_id?: string | null
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
          {
            foreignKeyName: "users_preferred_store_id_fkey"
            columns: ["preferred_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_submission_logs_table_function: { Args: never; Returns: boolean }
      debug_current_form_id: {
        Args: never
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
      set_access_token: { Args: { token: string }; Returns: undefined }
      set_current_form_id: { Args: { form_id: string }; Returns: undefined }
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
        | "CISS-formulär"
        | "ciss"
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
        "CISS-formulär",
        "ciss",
      ],
    },
  },
} as const
