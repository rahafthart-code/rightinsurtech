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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          birth_date: string | null
          breed: string | null
          created_at: string
          estimated_value: number
          gender: Database["public"]["Enums"]["asset_gender"] | null
          id: string
          image_url: string | null
          microchip_id: string | null
          name: string
          notes: string | null
          owner_id: string
          type: Database["public"]["Enums"]["asset_type"]
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          estimated_value?: number
          gender?: Database["public"]["Enums"]["asset_gender"] | null
          id?: string
          image_url?: string | null
          microchip_id?: string | null
          name: string
          notes?: string | null
          owner_id: string
          type: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          estimated_value?: number
          gender?: Database["public"]["Enums"]["asset_gender"] | null
          id?: string
          image_url?: string | null
          microchip_id?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          amount_approved: number | null
          amount_requested: number | null
          asset_id: string
          created_at: string
          description: string | null
          id: string
          owner_id: string
          policy_id: string
          reason: string
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
        }
        Insert: {
          amount_approved?: number | null
          amount_requested?: number | null
          asset_id: string
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          policy_id: string
          reason: string
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number | null
          asset_id?: string
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          policy_id?: string
          reason?: string
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          asset_id: string
          coverage_amount: number
          created_at: string
          end_date: string | null
          id: string
          monthly_price: number
          owner_id: string
          plan: Database["public"]["Enums"]["policy_plan"]
          start_date: string
          status: Database["public"]["Enums"]["policy_status"]
        }
        Insert: {
          asset_id: string
          coverage_amount: number
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_price: number
          owner_id: string
          plan: Database["public"]["Enums"]["policy_plan"]
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"]
        }
        Update: {
          asset_id?: string
          coverage_amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_price?: number
          owner_id?: string
          plan?: Database["public"]["Enums"]["policy_plan"]
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"]
        }
        Relationships: [
          {
            foreignKeyName: "policies_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          asset_id: string
          heart_rate: number | null
          id: number
          lat: number | null
          lng: number | null
          owner_id: string
          recorded_at: string
          temperature: number | null
        }
        Insert: {
          asset_id: string
          heart_rate?: number | null
          id?: number
          lat?: number | null
          lng?: number | null
          owner_id: string
          recorded_at?: string
          temperature?: number | null
        }
        Update: {
          asset_id?: string
          heart_rate?: number | null
          id?: number
          lat?: number | null
          lng?: number | null
          owner_id?: string
          recorded_at?: string
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
      asset_gender: "male" | "female"
      asset_type: "horse" | "camel" | "falcon"
      claim_status: "submitted" | "reviewing" | "approved" | "rejected" | "paid"
      policy_plan: "hares" | "raee" | "amir"
      policy_status: "active" | "pending" | "expired" | "cancelled"
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
      app_role: ["admin"],
      asset_gender: ["male", "female"],
      asset_type: ["horse", "camel", "falcon"],
      claim_status: ["submitted", "reviewing", "approved", "rejected", "paid"],
      policy_plan: ["hares", "raee", "amir"],
      policy_status: ["active", "pending", "expired", "cancelled"],
    },
  },
} as const
