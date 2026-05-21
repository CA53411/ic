// ============================================
// Platonic AI — Intimacy Milestone Adjustment Edge Function
// ============================================
// Purpose: Daily intimacy score adjustment based on conversation activity
// Triggered by: pg_cron (daily)
// Auth: Service Role Key (admin only)
//
// This function evaluates each companion's conversation activity over the last
// 24 hours and adjusts their intimacy score accordingly. The intimacy score
// (0-100) determines the relationship milestone stage (1-5).
//
// Scoring rules:
//   Message volume: ≥50 → +5, ≥20 → +3, ≥5 → +1
//   Sentiment: avg > 0.5 → +5, > 0.2 → +3, < -0.5 → -3
//   Deep conversations (>100 chars): +2 each, max +5
//   Inactivity penalty: 3 days no chat → -1, 7 days → -3
//
// Milestone thresholds:
//   Stage 1: 0-20 | Stage 2: 21-40 | Stage 3: 41-60 | Stage 4: 61-80 | Stage 5: 81-100
// ============================================

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";

// --- Type Definitions ---

/** Companion with intimacy record */
interface CompanionWithIntimacy {
  id: string;
  user_id: string;
  name: string;
  intimacy_record?: {
    id: string;
    current_score: number;
    current_stage: number;
  };
  [key: string]: unknown;
}

/** STM message with emotion data */
interface STMMessage {
  id: string;
  content: string;
  emotion?: string;
  created_at: string;
  [key: string]: unknown;
}

/** Result of activity analysis for a companion */
interface ActivityAnalysis {
  messageCount: number;
  avgSentiment: number;
  deepConversationCount: number;
  daysSinceLastMessage: number;
}

// --- Constants ---

/** Milestone stage thresholds: upper bound for each stage */
const MILESTONE_THRESHOLDS = [
  { stage: 1, max: 20 },
  { stage: 2, max: 40 },
  { stage: 3, max: 60 },
  { stage: 4, max: 80 },
  { stage: 5, max: 100 },
];

/** Minimum character count to qualify as a "deep conversation" message */
const DEEP_CONVERSATION_THRESHOLD = 100;

/** Minimum number of messages to process for a companion */
const MESSAGES_THRESHOLD = 5;

// --- Helper Functions ---

/**
 * Calculates the affection delta based on conversation activity.
 * @param analysis - The activity analysis result
 * @returns The calculated affection delta (can be negative)
 */
function calculateAffectionDelta(analysis: ActivityAnalysis): number {
  let delta = 0;

  // 1. Message volume bonus
  if (analysis.messageCount >= 50) {
    delta += 5;
  } else if (analysis.messageCount >= 20) {
    delta += 3;
  } else if (analysis.messageCount >= 5) {
    delta += 1;
  }

  // 2. Sentiment bonus/penalty
  if (analysis.avgSentiment > 0.5) {
    delta += 5;
  } else if (analysis.avgSentiment > 0.2) {
    delta += 3;
  } else if (analysis.avgSentiment < -0.5) {
    delta -= 3;
  }

  // 3. Deep conversation bonus (capped at +5)
  const deepBonus = Math.min(analysis.deepConversationCount * 2, 5);
  delta += deepBonus;

  // 4. Inactivity penalty
  if (analysis.daysSinceLastMessage >= 7) {
    delta -= 3;
  } else if (analysis.daysSinceLastMessage >= 3) {
    delta -= 1;
  }

  return delta;
}

/**
 * Determines the milestone stage based on the intimacy score.
 * @param score - The current intimacy score (0-100)
 * @returns The milestone stage (1-5)
 */
function determineStage(score: number): number {
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (score <= threshold.max) {
      return threshold.stage;
    }
  }
  return 5; // Fallback for scores above 100
}

/**
 * Parses a sentiment/emotion string into a numeric score.
 * Handles common emotion formats: numeric strings, emotion labels, JSON.
 * @param emotion - Raw emotion field value
 * @returns Numeric sentiment score between -1 and 1
 */
function parseSentiment(emotion: string | undefined): number {
  if (!emotion) return 0;

  // Try direct numeric parsing first
  const numeric = parseFloat(emotion);
  if (!isNaN(numeric)) {
    return Math.max(-1, Math.min(1, numeric)); // Clamp to [-1, 1]
  }

  // Try JSON parsing (some systems store sentiment as JSON)
  try {
    const parsed = JSON.parse(emotion);
    if (typeof parsed === "number") return Math.max(-1, Math.min(1, parsed));
    if (typeof parsed === "object" && parsed !== null) {
      // Common formats: { score: 0.5 }, { sentiment: 0.5 }, { value: 0.5 }
      const val = parsed.score ?? parsed.sentiment ?? parsed.value ?? 0;
      return Math.max(-1, Math.min(1, parseFloat(String(val)) || 0));
    }
  } catch {
    // Not JSON, try keyword matching
  }

  // Keyword-based sentiment mapping
  const positiveKeywords = ["happy", "joy", "love", "excited", "grateful", "positive", "good", "great", "excellent", "cheerful", "content", "optimistic"];
  const negativeKeywords = ["sad", "angry", "frustrated", "disappointed", "upset", "negative", "bad", "terrible", "anxious", "worried", "lonely", "depressed"];

  const lowerEmotion = emotion.toLowerCase();
  if (positiveKeywords.some((kw) => lowerEmotion.includes(kw))) return 0.6;
  if (negativeKeywords.some((kw) => lowerEmotion.includes(kw))) return -0.6;

  return 0; // Neutral fallback
}

