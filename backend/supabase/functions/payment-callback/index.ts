/**
 * payment-callback Edge Function — Zpay async webhook
 * No auth required (called by Zpay server)
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import CryptoJS from 'npm:crypto-js@4.2.0';

function getSupabase() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

function md5Sign(params: URLSearchParams, key: string): string {
  const sorted: string[] = [];
  for (const [k, v] of params.entries()) {
    if (k !== 'sign' && k !== 'sign_type' && v !== '') sorted.push(`${k}=${v}`);
  }
  sorted.sort();
  return CryptoJS.MD5(sorted.join('&') + key).toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const outTradeNo = params.get('out_trade_no') || '';
    const tradeStatus = params.get('trade_status') || '';
    const money = params.get('money') || '0';

    console.log('[PaymentCallback] Received:', { out_trade_no: outTradeNo, trade_status: tradeStatus, money });

    if (!outTradeNo) return new Response('success', { headers: corsHeaders });

    const supabase = getSupabase();
    const key = Deno.env.get('ZPAY_KEY') || '';

    // Verify signature
    const mySign = md5Sign(params, key);
    const theirSign = params.get('sign') || '';
    console.log('[PaymentCallback] Sign compare:', { mine: mySign, theirs: theirSign, match: mySign === theirSign });

    if (mySign !== theirSign) {
      console.error('[PaymentCallback] Zpay signature mismatch');
      return new Response('sign_error', { status: 403, headers: corsHeaders });
    }

    // Find order by order_no
    const { data: order, error: orderErr } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_no', outTradeNo)
      .single();

    if (orderErr) {
      console.error('[PaymentCallback] Order not found:', orderErr.message);
      return new Response('success', { headers: corsHeaders });
    }
    if (!order) {
      console.log('[PaymentCallback] No order found for:', outTradeNo);
      return new Response('success', { headers: corsHeaders });
    }

    console.log('[PaymentCallback] Found order:', { id: order.id, user_id: order.user_id, energy: order.energy_amount, status: order.status });

    if (order.status === 'paid' || order.status === 'completed') {
      console.log('[PaymentCallback] Already paid, skip');
      return new Response('success', { headers: corsHeaders });
    }

    if (tradeStatus === 'TRADE_SUCCESS') {
      console.log('[PaymentCallback] Processing TRADE_SUCCESS for order:', order.id);

      // Update order status only — trigger trg_payment_orders_status handles energy recharge automatically
      const { error: updErr } = await supabase
        .from('payment_orders')
        .update({ status: 'paid', paid_cents: Math.round(parseFloat(money) * 100), updated_at: new Date().toISOString() })
        .eq('id', order.id);
      console.log('[PaymentCallback] Order update:', updErr ? 'ERROR: ' + updErr.message : 'OK');
    } else {
      console.log('[PaymentCallback] Trade status not success:', tradeStatus);
    }

    return new Response('success', { headers: corsHeaders });

  } catch (e: any) {
    console.error('[PaymentCallback] Error:', e.message || String(e));
    return new Response('error', { status: 500, headers: corsHeaders });
  }
});
