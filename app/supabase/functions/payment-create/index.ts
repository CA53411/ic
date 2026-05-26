// Supabase Edge Function: payment-create
// Creates a Zpay payment order for Platonic AI

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseClient, getUser } from "../_shared/supabase.ts";
import {
  getZpayConfig,
  createZpayOrder,
  generateOutTradeNo,
} from "../_shared/zpay.ts";

interface PricingPlan {
  id: number;
  name: string;
  amount: number;
  energy: number;
  bonus: number;
}

interface CreatePaymentRequest {
  plan_id: string;
}

interface PaymentResponse {
  order_no: string;
  payment_url: string;
  amount: number;
  energy_amount: number;
  bonus_amount: number;
  expired_at: string;
}

// Pricing plans (mirrors DB table)
const PRICING_PLANS: PricingPlan[] = [
  { id: 1, name: "100",   amount: 1.00,   energy: 100,   bonus: 0 },
  { id: 2, name: "600",   amount: 5.00,   energy: 500,   bonus: 100 },
  { id: 3, name: "1500",  amount: 10.00,  energy: 1000,  bonus: 500 },
  { id: 4, name: "6000",  amount: 50.00,  energy: 5000,  bonus: 1000 },
  { id: 5, name: "13000", amount: 100.00, energy: 10000, bonus: 3000 },
  { id: 6, name: "38000", amount: 300.00, energy: 30000, bonus: 8000 },
];

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 2. Get authenticated user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient(authHeader);
    const user = await getUser(supabase);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse and validate request body
    let body: CreatePaymentRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan_id } = body;
    if (!plan_id) {
      return new Response(JSON.stringify({ error: "plan_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate plan_id exists
    const planIdNum = parseInt(plan_id, 10);
    if (isNaN(planIdNum)) {
      return new Response(JSON.stringify({ error: "Invalid plan_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plan from DB (fallback to hardcoded if needed)
    const { data: dbPlan, error: planError } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("id", planIdNum)
      .single();

    let plan: PricingPlan;

    if (planError || !dbPlan) {
      // Fallback: check hardcoded plans
      const fallbackPlan = PRICING_PLANS.find((p) => p.id === planIdNum);
      if (!fallbackPlan) {
        return new Response(JSON.stringify({ error: "Pricing plan not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      plan = fallbackPlan;
    } else {
      plan = {
        id: dbPlan.id,
        name: dbPlan.name,
        amount: parseFloat(dbPlan.amount),
        energy: dbPlan.energy,
        bonus: dbPlan.bonus,
      };
    }

    // 4. Generate unique order number
    const orderNo = generateOutTradeNo();

    // 5. Generate request ID
    const requestId = crypto.randomUUID();

    // 6. Calculate energy amounts
    const energyAmount = plan.energy;
    const bonusAmount = plan.bonus;

    // 7. Calculate expiration (30 minutes from now)
    const now = new Date();
    const expiredAt = new Date(now.getTime() + 30 * 60 * 1000);

    // Generate idempotency key
    const idempotencyKey = `${user.id}_${planIdNum}_${now.toISOString().split("T")[0]}_${crypto.randomUUID().slice(0, 8)}`;

    // Insert payment order into DB
    const { error: insertError } = await supabase.from("payment_orders").insert({
      user_id: user.id,
      plan_id: planIdNum,
      order_no: orderNo,
      request_id: requestId,
      idempotency_key: idempotencyKey,
      amount: plan.amount,
      energy_amount: energyAmount,
      bonus_amount: bonusAmount,
      status: "pending",
      payment_method: "zpay",
      expired_at: expiredAt.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    if (insertError) {
      console.error("Failed to insert payment order:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create payment order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Build Zpay order URL
    const zpayConfig = getZpayConfig();
    const paymentUrl = await createZpayOrder({
      outTradeNo: orderNo,
      totalAmount: plan.amount.toFixed(2),
      subject: `Platonic AI Energy - ${plan.name}`,
      body: `Recharge ${plan.energy} energy` + (plan.bonus > 0 ? ` + ${plan.bonus} bonus` : ""),
      notifyUrl: `${zpayConfig.notifyBaseUrl}/payment-callback`,
      returnUrl: zpayConfig.returnUrl,
      requestId: requestId,
    });

    // Update order with payment URL
    const { error: updateError } = await supabase
      .from("payment_orders")
      .update({
        payment_url: paymentUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("order_no", orderNo);

    if (updateError) {
      console.error("Failed to update payment URL:", updateError);
      // Non-fatal: return payment URL anyway
    }

    // 9. Return payment info
    const response: PaymentResponse = {
      order_no: orderNo,
      payment_url: paymentUrl,
      amount: plan.amount,
      energy_amount: energyAmount,
      bonus_amount: bonusAmount,
      expired_at: expiredAt.toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unexpected error in payment-create:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
