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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      game_logs: {
        Row: {
          action: string
          created_at: string
          floor: number | null
          id: string
          spot_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          floor?: number | null
          id?: string
          spot_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          floor?: number | null
          id?: string
          spot_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_logs_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          floor: number
          id: string
          latitude: number
          longitude: number
          qr_code_info: string | null
          quiz_content: string | null
          region_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          floor?: number
          id?: string
          latitude: number
          longitude: number
          qr_code_info?: string | null
          quiz_content?: string | null
          region_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          floor?: number
          id?: string
          latitude?: number
          longitude?: number
          qr_code_info?: string | null
          quiz_content?: string | null
          region_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_region: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_region?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_region?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_region_fkey"
            columns: ["assigned_region"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          bounds_east: number
          bounds_north: number
          bounds_south: number
          bounds_west: number
          center_lat: number
          center_lng: number
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          bounds_east: number
          bounds_north: number
          bounds_south: number
          bounds_west: number
          center_lat: number
          center_lng: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          bounds_east?: number
          bounds_north?: number
          bounds_south?: number
          bounds_west?: number
          center_lat?: number
          center_lng?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      spot_elements: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          latitude: number
          longitude: number
          spot_id: string
          theme_element_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          latitude: number
          longitude: number
          spot_id: string
          theme_element_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          latitude?: number
          longitude?: number
          spot_id?: string
          theme_element_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_elements_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_elements_theme_element_id_fkey"
            columns: ["theme_element_id"]
            isOneToOne: false
            referencedRelation: "theme_elements"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          bounds_east: number | null
          bounds_north: number | null
          bounds_south: number | null
          bounds_west: number | null
          created_at: string
          creator_id: string | null
          description: string | null
          floor: number
          hint_text: string | null
          id: string
          is_active: boolean
          item_icon: string | null
          item_name: string | null
          latitude: number
          longitude: number
          name: string
          quest_id: string | null
          theme_id: string | null
        }
        Insert: {
          bounds_east?: number | null
          bounds_north?: number | null
          bounds_south?: number | null
          bounds_west?: number | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          floor?: number
          hint_text?: string | null
          id?: string
          is_active?: boolean
          item_icon?: string | null
          item_name?: string | null
          latitude: number
          longitude: number
          name: string
          quest_id?: string | null
          theme_id?: string | null
        }
        Update: {
          bounds_east?: number | null
          bounds_north?: number | null
          bounds_south?: number | null
          bounds_west?: number | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          floor?: number
          hint_text?: string | null
          id?: string
          is_active?: boolean
          item_icon?: string | null
          item_name?: string | null
          latitude?: number
          longitude?: number
          name?: string
          quest_id?: string | null
          theme_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spots_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_elements: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          element_type: Database["public"]["Enums"]["theme_element_type"]
          icon: string | null
          id: string
          image_url: string | null
          sort_order: number | null
          theme_id: string
          title: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          element_type: Database["public"]["Enums"]["theme_element_type"]
          icon?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          theme_id: string
          title: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          element_type?: Database["public"]["Enums"]["theme_element_type"]
          icon?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          theme_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_elements_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          category: Database["public"]["Enums"]["theme_category"]
          color_primary: string | null
          color_secondary: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          thumbnail_url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["theme_category"]
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          thumbnail_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["theme_category"]
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          acquired_at: string
          id: string
          item_icon: string | null
          item_name: string
          spot_id: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_icon?: string | null
          item_name: string
          spot_id?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          item_icon?: string | null
          item_name?: string
          spot_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_region: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "main_admin" | "sub_admin"
      theme_category: "biblical" | "historical" | "fantasy" | "nature"
      theme_element_type: "item" | "quiz" | "puzzle" | "story"
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
      app_role: ["main_admin", "sub_admin"],
      theme_category: ["biblical", "historical", "fantasy", "nature"],
      theme_element_type: ["item", "quiz", "puzzle", "story"],
    },
  },
} as const
