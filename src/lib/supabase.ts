import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

// 显式传入第三个参数对象，消除 feature_collector deprecated 警告
// 并确保 session 持久化策略明确，functions.invoke 才能自动带 Authorization
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
      headers: {
        "X-Client-Info": "platonic-web",
      },
    },
  }
);

export type SupabaseClient = typeof supabase;