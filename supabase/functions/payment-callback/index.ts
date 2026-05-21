// Supabase Edge Function: payment-callback
// Handles Zpay async payment webhook callbacks for Platonic AI

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { verifyZpayCallback, getZpayConfig } from "../_shared/zpay.ts";

// Zpay callback query parameters
interface ZpayCallbackParams {
  pid: string;
  trade_no: string;
  out_trade_no: string;
  type: string;
  name: string;
  money: string;
  trade_status: string;
  sign: string;
  [key: string]: string;
}

// Payment order record shape
interface PaymentOrder {
  id: string;
  user_id: string;
  plan_id: number;
  order_no: string;
  request_id: string;
  amount: number;
  energy_amount: number;
  bonus_amount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  payment_method: string;
  created_at: string;
}

/**
 * Safely updates order status and credits energy.
 * Uses RPC for atomic energy recharge when available, falls back to
 * manual upsert on the energy_accounts table.
 */
async function processPaymentSuccess(
  supabase: ReturnType<typeof getSupabaseClient>,
  order: PaymentOrder
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const totalEnergy = order.energy_amount + order.bonus_amount;

  try {
    // 1. Update order status to 'paid' (idempotent — only updates if still pending)
    const { error: updateError } = await supabase
      .from("payment_orders")
      .update({
        status: "paid",
        updated_at: now,
      })
      .eq("order_no", order.order_no)
      .eq("status", "pending"); // guard: only update from pending

    if (updateError) {
      console.error(`[${order.order_no}] Failed to update order status:`, updateError);
      return { success: false, error: "Failed to update order status" };
    }

    // 2. Add energy to user's account (atomic via RPC if available)
    try {
      const { error: rpcError } = await supabase.rpc("recharge_energy", {
        p_user_id: order.user_id,
        p_amount: totalEnergy,
        p_order_no: order.order_no,
      });

      if (rpcError) throw rpcError;

      console.log(
        `[${order.order_no}] Energy recharged via RPC for user ${order.user_id}: +${totalEnergy}`
      );
    } catch (rpcErr) {
      console.warn(`[${order.order_no}] RPC failed, falling back to manual upsert:`, rpcErr);

      // Fallback: manually upsert energy_accounts
      const { data: existingAccount } = await supabase
        .from("energy_accounts")
        .select("id, balance, total_earned")
        .eq("user_id", order.user_id)
        .single();

      if (existingAccount) {
        // Update existing account
        const { error: accountError } = await supabase
          .from("energy_accounts")
          .update({
            balance: existingAccount.balance + totalEnergy,
            total_earned: existingAccount.total_earned + totalEnergy,
            updated_at: now,
          })
          .eq("id", existingAccount.id);

        if (accountError) throw accountError;
      } else {
        // Create new energy account
        const { error: insertError } = await supabase.from("energy_accounts").insert({
          user_id: order.user_id,
          balance: totalEnergy,
          total_earned: totalEnergy,
          total_consumed: 0,
          updated_at: now,
        });

        if (insertError) throw insertError;
      }

      // Insert energy transaction record (fallback path)
      const { error: txnError } = await supabase.from("energy_transactions").insert({
        user_id: order.user_id,
        txn_type: "recharge",
        amount: totalEnergy,
        description: `Energy recharge via Zpay order ${order.order_no}`,
        created_at: now,
      });

      if (txnError) {
        console.error(`[${order.order_no}] Failed to insert energy transaction (fallback):`, txnError);
        // Non-fatal: account was updated
      }
    }

    // 3. Insert energy transaction record (main path — if RPC handles this internally, skip)
    // Only run if RPC didn't handle it (RPC name implies it does both account + transaction)
    // If your recharge_energy RPC does NOT insert energy_transactions, uncomment below:
    /*
    const { error: txnError } = await supabase.from("energy_transactions").insert({
      user_id: order.user_id,
      txn_type: "recharge",
      amount: totalEnergy,
      description: `Energy recharge via Zpay order ${order.order_no}`,
      created_at: now,
    });

    if (txnError) {
      console.error(`[${order.order_no}] Failed to insert energy transaction:`, txnError);
      // Non-fatal: don't fail the whole webhook
    }
    */

    console.log(
      `[${order.order_no}] Payment processed: user=${order.user_id}, energy=+${totalEnergy}, bonus=${order.bonus_amount}`
    );
    return { success: true };
  } catch (err) {
    console.error(`[${order.order_no}] Error in processPaymentSuccess:`, err);
    return { success: false, error: String(err) };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only accept GET (Zpay callbacks are typically GET with query params)
  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // 1. Extract all query parameters from the request URL
    const url = new URL(req.url);
    const params: Record<string, string> = {};

    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    console.log("[payment-callback] Received callback params:", params);

    // Validate required fields are present
    const requiredFields = ["pid", "trade_no", "out_trade_no", "type", "name", "money", "trade_status", "sign"];
    for (const field of requiredFields) {
      if (!params[field]) {
        console.warn(`[payment-callback] Missing required field: ${field}`);
        return new Response("Missing required field: " + field, {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    const callbackParams: ZpayCallbackParams = {
      pid: params.pid,
      trade_no: params.trade_no,
      out_trade_no: params.out_trade_no,
      type: params.type,
      name: params.name,
      money: params.money,
      trade_status: params.trade_status,
      sign: params.sign,
      ...params, // include any extra params for signature verification
    };

    // 2. Verify Zpay signature
    const zpayConfig = getZpayConfig();
    const isValid = verifyZpayCallback(callbackParams, zpayConfig.key);

    if (!isValid) {
      console.error("[payment-callback] Signature verification failed", {
        out_trade_no: callbackParams.out_trade_no,
        sign: callbackParams.sign,
      });
      return new Response("Signature verification failed", {
        status: 403,
        headers: corsHeaders,
      });
    }

    console.log(`[payment-callback] Signature verified for order: ${callbackParams.out_trade_no}`);

    // 3. Find the order by out_trade_no
    const supabase = getSupabaseClient(); // no auth header for server-to-server

    const { data: order, error: findError } = await supabase
      .from("payment_orders")
      .select("id, user_id, plan_id, order_no, request_id, amount, energy_amount, bonus_amount, status, payment_method, created_at")
      .eq("order_no", callbackParams.out_trade_no)
      .single();

    // 4. If order not found, return 200 (acknowledge but ignore)
    if (findError || !order) {
      console.warn(
        `[payment-callback] Order not found: ${callbackParams.out_trade_no}, ignoring.`
      );
      return new Response("success", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 5. If order already paid, return 200 (idempotent)
    if (order.status === "paid") {
      console.log(`[payment-callback] Order ${order.order_no} already paid, skipping.`);
      return new Response("success", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 6. If order is not in 'pending' status (failed/cancelled), log and return 200
    if (order.status !== "pending") {
      console.warn(
        `[payment-callback] Order ${order.order_no} status is '${order.status}', not processing.`
      );
      return new Response("success", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 7. Process based on trade_status
    if (callbackParams.trade_status === "TRADE_SUCCESS") {
      const result = await processPaymentSuccess(supabase, order as PaymentOrder);

      if (!result.success) {
        console.error(
          `[payment-callback] Failed to process payment for order ${order.order_no}: ${result.error}`
        );
        // Return 200 anyway so Zpay doesn't keep retrying
        // The issue should be investigated and resolved manually or by checking logs
        return new Response("success", {
          status: 200,
          headers: corsHeaders,
        });
      }

      console.log(`[payment-callback] Payment success processed for order: ${order.order_no}`);
      return new Response("success", {
        status: 200,
        headers: corsHeaders,
      });
    } else {
      // Non-success status: log and acknowledge
      console.log(
        `[payment-callback] Order ${order.order_no} trade_status='${callbackParams.trade_status}', not success.`
      );

      // Update order status to failed if applicable
      if (callbackParams.trade_status === "TRADE_CLOSED" || callbackParams.trade_status === "TRADE_FINISHED") {
        const { error: statusError } = await supabase
          .from("payment_orders")
          .update({
            status: callbackParams.trade_status === "TRADE_CLOSED" ? "cancelled" : "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("order_no", order.order_no);

        if (statusError) {
          console.error(`[payment-callback] Failed to update non-success status:`, statusError);
        }
      }

      return new Response("success", {
        status: 200,
        headers: corsHeaders,
      });
    }
  } catch (err) {
    console.error("[payment-callback] Unexpected error:", err);
    // Always return 200 to prevent Zpay from retrying on unhandled errors
    return new Response("success", {
      status: 200,
      headers: corsHeaders,
    });
  }
});
