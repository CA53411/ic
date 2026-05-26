/**
 * proactive Edge Function
 * Generate a proactive message from the AI companion for Platonic AI.
 *
 * Endpoint: POST /proactive
 * Body: {} (empty)
 * Auth: JWT Bearer token in Authorization header
 * Response: application/json
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
  checkEnergy,
  consumeEnergy,
  getAnteriorMemories,
  getCompanionForUser,
  getSupabaseClient,
  getUser,
} from "../_shared/supabase.ts";
import { buildSystemPrompt, streamChat } from "../_shared/deepseek.ts";

// ---- Types ----

interface ProactiveResponse {
  message: string;
  anteriorTriggered: boolean;
}

interface STMMessage {
  id?: string;
  companion_id: string;
  speaker: "user" | "companion";
  content: string;
  created_at?: string;
}

// ---- Helpers ----

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
    console.error("[proactive] Failed to save message:", error);
    throw new Error(`Failed to save message: ${error.message}`);
  }
}

/**
 * Call DeepSeek in non-streaming mode with a token limit.
 */
async function generateProactiveMessage(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Promise<string> {
  let fullText = "";

  // streamChat is an async generator — consume it fully
  for await (const chunk of streamChat(messages, { max_tokens: maxTokens })) {
    fullText += chunk;
  }

  return fullText.trim();
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

    // 6. Check energy balance (30 energy per proactive message)
    const energyCheck = await checkEnergy(supabase, user.id, 30);
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
    await consumeEnergy(supabase, user.id, 30, "proactive_message");

    // 8. Get anterior memories (contextual triggers)
    const anteriorMemories = await getAnteriorMemories(supabase, companion.id);

    // 9. Build system prompt with proactive focus
    const systemPrompt = buildSystemPrompt(
      companion,
      null,           // no mood context for proactive
      [],             // no LTM memories
      null,           // no intimacy milestone
    );

    // 10. Add proactive instruction
    const proactiveInstruction =
      "根据待办事项和当前时间，主动发起一次温暖的对话。";

    // 11. Build messages array with anterior memories context
    const messages = [
      {
        role: "system" as const,
        content: `${systemPrompt}\n\n${proactiveInstruction}`,
      },
      // Inject anterior memories as context if any exist
      ...(anteriorMemories.length > 0
        ? [
          {
            role: "system" as const,
            content: `【待办事项与记忆】\n${anteriorMemories.map((m: { content: string }) => `- ${m.content}`).join("\n")}`,
          },
        ]
        : []),
      {
        role: "user" as const,
        content: " proactively", // subtle trigger for the model
      },
    ];

    // 12. Call DeepSeek (non-streaming, max 200 tokens)
    const generatedText = await generateProactiveMessage(messages, 200);

    // Determine if anterior memories were the trigger
    const anteriorTriggered = anteriorMemories.length > 0;

    // 13. Save generated message to stm_messages as companion message
    if (generatedText.length > 0) {
      await saveMessage(supabase, {
        companion_id: companion.id,
        speaker: "companion",
        content: generatedText,
      });
    }

    // 14. Return JSON response
    const responseBody: ProactiveResponse = {
      message: generatedText,
      anteriorTriggered,
    };

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[proactive] Handler error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
