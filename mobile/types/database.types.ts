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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_data: Json | null
          alert_type: string
          created_at: string | null
          device_id: string | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_device_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_data?: Json | null
          alert_type: string
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source_device_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_data?: Json | null
          alert_type?: string
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_device_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sensor_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          id: string
          user_id: string
          device_id: string | null
          activity: string
          timestamp_device: number | null
          extras: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          device_id?: string | null
          activity: string
          timestamp_device?: number | null
          extras?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_id?: string | null
          activity?: string
          timestamp_device?: number | null
          extras?: Json
          created_at?: string
        }
        Relationships: []
      }
      care_backup_contacts: {
        Row: {
          caregiver_user_id: string
          created_at: string | null
          full_name: string
          id: string
          is_primary: boolean
          notes: string | null
          phone_number: string
          priority: number
          relationship: string | null
          updated_at: string | null
        }
        Insert: {
          caregiver_user_id: string
          created_at?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone_number: string
          priority?: number
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          caregiver_user_id?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone_number?: string
          priority?: number
          relationship?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_backup_contacts_caregiver_user_id_fkey"
            columns: ["caregiver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_recipient_profiles: {
        Row: {
          caregiver_user_id: string
          created_at: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          caregiver_user_id: string
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          caregiver_user_id?: string
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_recipient_profiles_caregiver_user_id_fkey"
            columns: ["caregiver_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_statistics: {
        Row: {
          activity_class_breakdown: Json
          created_at: string | null
          fall_readings: number
          first_reading_at: string | null
          id: string
          imu_activity_event_count: number
          imu_critical_event_count: number
          last_fall_reading_at: string | null
          last_reading_at: string | null
          stat_date: string
          total_readings: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_class_breakdown?: Json
          created_at?: string | null
          fall_readings?: number
          first_reading_at?: string | null
          id?: string
          imu_activity_event_count?: number
          imu_critical_event_count?: number
          last_fall_reading_at?: string | null
          last_reading_at?: string | null
          stat_date: string
          total_readings?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_class_breakdown?: Json
          created_at?: string | null
          fall_readings?: number
          first_reading_at?: string | null
          id?: string
          imu_activity_event_count?: number
          imu_critical_event_count?: number
          last_fall_reading_at?: string | null
          last_reading_at?: string | null
          stat_date?: string
          total_readings?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_devices: {
        Row: {
          created_at: string | null
          device_id: string
          device_name: string
          firmware_version: string | null
          id: string
          is_active: boolean | null
          last_seen: string | null
          mac_address: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          device_name: string
          firmware_version?: string | null
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          mac_address?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          device_name?: string
          firmware_version?: string | null
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          mac_address?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_backup: boolean | null
          backup_frequency: string | null
          created_at: string | null
          email_notifications: boolean | null
          fall_alerts_enabled: boolean | null
          id: string
          push_notifications: boolean | null
          sms_notifications: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_backup?: boolean | null
          backup_frequency?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          fall_alerts_enabled?: boolean | null
          id?: string
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_backup?: boolean | null
          backup_frequency?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          fall_alerts_enabled?: boolean | null
          id?: string
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      device_status: {
        Row: {
          device_id: string | null
          device_name: string | null
          id: string | null
          is_active: boolean | null
          last_reading: string | null
          last_seen: string | null
          recent_readings: number | null
          total_readings: number | null
        }
        Relationships: []
      }
      user_dashboard: {
        Row: {
          active_devices: number | null
          avatar_url: string | null
          device_count: number | null
          full_name: string | null
          last_reading_time: string | null
          profile_id: string | null
          unread_alerts: number | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
