/**
 * achievement-check Edge Function — Achievement detection engine
 * Checks user actions against achievement definitions and unlocks achievements.
 * Called by chat-stream, milestone-adjust, and other functions.
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface AchievementDef {
  id: string;
  name: string;
  trigger_type: string;
  trigger_target: string;
  trigger_value: number;
  reward_type: string | null;
  reward_amount: number | null;
}

// ── Check and unlock achievements ──
async function checkAchievements(
  supabase: any,
  userId: string,
  eventType: string,
  eventTarget: string,
  eventValue: number = 1,
): Promise<{ unlocked: string[]; errors: string[] }> {
  const unlocked: string[] = [];
  const errors: string[] = [];

  // Get all active achievement definitions matching this event
  const { data: defs, error: defErr } = await supabase
    .from('achievement_definitions')
    .select('id, name, trigger_type, trigger_target, trigger_value, reward_type, reward_amount')
    .eq('is_active', true);

  if (defErr || !defs) {
    return { unlocked: [], errors: [defErr?.message || 'No definitions'] };
  }

  // Filter matching definitions
  const matching = defs.filter((d: AchievementDef) => {
    if (d.trigger_type === 'one_time' && d.trigger_target === eventTarget) return true;
    if (d.trigger_type === 'cumulative' && d.trigger_target === eventTarget) return true;
    if (d.trigger_type === 'threshold' && d.trigger_target === eventTarget && eventValue >= d.trigger_value) return true;
    return false;
  });

  for (const def of matching) {
    try {
      // Check if already unlocked
      const { data: existing } = await supabase
        .from('achievement_progress')
        .select('id, current_value, is_unlocked')
        .eq('user_id', userId)
        .eq('achievement_id', def.id)
        .maybeSingle();

      if (existing?.is_unlocked) continue; // Already unlocked

      const newValue = (existing?.current_value || 0) + eventValue;
      const shouldUnlock =
        def.trigger_type === 'one_time' ||
        def.trigger_type === 'threshold' && newValue >= def.trigger_value ||
        def.trigger_type === 'cumulative' && newValue >= def.trigger_value;

      if (shouldUnlock) {
        // Upsert progress with unlock
        await supabase.from('achievement_progress').upsert({
          user_id: userId,
          achievement_id: def.id,
          current_value: newValue,
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
        }, { onConflict: 'user_id,achievement_id' });

        unlocked.push(def.name);
        console.log(`[Achievement] Unlocked: ${def.name} for user ${userId.substring(0, 8)}`);
      } else {
        // Just update progress
        await supabase.from('achievement_progress').upsert({
          user_id: userId,
          achievement_id: def.id,
          current_value: newValue,
        }, { onConflict: 'user_id,achievement_id' });
      }
    } catch (e: any) {
      errors.push(`${def.name}: ${e.message}`);
    }
  }

  return { unlocked, errors };
}

// ── Main ──
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    // Auth
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) throw new Error('Unauthorized');

    const supabase = getSupabase();
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Unauthorized: ' + (userErr?.message || 'invalid token'));

    const body = await req.json().catch(() => ({}));
    const eventType = body.event_type || 'chat';
    const eventTarget = body.event_target || 'send_message';
    const eventValue = body.event_value || 1;

    const result = await checkAchievements(supabase, user.id, eventType, eventTarget, eventValue);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
