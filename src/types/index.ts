export type Mood =
  | "calm"
  | "focused"
  | "joyful"
  | "longing"
  | "desire"
  | "melancholy"
  | "excited"
  | "protective";

export interface EmotionState {
  mood: Mood;
  intensity: number; // 0-1
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0 to 1 (calm to excited)
}

export interface Companion {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  personality_desc: string;
  rationality_level: number;
  emotion_level: number;
  big_five?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  timezone: string;
  location?: string;
  backstory?: string;
  lang_preference?: "zh" | "en" | "both";
  created_at: string;
  updated_at: string;
  adopted_from_plaza?: boolean;
  plaza_persona_id?: string;
  current_emotion?: EmotionState;
  is_active: boolean;
}

export interface PlazaPersona {
  id: string;
  name: string;
  avatar_url: string;
  description: string;
  personality_traits: string[];
  backstory: string;
  prompt_template: string;
  emotion_preset: EmotionState;
  big_five_preset?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  adopted_by?: string | null;
  created_at: string;
  is_unique: boolean;
}

export interface Message {
  id: string;
  companion_id: string;
  user_id: string;
  content: string;
  role: "user" | "companion";
  emotion_state?: EmotionState;
  memory_refs?: string[];
  created_at: string;
}

export interface Memory {
  id: string;
  companion_id: string;
  user_id: string;
  content: string;
  memory_type: "short_term" | "long_term" | "milestone";
  importance_score: number; // 0-1
  embedding?: number[];
  source_message_id?: string;
  created_at: string;
}

export interface RelationshipStats {
  id: string;
  companion_id: string;
  user_id: string;
  bond_level: number; // 1-100
  intimacy_score: number; // 0-100
  trust_score: number; // 0-100
  total_messages: number;
  days_together: number;
  first_interaction: string;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

export interface RelationshipEvent {
  id: string;
  companion_id: string;
  user_id: string;
  event_type:
    | "first_meet"
    | "adoption"
    | "deep_conversation"
    | "conflict"
    | "reconciliation"
    | "milestone"
    | "companion_initiated"
    | "shared_memory";
  description: string;
  bond_delta: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AmbientProfile {
  color: string;
  breatheDuration: number;
  opacityMin: number;
  opacityMax: number;
  particleChaos: number;
}