// --- Main Handler ---

/**
 * Main entry point for the milestone adjustment edge function.
 * Iterates over all companions with intimacy records, analyzes their
 * 24-hour activity, and adjusts intimacy scores accordingly.
 */
Deno.serve(async (req: Request) => {
  // Step 1: Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Step 2: Create Supabase client with service role key (admin access)
    const supabase = getSupabaseClient();

    // Step 3: Get all companions that have intimacy records
    const { data: companions, error: companionsError } = await supabase
      .from("companions")
      .select(`
        *,
        intimacy_record:intimacy_records(*)
      `);

    if (companionsError) {
      console.error("Failed to fetch companions:", companionsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch companions", details: companionsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!companions || companions.length === 0) {
      return new Response(
        JSON.stringify({ adjusted: 0, message: "No companions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate the 24-hour cutoff time
    const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();

    let adjustedCount = 0;

    // Step 4: Process each companion
    for (const companion of companions as CompanionWithIntimacy[]) {
      const companionId = companion.id;
      const userId = companion.user_id;

      // 4a: Count messages in the last 24 hours
      const { data: recentMessages, error: recentError } = await supabase
        .from("stm_messages")
        .select("*")
        .eq("companion_id", companionId)
        .gte("created_at", twentyFourHoursAgo);

      if (recentError) {
        console.error(`Failed to fetch recent messages for ${companionId}:`, recentError);
        continue;
      }

      // 4b: Get the most recent message to calculate days since last chat
      const { data: lastMessage, error: lastMsgError } = await supabase
        .from("stm_messages")
        .select("created_at")
        .eq("companion_id", companionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let daysSinceLastMessage = 0;
      if (!lastMsgError && lastMessage) {
        const lastMessageDate = new Date(lastMessage.created_at);
        daysSinceLastMessage = (Date.now() - lastMessageDate.getTime()) / 86400000;
      }

      // 4c: Calculate sentiment average from stm_messages.emotion field
      let totalSentiment = 0;
      let sentimentCount = 0;

      // 4d: Count deep conversations (messages with content > 100 characters)
      let deepConversationCount = 0;

      if (recentMessages && recentMessages.length > 0) {
        for (const msg of recentMessages as STMMessage[]) {
          // Parse sentiment from emotion field
          const sentiment = parseSentiment(msg.emotion);
          totalSentiment += sentiment;
          sentimentCount++;

          // Count deep conversation messages
          if (msg.content && msg.content.length > DEEP_CONVERSATION_THRESHOLD) {
            deepConversationCount++;
          }
        }
      }

      const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;
      const messageCount = recentMessages?.length ?? 0;

      // Build activity analysis
      const analysis: ActivityAnalysis = {
        messageCount,
        avgSentiment,
        deepConversationCount,
        daysSinceLastMessage,
      };

      // 4e: Calculate affection delta
      const affectionDelta = calculateAffectionDelta(analysis);

      // Get current intimacy record
      const currentRecord = companion.intimacy_record;

      let currentScore = currentRecord?.current_score ?? 50; // Default to 50 if no record
      const newScore = Math.max(0, Math.min(100, currentScore + affectionDelta)); // Clamp to [0, 100]
      const newStage = determineStage(newScore);

      // 4f: Upsert intimacy record
      const recordId = currentRecord?.id ?? crypto.randomUUID();
      const { error: upsertError } = await supabase
        .from("intimacy_records")
        .upsert({
          id: recordId,
          companion_id: companionId,
          user_id: userId,
          current_score: newScore,
          current_stage: newStage,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error(`Failed to upsert intimacy record for ${companionId}:`, upsertError);
        continue;
      }

      // 4g: Insert intimacy history log
      const { error: historyError } = await supabase
        .from("intimacy_history")
        .insert({
          companion_id: companionId,
          user_id: userId,
          previous_score: currentScore,
          new_score: newScore,
          delta: affectionDelta,
          previous_stage: currentRecord?.current_stage ?? determineStage(currentScore),
          new_stage: newStage,
          message_count: messageCount,
          avg_sentiment: avgSentiment,
          deep_conversations: deepConversationCount,
          days_since_last_message: Math.round(daysSinceLastMessage),
          created_at: new Date().toISOString(),
        });

      if (historyError) {
        console.error(`Failed to insert intimacy history for ${companionId}:`, historyError);
        // Don't skip — the upsert succeeded, just the history log failed
      }

      console.log(
        `Companion ${companionId}: score ${currentScore} → ${newScore} (Δ${affectionDelta > 0 ? "+" : ""}${affectionDelta}), stage ${newStage}`
      );

      adjustedCount++;
    }

    // Step 5: Return summary
    const response = {
      adjusted: adjustedCount,
      total_companions: companions.length,
      timestamp: new Date().toISOString(),
    };

    console.log("Milestone adjustment complete:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Global error handler
    console.error("Milestone adjustment function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error during milestone adjustment",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
