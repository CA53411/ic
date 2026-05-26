// ============================================
// Platonic AI — Memory Consolidation Edge Function
// ============================================
// Purpose: Daily STM (Short-Term Memory) → LTM (Long-Term Memory) consolidation
// Triggered by: pg_cron (daily) or manual POST request
// Auth: Service Role Key (admin only)
//
// This function processes the last 24 hours of conversation messages for each
// active companion, extracts key memories using DeepSeek JSON mode, and stores
// them in the long-term memory tables (ltm_memories + anterior_memories).
// ============================================

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { chatJSON } from "../_shared/deepseek.ts";

// --- Type Definitions ---

/** Represents a single extracted long-term memory */
interface ExtractedMemory {
  content: string;
  type: "fact" | "preference" | "event" | "emotion";
  importance: number;
  is_permanent: boolean;
  source_dialogue_ids: string[];
}

/** Represents an anterior (future-looking) memory / reminder */
interface AnteriorMemory {
  content: string;
  trigger_type: "time_based" | "event_based" | "emotional_cue";
  scheduled_time: string;
  priority: number;
}

/** Represents the emotional summary of a conversation batch */
interface EmotionSummary {
  dominant_emotion: string;
  emotional_shift: string;
}

/** The full JSON response expected from DeepSeek */
interface ConsolidationResult {
  memories: ExtractedMemory[];
  anterior_memories: AnteriorMemory[];
  emotion_summary: EmotionSummary;
}

/** Companion record shape */
interface Companion {
  id: string;
  user_id: string;
  name: string;
  [key: string]: unknown;
}

/** STM message record shape */
interface STMMessage {
  id: string;
  companion_id: string;
  content: string;
  role: string;
  emotion?: string;
  created_at: string;
  [key: string]: unknown;
}

// --- Consolidation Prompt Builder ---

/**
 * Builds the consolidation prompt for DeepSeek.
 * @param messages - The last 24h of messages for a companion
 * @returns The formatted prompt string
 */
function buildConsolidationPrompt(messages: STMMessage[]): string {
  const formattedMessages = messages
    .map(
      (m) =>
        `[${m.role}] ${m.created_at}: ${m.content}${
          m.emotion ? ` (emotion: ${m.emotion})` : ""
        }`
    )
    .join("\n");

  return `你是一个记忆提取专家。请分析以下对话，提取关键记忆。

对话记录：
${formattedMessages}

请输出JSON格式：
{
  "memories": [
    {
      "content": "记忆内容（事实/偏好/事件/情感）",
      "type": "fact|preference|event|emotion",
      "importance": 0.1-1.0,
      "is_permanent": false,
      "source_dialogue_ids": ["id1"]
    }
  ],
  "anterior_memories": [
    {
      "content": "待办描述",
      "trigger_type": "time_based|event_based|emotional_cue",
      "scheduled_time": "2026-01-20T10:00:00Z",
      "priority": 0.0-1.0
    }
  ],
  "emotion_summary": {
    "dominant_emotion": "情绪标签",
    "emotional_shift": "情绪变化描述"
  }
}

重要性评分：1.0=不可磨灭(生日/姓名), 0.8-0.9=非常重要, 0.5-0.7=重要, 0.3-0.4=一般, 0.1-0.2=琐事`;
}

// --- Main Handler ---

/**
 * Main entry point for the consolidation edge function.
 * Processes all active companions' daily messages and consolidates
 * short-term memories into long-term storage.
 */
