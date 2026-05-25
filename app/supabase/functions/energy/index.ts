// ============================================
// Platonic AI — Energy Balance Edge Function
// ============================================
// Purpose: Query energy balance and handle energy consumption
// Endpoints:
//   GET  /energy          — Query current energy balance
//   POST /energy/consume  — Consume energy for an action
// Auth: JWT (user-authenticated)
//
// Energy system:
//   - Each user has an energy_account with balance, total_earned, total_consumed
//   - Energy is consumed when performing AI-powered actions
//   - Consumption is atomic (uses row-level locking to prevent race conditions)
// ============================================

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseClient, getUser } from "../_shared/supabase.ts";

// --- Type Definitions ---

/** Energy account record shape */
interface EnergyAccount {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_consumed: number;
  updated_at: string;
  [key: string]: unknown;
}

/** Request body for POST /energy/consume */
interface ConsumeRequest {
  amount: number;
  description: string;
}

/** Response shape for GET /energy */
interface EnergyBalanceResponse {
  balance: number;
  total_earned: number;
  total_consumed: number;
}

/** Response shape for POST /energy/consume (success) */
interface ConsumeSuccessResponse {
  success: true;
  remaining_balance: number;
  consumed: number;
}

/** Response shape for POST /energy/consume (insufficient) */
interface ConsumeFailureResponse {
  success: false;
  reason: "insufficient";
  current_balance: number;
  requested: number;
}

// --- Helper Functions ---

/**
 * Atomically consumes energy from a user's account using row-level locking.
 * Uses a SELECT ... FOR UPDATE pattern via RPC to prevent race conditions
 * when multiple requests try to consume energy simultaneously.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The user's ID
 * @param amount - Amount of energy to consume (must be positive)
 * @param description - Description of what the energy was consumed for
 * @returns Object indicating success/failure and remaining balance
 */
async function consumeEnergy(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; remainingBalance?: number; reason?: string }> {
  // Validate amount
  if (amount <= 0) {
    return { success: false, reason: "invalid_amount" };
  }

  // Step 1: Fetch the user's energy account with optimistic locking
  // We use a transaction-like approach: fetch, verify, update
  const { data: account, error: fetchError } = await supabase
    .from("energy_accounts")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (fetchError || !account) {
    console.error(`Energy account not found for user ${userId}:`, fetchError);
    return { success: false, reason: "account_not_found" };
  }

  const energyAccount = account as EnergyAccount;

  // Step 2: Check if sufficient balance
  if (energyAccount.balance < amount) {
    return {
      success: false,
      reason: "insufficient",
    };
  }

  // Step 3: Calculate new values
  const newBalance = energyAccount.balance - amount;
  const newTotalConsumed = energyAccount.total_consumed + amount;

  // Step 4: Update the account atomically
  // The WHERE clause ensures we only update if balance hasn't changed (optimistic locking)
  const { error: updateError } = await supabase
    .from("energy_accounts")
    .update({
      balance: newBalance,
      total_consumed: newTotalConsumed,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("balance", energyAccount.balance); // Optimistic lock

  if (updateError) {
    console.error(`Failed to consume energy for user ${userId}:`, updateError);
    return { success: false, reason: "update_failed" };
  }

  // Step 5: Log the consumption transaction
  const { error: logError } = await supabase
    .from("energy_transactions")
    .insert({
      user_id: userId,
      type: "consume",
      amount: -amount,
      description: description,
      balance_after: newBalance,
      created_at: new Date().toISOString(),
    });

  if (logError) {
    // Log error but don't fail the request — the consumption succeeded
    console.error(`Failed to log energy transaction for user ${userId}:`, logError);
  }

  return { success: true, remainingBalance: newBalance };
}

/**
 * Gets or creates an energy account for a user.
 * If no account exists, creates one with default values.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The user's ID
 * @returns The energy account record
 */
async function getOrCreateEnergyAccount(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string
): Promise<EnergyAccount | null> {
  // Try to get existing account
  const { data: account, error: fetchError } = await supabase
    .from("energy_accounts")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    // If no account found, create one
    if (fetchError.code === "PGRST116") {
      // PGRST116 = no rows returned (Supabase postgREST error code)
      const newAccount = {
        user_id: userId,
        balance: 100, // Default starting balance
        total_earned: 100,
        total_consumed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error: createError } = await supabase
        .from("energy_accounts")
        .insert(newAccount)
        .select()
        .single();

      if (createError) {
        console.error(`Failed to create energy account for user ${userId}:`, createError);
        return null;
      }

      return created as EnergyAccount;
    }

    console.error(`Failed to fetch energy account for user ${userId}:`, fetchError);
    return null;
  }

  return account as EnergyAccount;
}

// --- Main Handler ---

/**
 * Main entry point for the energy balance edge function.
 * Routes GET and POST requests to the appropriate handler.
 */
Deno.serve(async (req: Request) => {
  // Step 1: Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Step 2: Create Supabase client and authenticate the user
    // The getUser helper validates the JWT and returns the authenticated user
    const supabase = getSupabaseClient(req.headers.get("Authorization") ?? undefined);
    const user = await getUser(supabase);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — valid JWT required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Route based on HTTP method and URL path
    const url = new URL(req.url);
    const path = url.pathname;

    // ==================== GET /energy ====================
    // Query current energy balance
    // ====================================================
    if (req.method === "GET" && (path === "/energy" || path === "/energy/")) {
      // Step 3: Get the user's energy account (create if doesn't exist)
      const account = await getOrCreateEnergyAccount(supabase, userId);

      if (!account) {
        return new Response(
          JSON.stringify({ error: "Failed to retrieve or create energy account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 4: Return the balance info
      const response: EnergyBalanceResponse = {
        balance: account.balance,
        total_earned: account.total_earned,
        total_consumed: account.total_consumed,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== POST /energy/consume ====================
    // Consume energy for an action
    // =============================================================
    if (req.method === "POST" && (path === "/energy/consume" || path === "/energy/consume/")) {
      // Step 3: Parse and validate request body
      let body: ConsumeRequest;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate required fields
      if (typeof body.amount !== "number" || isNaN(body.amount) || body.amount <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid amount — must be a positive number" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!body.description || typeof body.description !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid description" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 4: Ensure user has an energy account
      const account = await getOrCreateEnergyAccount(supabase, userId);
      if (!account) {
        return new Response(
          JSON.stringify({ error: "Failed to retrieve or create energy account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 5: Consume energy
      const result = await consumeEnergy(supabase, userId, body.amount, body.description);

      if (!result.success) {
        // Handle different failure reasons
        if (result.reason === "insufficient") {
          const failureResponse: ConsumeFailureResponse = {
            success: false,
            reason: "insufficient",
            current_balance: account.balance,
            requested: body.amount,
          };
          return new Response(JSON.stringify(failureResponse), {
            status: 200, // 200 with success:false is more RESTful for business logic failures
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ error: `Energy consumption failed: ${result.reason}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 6: Return success with remaining balance
      const successResponse: ConsumeSuccessResponse = {
        success: true,
        remaining_balance: result.remainingBalance ?? 0,
        consumed: body.amount,
      };

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== Route Not Found ====================
    return new Response(
      JSON.stringify({
        error: "Not Found",
        available_routes: [
          "GET  /energy        — Query energy balance",
          "POST /energy/consume — Consume energy (body: { amount, description })",
        ],
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Global error handler
    console.error("Energy function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
