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
      couple_settings: {
        Row: {
          created_at: string
          id: number
          partner_one_name: string
          partner_two_name: string
          secret_code: string
        }
        Insert: {
          created_at?: string
          id?: number
          partner_one_name?: string
          partner_two_name?: string
          secret_code?: string
        }
        Update: {
          created_at?: string
          id?: number
          partner_one_name?: string
          partner_two_name?: string
          secret_code?: string
        }
        Relationships: []
      }
      food_items: {
        Row: {
          category: string
          created_at: string
          emoji: string
          energy_value: number
          happiness_value: number
          hunger_value: number
          id: string
          is_active: boolean
          is_unlockable: boolean
          name: string
          rarity: string
        }
        Insert: {
          category?: string
          created_at?: string
          emoji: string
          energy_value?: number
          happiness_value?: number
          hunger_value?: number
          id?: string
          is_active?: boolean
          is_unlockable?: boolean
          name: string
          rarity?: string
        }
        Update: {
          category?: string
          created_at?: string
          emoji?: string
          energy_value?: number
          happiness_value?: number
          hunger_value?: number
          id?: string
          is_active?: boolean
          is_unlockable?: boolean
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          created_at: string
          energy_delta: number
          food_emoji: string | null
          food_id: string | null
          food_name: string | null
          happiness_delta: number
          hunger_delta: number
          id: string
          interaction_type: string
          message: string | null
          partner_name: string
          xp_delta: number
        }
        Insert: {
          created_at?: string
          energy_delta?: number
          food_emoji?: string | null
          food_id?: string | null
          food_name?: string | null
          happiness_delta?: number
          hunger_delta?: number
          id?: string
          interaction_type: string
          message?: string | null
          partner_name: string
          xp_delta?: number
        }
        Update: {
          created_at?: string
          energy_delta?: number
          food_emoji?: string | null
          food_id?: string | null
          food_name?: string | null
          happiness_delta?: number
          hunger_delta?: number
          id?: string
          interaction_type?: string
          message?: string | null
          partner_name?: string
          xp_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "interactions_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_items: {
        Row: {
          consumed: boolean
          consumed_at: string | null
          created_at: string
          food_id: string
          id: string
          partner_name: string
          source_quest_id: string | null
        }
        Insert: {
          consumed?: boolean
          consumed_at?: string | null
          created_at?: string
          food_id: string
          id?: string
          partner_name: string
          source_quest_id?: string | null
        }
        Update: {
          consumed?: boolean
          consumed_at?: string | null
          created_at?: string
          food_id?: string
          id?: string
          partner_name?: string
          source_quest_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_items_source_quest_id_fkey"
            columns: ["source_quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_state: {
        Row: {
          current_mood: string
          energy: number
          equipped_accessory: string
          equipped_skin: string
          happiness: number
          hunger: number
          id: number
          last_fed_at: string | null
          last_interaction_at: string | null
          last_interaction_by: string | null
          level: number
          pet_name: string
          updated_at: string
          xp: number
        }
        Insert: {
          current_mood?: string
          energy?: number
          equipped_accessory?: string
          equipped_skin?: string
          happiness?: number
          hunger?: number
          id?: number
          last_fed_at?: string | null
          last_interaction_at?: string | null
          last_interaction_by?: string | null
          level?: number
          pet_name?: string
          updated_at?: string
          xp?: number
        }
        Update: {
          current_mood?: string
          energy?: number
          equipped_accessory?: string
          equipped_skin?: string
          happiness?: number
          hunger?: number
          id?: number
          last_fed_at?: string | null
          last_interaction_at?: string | null
          last_interaction_by?: string | null
          level?: number
          pet_name?: string
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          happiness_boost: number
          id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          happiness_boost?: number
          id?: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          happiness_boost?: number
          id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      quest_completions: {
        Row: {
          ai_reason: string | null
          created_at: string
          id: string
          partner_name: string
          photo_id: string | null
          photo_path: string | null
          quest_id: string
          status: string
        }
        Insert: {
          ai_reason?: string | null
          created_at?: string
          id?: string
          partner_name: string
          photo_id?: string | null
          photo_path?: string | null
          quest_id: string
          status?: string
        }
        Update: {
          ai_reason?: string | null
          created_at?: string
          id?: string
          partner_name?: string
          photo_id?: string | null
          photo_path?: string | null
          quest_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_completions_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          category: string
          cooldown_minutes: number
          created_at: string
          emoji: string
          hint: string
          id: string
          is_active: boolean
          proof_target: string
          proof_type: string
          reward_food_count: number
          reward_food_rarity: string
          reward_xp: number
          slug: string
          title: string
        }
        Insert: {
          category?: string
          cooldown_minutes?: number
          created_at?: string
          emoji?: string
          hint: string
          id?: string
          is_active?: boolean
          proof_target: string
          proof_type?: string
          reward_food_count?: number
          reward_food_rarity?: string
          reward_xp?: number
          slug: string
          title: string
        }
        Update: {
          category?: string
          cooldown_minutes?: number
          created_at?: string
          emoji?: string
          hint?: string
          id?: string
          is_active?: boolean
          proof_target?: string
          proof_type?: string
          reward_food_count?: number
          reward_food_rarity?: string
          reward_xp?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
