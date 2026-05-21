/**
 * chat-stream Edge Function
 * SSE streaming conversation with AI companion for Platonic AI.
 *
 * Endpoint: POST /chat-stream
 * Body: { message: string }
 * Auth: JWT Bearer token in Authorization header
 * Response: text/event-stream (SSE)
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
  checkEnergy,
  consumeEnergy,
  getCompanionForUser,
  getLTMMemories,
  getMoodRecord,
  getRecentMessages,
  getSupabaseClient,
  getUser,
} from "../_shared/supabase.ts";
import { buildSystemPrompt, streamChat } from "../_shared/deepseek.ts";

// ---- Types ----

interface ChatRequest {
  message: string;
}

interface STMMessage {
  id?: string;
  companion_id: string;
  speaker: "user" | "companion";
  content: string;
  created_at?: string;
}

interface IntimacyRecord {
  id?: string;
  companion_id: string;
  level: number;
  points: number;
  milestone_name?: string | null;
  milestone_unlocked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ---- Helpers ----

/**
 * Parse and validate the incoming JSON body.
 */
function parseBody(raw: unknown): ChatRequest {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid JSON body");
  }
  const body = raw as Record<string, unknown>;
  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    throw new Error("Missing or empty 'message' field");
  }
  return { message: body.message.trim() };
}

/**
 * Save a message to the stm_messages table.
 */
async function saveMessage(
  supabase: ReturnType<typeof getSupabaseClient>,
  message: STMMessage,
): Promise<void> {
  const { error } = await supabase
    .from("stm_messages")
    .insert(message);

  if (error) {
    console.error("[chat-stream] Failed to save message:", error);
    // Non-fatal: we don't throw so the stream isn't interrupted
  }
}

/**
 * Fetch the intimacy record for a companion to determine milestone context.
 */
async function getIntimacyRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  companionId: string,
): Promise<IntimacyRecord | null> {
  const { data, error } = await supabase
    .from("intimacy_records")
    .select("*")
    .eq("companion_id", companionId)
    .single();

  if (error) {
    console.warn("[chat-stream] No intimacy record found:", error.message);
    return null;
  }

  return data as IntimacyRecord;
}

// ---- Main Handler ----

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // 2. Extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization") ?? undefined;
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Create Supabase client with user auth
    const supabase = getSupabaseClient(authHeader);

    // 4. Get authenticated user
    const user = await getUser(supabase);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Get companion for this user
    const companion = await getCompanionForUser(supabase, user.id);
    if (!companion) {
      return new Response(
        JSON.stringify({ error: "No companion found for user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse request body early so we can use the message
    const rawBody = await req.json();
    const request = parseBody(rawBody);

    // 6. Check energy balance (50 energy per chat message)
    const energyCheck = await checkEnergy(supabase, user.id, 50);
    if (!energyCheck.sufficient) {
      return new Response(
        JSON.stringify({
          error: "Insufficient energy",
          balance: energyCheck.balance,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Consume energy
    await consumeEnergy(supabase, user.id, 50, "chat_message");

    // 8. Get recent messages (last 10 for STM context)
    const recentMessages = await getRecentMessages(supabase, companion.id, 10);

    // 9. Get LTM memories (top 5 most relevant)
    const ltmMemories = await getLTMMemories(supabase, companion.id, 5);

    // 10. Get mood record for emotional context
    const mood = await getMoodRecord(supabase, companion.id);

    // 11. Get intimacy / milestone record
    const intimacyRecord = await getIntimacyRecord(supabase, companion.id);

    // 12. Build system prompt
    const systemPrompt = buildSystemPrompt(companion, mood, ltmMemories, intimacyRecord);

    // 13. Build messages array for DeepSeek
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...recentMessages.map((m: { speaker: string; content: string }) => ({
        role: m.speaker === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
      { role: "user" as const, content: request.message },
    ];

    // 14. Save user message to STM
    await saveMessage(supabase, {
      companion_id: companion.id,
      speaker: "user",
      content: request.message,
    });

    // 15. Set up SSE stream
    const { readable, writable } = new TransformStream<
      string,
      string
    >();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Stream DeepSeek response in background
    (async () => {
      let fullResponse = "";

      try {
        // 16. Stream from DeepSeek
        for await (const chunk of streamChat(messages, {})) {
          fullResponse += chunk;
          // Send each chunk as SSE data
          await writer.write(
            encoder.encode(`data: ${chunk}\n\n`),
          );
        }

        // 17. Send [DONE] event
        await writer.write(encoder.encode("data: [DONE]\n\n"));

        // 18. Save AI response to STM after stream completes
        if (fullResponse.trim().length > 0) {
          await saveMessage(supabase, {
            companion_id: companion.id,
            speaker: "companion",
            content: fullResponse.trim(),
          });
        }
      } catch (err: unknown) {
        // 19. Handle streaming errors
        const errMsg = err instanceof Error ? err.message : "Stream error";
        console.error("[chat-stream] Stream error:", errMsg);
        await writer.write(
          encoder.encode(`data: [ERROR] ${errMsg}\n\n`),
        );
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally {
        await writer.close();
      }
    })();

    // Return SSE response
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[chat-stream] Handler error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
