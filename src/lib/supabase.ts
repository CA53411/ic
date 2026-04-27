import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing.");
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "platonic-auth-token",
    },
    global: {
      headers: { "X-Client-Info": "platonic-web" },
    },
  }
);

export type SupabaseClient = typeof supabase;