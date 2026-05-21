import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

export function getSupabaseClient(authHeader?: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const options: any = { auth: { persistSession: false } };
  if (authHeader) {
    options.global = { headers: { Authorization: authHeader } };
  }
  
  return createClient(supabaseUrl, serviceRoleKey, options);
}

export async function getUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user;
}

export async function checkEnergy(supabase: any, userId: string, cost: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('energy_accounts')
    .select('balance')
    .eq('user_id', userId)
    .single();
  if (error || !data) return false;
  return (data.balance || 0) >= cost;
}

export async function consumeEnergy(supabase: any, userId: string, cost: number, description: string): Promise<boolean> {
  const { data: account, error: fetchError } = await supabase
    .from('energy_accounts')
    .select('id, balance')
    .eq('user_id', userId)
    .single();
  if (fetchError || !account) return false;
  if (account.balance < cost) return false;

  const { error: updateError } = await supabase
    .from('energy_accounts')
    .update({ balance: account.balance - cost, updated_at: new Date().toISOString() })
    .eq('id', account.id);
  if (updateError) return false;

  const { error: txnError } = await supabase
    .from('energy_transactions')
    .insert({
      user_id: userId,
      txn_type: 'consume',
      amount: -cost,
      description,
      created_at: new Date().toISOString(),
    });
  if (txnError) {
    // Rollback
    await supabase.from('energy_accounts').update({ balance: account.balance }).eq('id', account.id);
    return false;
  }

  return true;
}

export async function getCompanionForUser(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('companions')
    .select('*, intimacy_records(*)')
    .eq('user_id', userId)
    .single();
  if (error || !data) throw new Error('No companion found');
  return data;
}

export async function getRecentMessages(supabase: any, companionId: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('stm_messages')
    .select('*')
    .eq('companion_id', companionId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).reverse();
}

export async function getLTMMemories(supabase: any, companionId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('ltm_memories')
    .select('*')
    .eq('companion_id', companionId)
    .order('importance', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function getMoodRecord(supabase: any, companionId: string) {
  const { data, error } = await supabase
    .from('mood_records')
    .select('*')
    .eq('companion_id', companionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

export async function getAnteriorMemories(supabase: any, companionId: string) {
  const { data, error } = await supabase
    .from('anterior_memories')
    .select('*')
    .eq('companion_id', companionId)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(5);
  if (error) return [];
  return data || [];
}
