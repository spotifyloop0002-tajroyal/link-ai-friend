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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          posts_created: number
          posts_published: number
          posts_scheduled: number
          settings: Json | null
          success_rate: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          posts_created?: number
          posts_published?: number
          posts_scheduled?: number
          settings?: Json | null
          success_rate?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          posts_created?: number
          posts_published?: number
          posts_scheduled?: number
          settings?: Json | null
          success_rate?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_analytics: {
        Row: {
          connections_count: number | null
          created_at: string
          followers_count: number | null
          id: string
          last_synced: string | null
          profile_url: string | null
          total_posts: number | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          connections_count?: number | null
          created_at?: string
          followers_count?: number | null
          id?: string
          last_synced?: string | null
          profile_url?: string | null
          total_posts?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          connections_count?: number | null
          created_at?: string
          followers_count?: number | null
          id?: string
          last_synced?: string | null
          profile_url?: string | null
          total_posts?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      linkedin_post_history: {
        Row: {
          comments: number | null
          created_at: string
          id: string
          likes: number | null
          linkedin_url: string | null
          post_content: string
          post_date: string | null
          scraped_at: string | null
          shares: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          id?: string
          likes?: number | null
          linkedin_url?: string | null
          post_content: string
          post_date?: string | null
          scraped_at?: string | null
          shares?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          id?: string
          likes?: number | null
          linkedin_url?: string | null
          post_content?: string
          post_date?: string | null
          scraped_at?: string | null
          shares?: number | null
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      post_analytics: {
        Row: {
          comments: number | null
          content_preview: string | null
          created_at: string
          id: string
          likes: number | null
          linkedin_url: string | null
          post_id: string
          post_timestamp: string | null
          scraped_at: string | null
          shares: number | null
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          content_preview?: string | null
          created_at?: string
          id?: string
          likes?: number | null
          linkedin_url?: string | null
          post_id: string
          post_timestamp?: string | null
          scraped_at?: string | null
          shares?: number | null
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          content_preview?: string | null
          created_at?: string
          id?: string
          likes?: number | null
          linkedin_url?: string | null
          post_id?: string
          post_timestamp?: string | null
          scraped_at?: string | null
          shares?: number | null
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      post_analytics_history: {
        Row: {
          comments: number | null
          created_at: string | null
          id: string
          likes: number | null
          post_id: string | null
          shares: number | null
          synced_at: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string | null
          id?: string
          likes?: number | null
          post_id?: string | null
          shares?: number | null
          synced_at?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string | null
          id?: string
          likes?: number | null
          post_id?: string | null
          shares?: number | null
          synced_at?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          comments_count: number | null
          content: string
          content_with_tracking: string | null
          created_at: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          likes_count: number | null
          linkedin_post_id: string | null
          linkedin_post_url: string | null
          next_retry_at: string | null
          photo_url: string | null
          posted_at: string | null
          retry_count: number | null
          scheduled_time: string | null
          sent_to_extension_at: string | null
          shares_count: number | null
          status: string | null
          tracking_id: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          views_count: number | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          comments_count?: number | null
          content: string
          content_with_tracking?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          likes_count?: number | null
          linkedin_post_id?: string | null
          linkedin_post_url?: string | null
          next_retry_at?: string | null
          photo_url?: string | null
          posted_at?: string | null
          retry_count?: number | null
          scheduled_time?: string | null
          sent_to_extension_at?: string | null
          shares_count?: number | null
          status?: string | null
          tracking_id?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          views_count?: number | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          comments_count?: number | null
          content?: string
          content_with_tracking?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          likes_count?: number | null
          linkedin_post_id?: string | null
          linkedin_post_url?: string | null
          next_retry_at?: string | null
          photo_url?: string | null
          posted_at?: string | null
          retry_count?: number | null
          scheduled_time?: string | null
          sent_to_extension_at?: string | null
          shares_count?: number | null
          status?: string | null
          tracking_id?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          background: string | null
          city: string | null
          company_description: string | null
          company_name: string | null
          country: string | null
          created_at: string
          daily_post_count: number | null
          default_topics: string[] | null
          email: string | null
          id: string
          industry: string | null
          last_active_at: string | null
          last_post_date: string | null
          linkedin_profile_confirmed: boolean | null
          linkedin_profile_data: Json | null
          linkedin_profile_edit_count: number | null
          linkedin_profile_url: string | null
          linkedin_profile_url_locked: boolean | null
          linkedin_username: string | null
          location: string | null
          name: string | null
          onboarding_completed: boolean | null
          phone_number: string | null
          post_frequency: string | null
          posting_goals: string[] | null
          posts_created_count: number | null
          posts_published_count: number | null
          posts_scheduled_count: number | null
          preferred_tone: string | null
          profile_last_scraped: string | null
          role: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          background?: string | null
          city?: string | null
          company_description?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          daily_post_count?: number | null
          default_topics?: string[] | null
          email?: string | null
          id?: string
          industry?: string | null
          last_active_at?: string | null
          last_post_date?: string | null
          linkedin_profile_confirmed?: boolean | null
          linkedin_profile_data?: Json | null
          linkedin_profile_edit_count?: number | null
          linkedin_profile_url?: string | null
          linkedin_profile_url_locked?: boolean | null
          linkedin_username?: string | null
          location?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          post_frequency?: string | null
          posting_goals?: string[] | null
          posts_created_count?: number | null
          posts_published_count?: number | null
          posts_scheduled_count?: number | null
          preferred_tone?: string | null
          profile_last_scraped?: string | null
          role?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          background?: string | null
          city?: string | null
          company_description?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          daily_post_count?: number | null
          default_topics?: string[] | null
          email?: string | null
          id?: string
          industry?: string | null
          last_active_at?: string | null
          last_post_date?: string | null
          linkedin_profile_confirmed?: boolean | null
          linkedin_profile_data?: Json | null
          linkedin_profile_edit_count?: number | null
          linkedin_profile_url?: string | null
          linkedin_profile_url_locked?: boolean | null
          linkedin_username?: string | null
          location?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          post_frequency?: string | null
          posting_goals?: string[] | null
          posts_created_count?: number | null
          posts_published_count?: number | null
          posts_scheduled_count?: number | null
          preferred_tone?: string | null
          profile_last_scraped?: string | null
          role?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_writing_style: {
        Row: {
          avg_post_length: number | null
          common_topics: string[] | null
          created_at: string
          emoji_usage: boolean | null
          hashtag_style: string | null
          id: string
          tone_analysis: Json | null
          total_posts_analyzed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_post_length?: number | null
          common_topics?: string[] | null
          created_at?: string
          emoji_usage?: boolean | null
          hashtag_style?: string | null
          id?: string
          tone_analysis?: Json | null
          total_posts_analyzed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_post_length?: number | null
          common_topics?: string[] | null
          created_at?: string
          emoji_usage?: boolean | null
          hashtag_style?: string | null
          id?: string
          tone_analysis?: Json | null
          total_posts_analyzed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_users_data: {
        Args: never
        Returns: {
          city: string
          company_name: string
          country: string
          created_at: string
          email: string
          followers_count: number
          id: string
          industry: string
          last_active_at: string
          linkedin_profile_url: string
          name: string
          onboarding_completed: boolean
          phone_number: string
          posts_created_count: number
          posts_published_count: number
          posts_scheduled_count: number
          role: string
          subscription_expires_at: string
          subscription_plan: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_post_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