Deno.serve(async (req: Request) => {
  // Step 1: Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Step 2: Create Supabase client with service role key (admin access)
    // The service role key allows unrestricted access to all tables
    const supabase = getSupabaseClient();

    // Step 3: Fetch all active companions
    // We process every companion that exists in the system
    const { data: companions, error: companionsError } = await supabase
      .from("companions")
      .select("*");

    if (companionsError) {
      console.error("Failed to fetch companions:", companionsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch companions", details: companionsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!companions || companions.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, memories_created: 0, anterior_created: 0, message: "No companions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate the 24-hour cutoff time
    const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();

    // Tracking counters for the response
    let processedCount = 0;
    let totalMemoriesCreated = 0;
    let totalAnteriorCreated = 0;

    // Step 4: Process each companion
    for (const companion of companions as Companion[]) {
      console.log(`Processing companion: ${companion.name} (${companion.id})`);

      // 4a: Get last 24h messages from short-term memory table
      const { data: messages, error: messagesError } = await supabase
        .from("stm_messages")
        .select("*")
        .eq("companion_id", companion.id)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error(`Failed to fetch messages for companion ${companion.id}:`, messagesError);
        continue; // Skip this companion, continue with the next
      }

      // 4b: Skip companions with too few messages (threshold = 5)
      if (!messages || messages.length < 5) {
        console.log(`Skipping companion ${companion.id} — only ${messages?.length ?? 0} messages (< 5)`);
        continue;
      }

      // 4c: Build the consolidation prompt
      const prompt = buildConsolidationPrompt(messages as STMMessage[]);

      // 4d: Call DeepSeek to extract memories (JSON mode)
      const result = await chatJSON<ConsolidationResult>([
        { role: "system", content: "You are a memory extraction expert. Extract key facts, preferences, events, and emotions from conversations." },
        { role: "user", content: prompt },
      ]);

      if (!result) {
        console.error(`DeepSeek returned no result for companion ${companion.id}`);
        continue;
      }

      // 4e: Insert extracted long-term memories
      if (result.memories && result.memories.length > 0) {
        const memoryInserts = result.memories.map((memory) => ({
          companion_id: companion.id,
          user_id: companion.user_id,
          content: memory.content,
          type: memory.type,
          importance: memory.importance,
          is_permanent: memory.is_permanent,
          source_dialogue_ids: memory.source_dialogue_ids,
          created_at: new Date().toISOString(),
        }));

        const { error: ltmError } = await supabase
          .from("ltm_memories")
          .insert(memoryInserts);

        if (ltmError) {
          console.error(`Failed to insert LTM for companion ${companion.id}:`, ltmError);
        } else {
          totalMemoriesCreated += result.memories.length;
          console.log(`Inserted ${result.memories.length} LTM memories for companion ${companion.id}`);
        }
      }

      // 4f: Insert/Update anterior (future-looking) memories
      if (result.anterior_memories && result.anterior_memories.length > 0) {
        const anteriorInserts = result.anterior_memories.map((anterior) => ({
          companion_id: companion.id,
          user_id: companion.user_id,
          content: anterior.content,
          trigger_type: anterior.trigger_type,
          scheduled_time: anterior.scheduled_time,
          priority: anterior.priority,
          status: "pending",
          created_at: new Date().toISOString(),
        }));

        const { error: anteriorError } = await supabase
          .from("anterior_memories")
          .insert(anteriorInserts);

        if (anteriorError) {
          console.error(`Failed to insert anterior memories for companion ${companion.id}:`, anteriorError);
        } else {
          totalAnteriorCreated += result.anterior_memories.length;
          console.log(`Inserted ${result.anterior_memories.length} anterior memories for companion ${companion.id}`);
        }
      }

      // 4g: Generate companion diary entry based on emotion summary
      if (result.emotion_summary) {
        const diaryEntry = {
          companion_id: companion.id,
          user_id: companion.user_id,
          dominant_emotion: result.emotion_summary.dominant_emotion,
          emotional_shift: result.emotion_summary.emotional_shift,
          messages_processed: messages.length,
          created_at: new Date().toISOString(),
        };

        const { error: diaryError } = await supabase
          .from("companion_diaries")
          .insert(diaryEntry);

        if (diaryError) {
          console.error(`Failed to insert diary for companion ${companion.id}:`, diaryError);
        } else {
          console.log(`Diary entry created for companion ${companion.id}`);
        }
      }

      processedCount++;
      console.log(`Completed processing companion ${companion.id}`);
    }

    // Step 5: Return summary statistics
    const response = {
      processed: processedCount,
      memories_created: totalMemoriesCreated,
      anterior_created: totalAnteriorCreated,
      total_companions: companions.length,
      timestamp: new Date().toISOString(),
    };

    console.log("Consolidation complete:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Global error handler — catches any unexpected errors
    console.error("Consolidation function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error during consolidation",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
