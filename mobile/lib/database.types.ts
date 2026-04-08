export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string | null;
          default_region: string | null;
          default_lat: number | null;
          default_lng: number | null;
          activity_regions: Json;
          default_transports: string[];
          cold_sensitivity: 'low' | 'normal' | 'high' | null;
          heat_sensitivity: 'low' | 'normal' | 'high' | null;
          default_transport: string | null;
          commute_student: boolean | null;
          notifications_enabled: boolean | null;
          onboarding_completed: boolean | null;
          is_admin: boolean | null;
          account_disabled: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname?: string | null;
          default_region?: string | null;
          default_lat?: number | null;
          default_lng?: number | null;
          activity_regions?: Json;
          default_transports?: string[];
          cold_sensitivity?: 'low' | 'normal' | 'high' | null;
          heat_sensitivity?: 'low' | 'normal' | 'high' | null;
          default_transport?: string | null;
          commute_student?: boolean | null;
          notifications_enabled?: boolean | null;
          onboarding_completed?: boolean | null;
          is_admin?: boolean | null;
          account_disabled?: boolean | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      weather_logs: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          region_slug: string;
          region_name: string | null;
          temperature_current: number | null;
          temperature_feels_like: number | null;
          temperature_min: number | null;
          temperature_max: number | null;
          humidity: number | null;
          wind_speed: number | null;
          precipitation_type: string | null;
          precipitation_probability: number | null;
          weather_condition: string | null;
          raw_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date: string;
          region_slug: string;
          region_name?: string | null;
          temperature_current?: number | null;
          temperature_feels_like?: number | null;
          temperature_min?: number | null;
          temperature_max?: number | null;
          humidity?: number | null;
          wind_speed?: number | null;
          precipitation_type?: string | null;
          precipitation_probability?: number | null;
          weather_condition?: string | null;
          raw_json?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['weather_logs']['Insert']>;
      };
      outfit_logs: {
        Row: {
          id: string;
          user_id: string;
          weather_log_id: string | null;
          worn_on: string;
          photo_path: string | null;
          top_category: string | null;
          bottom_category: string | null;
          outer_category: string | null;
          shoes_category: string | null;
          accessory_tags: Json | null;
          thickness_level: string | null;
          memo: string | null;
          similarity_snapshot: Json | null;
          feels_like_bucket: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weather_log_id?: string | null;
          worn_on: string;
          photo_path?: string | null;
          top_category?: string | null;
          bottom_category?: string | null;
          outer_category?: string | null;
          shoes_category?: string | null;
          accessory_tags?: Json | null;
          thickness_level?: string | null;
          memo?: string | null;
          similarity_snapshot?: Json | null;
          feels_like_bucket?: number | null;
        };
        Update: Partial<Database['public']['Tables']['outfit_logs']['Insert']>;
      };
      context_logs: {
        Row: {
          id: string;
          outfit_log_id: string;
          user_id: string;
          transport_type: string | null;
          activity_level: string | null;
          indoor_outdoor_ratio: string | null;
          situation_tags: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outfit_log_id: string;
          user_id: string;
          transport_type?: string | null;
          activity_level?: string | null;
          indoor_outdoor_ratio?: string | null;
          situation_tags?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['context_logs']['Insert']>;
      };
      feedback_logs: {
        Row: {
          id: string;
          outfit_log_id: string;
          user_id: string;
          timing_type: 'first' | 'middle' | 'last' | null;
          feeling_type: string | null;
          discomfort_tags: Json | null;
          note: string | null;
          transport_type: string | null;
          place_tags: Json | null;
          context_mode: 'transit' | 'place' | null;
          place_singular: string | null;
          time_period: string | null;
          weather_snapshot: Json | null;
          overall_satisfaction: number | null;
          improvement_tags: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outfit_log_id: string;
          user_id: string;
          timing_type?: 'first' | 'middle' | 'last' | null;
          feeling_type?: string | null;
          discomfort_tags?: Json | null;
          note?: string | null;
          transport_type?: string | null;
          place_tags?: Json | null;
          context_mode?: 'transit' | 'place' | null;
          place_singular?: string | null;
          time_period?: string | null;
          weather_snapshot?: Json | null;
          overall_satisfaction?: number | null;
          improvement_tags?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['feedback_logs']['Insert']>;
      };
      rating_logs: {
        Row: {
          id: string;
          outfit_log_id: string;
          user_id: string;
          overall_rating: number | null;
          temperature_rating: number | null;
          mobility_rating: number | null;
          context_fit_rating: number | null;
          style_rating: number | null;
          would_wear_again: boolean | null;
          improvement_tags: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outfit_log_id: string;
          user_id: string;
          overall_rating?: number | null;
          temperature_rating?: number | null;
          mobility_rating?: number | null;
          context_fit_rating?: number | null;
          style_rating?: number | null;
          would_wear_again?: boolean | null;
          improvement_tags?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['rating_logs']['Insert']>;
      };
      favorite_outfits: {
        Row: { user_id: string; outfit_log_id: string; created_at: string };
        Insert: { user_id: string; outfit_log_id: string };
        Update: Partial<Database['public']['Tables']['favorite_outfits']['Insert']>;
      };
      recommendation_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          weather_log_id: string | null;
          recommended_outfit_log_ids: Json | null;
          selected_outfit_log_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          weather_log_id?: string | null;
          recommended_outfit_log_ids?: Json | null;
          selected_outfit_log_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['recommendation_logs']['Insert']>;
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          body: string;
          status: 'open' | 'in_progress' | 'answered' | 'closed';
          admin_reply: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          body: string;
          status?: 'open' | 'in_progress' | 'answered' | 'closed';
          admin_reply?: string | null;
        };
        Update: Partial<Database['public']['Tables']['support_tickets']['Insert']>;
      };
      app_notices: {
        Row: {
          id: string;
          title: string;
          body: string;
          is_active: boolean;
          is_pinned: boolean;
          starts_at: string;
          ends_at: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          is_active?: boolean;
          is_pinned?: boolean;
          starts_at?: string;
          ends_at?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['app_notices']['Insert']>;
      };
    };
    Functions: {
      withdraw_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
  };
}
