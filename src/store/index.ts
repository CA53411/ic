import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Companion,
  EmotionState,
  Message,
  Memory,
  RelationshipStats,
  RelationshipEvent,
  PlazaPersona,
  UserProfile,
  AmbientProfile,
} from "../types";

interface AppState {
  // Auth
  user: UserProfile | null;
  session: any | null;
  setUser: (user: UserProfile | null) => void;
  setSession: (session: any | null) => void;

  // Companion
  companion: Companion | null;
  setCompanion: (companion: Companion | null) => void;

  // Messages
  messages: Message[];
  addMessage: (msg: Message) => void;
  removeMessage: (msgId: string) => void;
  setMessages: (msgs: Message[]) => void;

  // Memories
  memories: Memory[];
  setMemories: (memories: Memory[]) => void;

  // Relationship
  relationship: RelationshipStats | null;
  setRelationship: (rel: RelationshipStats | null) => void;
  events: RelationshipEvent[];
  setEvents: (events: RelationshipEvent[]) => void;

  // Plaza
  plazaPersonas: PlazaPersona[];
  setPlazaPersonas: (personas: PlazaPersona[]) => void;

  // Ambience
  ambientProfile: AmbientProfile;
  setAmbientProfile: (profile: AmbientProfile) => void;
  updateFromEmotion: (emotion: EmotionState) => void;

  // UI
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const defaultAmbient: AmbientProfile = {
  color: "#FFB6C1",
  breatheDuration: 4,
  opacityMin: 0.03,
  opacityMax: 0.08,
  particleChaos: 0.2,
};

const moodToAmbient = (mood: string, intensity: number): AmbientProfile => {
  const base: Record<string, Partial<AmbientProfile>> = {
    calm: { color: "#FFB6C1", breatheDuration: 5, opacityMin: 0.02, opacityMax: 0.06, particleChaos: 0.1 },
    focused: { color: "#FF69B4", breatheDuration: 3.5, opacityMin: 0.04, opacityMax: 0.08, particleChaos: 0.3 },
    joyful: { color: "#FF1493", breatheDuration: 2, opacityMin: 0.06, opacityMax: 0.12, particleChaos: 0.7 },
    longing: { color: "#C71585", breatheDuration: 6, opacityMin: 0.03, opacityMax: 0.07, particleChaos: 0.4 },
    desire: { color: "#FF0000", breatheDuration: 2.5, opacityMin: 0.08, opacityMax: 0.15, particleChaos: 0.9 },
    melancholy: { color: "#8B008B", breatheDuration: 7, opacityMin: 0.02, opacityMax: 0.05, particleChaos: 0.1 },
    excited: { color: "#FF1493", breatheDuration: 2.2, opacityMin: 0.07, opacityMax: 0.14, particleChaos: 0.8 },
    protective: { color: "#FF6B9D", breatheDuration: 4.5, opacityMin: 0.03, opacityMax: 0.07, particleChaos: 0.2 },
  };

  const profile = base[mood] || base.calm;
  const i = Math.max(0, Math.min(1, intensity));

  return {
    color: profile.color || "#FFB6C1",
    breatheDuration: (profile.breatheDuration || 4) * (1 - i * 0.3),
    opacityMin: (profile.opacityMin || 0.03) * (1 + i * 0.5),
    opacityMax: (profile.opacityMax || 0.08) * (1 + i),
    particleChaos: (profile.particleChaos || 0.2) * (1 + i),
  };
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),

      companion: null,
      setCompanion: (companion) => set({ companion }),

      messages: [],
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      removeMessage: (msgId) => set((state) => ({ messages: state.messages.filter((m) => m.id !== msgId) })),
      setMessages: (msgs) => set({ messages: msgs }),

      memories: [],
      setMemories: (memories) => set({ memories }),

      relationship: null,
      setRelationship: (relationship) => set({ relationship }),
      events: [],
      setEvents: (events) => set({ events }),

      plazaPersonas: [],
      setPlazaPersonas: (plazaPersonas) => set({ plazaPersonas }),

      ambientProfile: defaultAmbient,
      setAmbientProfile: (ambientProfile) => set({ ambientProfile }),
      updateFromEmotion: (emotion) =>
        set({ ambientProfile: moodToAmbient(emotion.mood, emotion.intensity) }),

      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),
      currentPage: "landing",
      setCurrentPage: (currentPage) => set({ currentPage }),
    }),
    {
      name: "platonic-storage",
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        companion: state.companion,
        messages: state.messages,
        ambientProfile: state.ambientProfile,
      }),
    }
  )
);
