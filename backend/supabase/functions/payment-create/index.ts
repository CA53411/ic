/**
 * payment-create Edge Function — Zpay payment order
 * Self-contained
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import CryptoJS from 'npm:crypto-js@4.2.0';

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getZpayConfig() {
  return { pid: Deno.env.get('ZPAY_PID')!, key: Deno.env.get('ZPAY_KEY')! };
}

function md5Sign(params: Record<string, string>, key: string): string {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return CryptoJS.MD5(sorted + key).toString();
}

function generateOrderNo(): string {
  return `PLATONIC_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Unauthorized');

    const body = await req.json().catch(() => ({}));
    const planId = body.plan_id;

    const { data: plan, error: planErr } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planErr || !plan) throw new Error('Invalid plan');

    const priceCents = plan.price_cents || 0;
    const amount = (priceCents / 100).toFixed(2);
    const totalEnergy = (plan.energy_amount || 0) + (plan.bonus_amount || 0);
    const planName = plan.name || 'Energy Pack';

    const { pid, key } = getZpayConfig();
    const orderNo = generateOrderNo();
    const callbackUrl = `https://iqylckwmmygqutycqmlb.supabase.co/functions/v1/payment-callback`;

    await supabase.from('payment_orders').insert({
      user_id: user.id,
      order_no: orderNo,
      request_id: crypto.randomUUID(),
      idempotency_key: crypto.randomUUID(),
      amount_cents: priceCents,
      paid_cents: 0,
      energy_amount: totalEnergy,
      currency: 'CNY',
      status: 'pending',
      payment_method: 'alipay',
      version: 1,
      expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    const params: Record<string, string> = {
      pid,
      type: 'alipay',
      out_trade_no: orderNo,
      notify_url: callbackUrl,
      return_url: 'https://platonic.corolas.top/#/payment?success=1',
      name: planName,
      money: amount,
      clientip: '127.0.0.1',
      device: 'pc',
    };
    const sign = md5Sign(params, key);

    const query = new URLSearchParams({ ...params, sign, sign_type: 'MD5' });
    const paymentUrl = `https://zpayz.cn/submit.php?${query.toString()}`;

    return new Response(JSON.stringify({
      order_no: orderNo,
      payment_url: paymentUrl,
      amount,
      energy_amount: totalEnergy,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
