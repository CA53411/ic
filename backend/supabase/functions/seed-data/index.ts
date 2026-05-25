import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'full';
    const results: string[] = [];

    // Use a fixed UUID for test user
    const userId = body.user_id || '11111111-1111-1111-1111-111111111111';

    // 1. Insert into auth.users via raw sql
    const { error: authErr } = await supabase.rpc('create_test_account', {
      p_id: userId,
      p_email: 'test@platonic.ai',
    });
    if (authErr) {
      results.push(`Auth user note: ${authErr.message} (may already exist)`);
    } else {
      results.push(`Auth user created/updated: ${userId}`);
    }

    // 2. Create energy account (conditionally - skip if table does not exist)
    if (action === 'full' || action === 'energy') {
      try {
        const { error: eErr } = await supabase.from('energy_accounts').upsert({
          user_id: userId,
          balance: 10000,
          total_earned: 10000,
          total_consumed: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        results.push(eErr ? `Energy error: ${eErr.message}` : 'Energy account: 10,000');
      } catch (e: any) {
        results.push(`Energy account skipped: table may not exist (${e.message})`);
      }
    }

    // 3. Create test companion
    let companionId: string | undefined;
    if (action === 'full' || action === 'companion') {
      // First check if companion exists
      const { data: existing } = await supabase.from('companions').select('id').eq('user_id', userId).maybeSingle();
      if (existing) {
        companionId = existing.id;
        results.push(`Companion already exists: ${companionId?.slice(0,8)}`);
      } else {
        const { data: comp, error: cErr } = await supabase.from('companions').insert({
          user_id: userId,
          nickname: '小樱',
          gender: 'female',
          age: 18,
          personality_prompt: '你是一位温柔、体贴的AI伴侣。你说话柔和，善于倾听，总是给予对方温暖和支持。你喜欢阅读和绘画，相信每一个相遇都是命运的安排。',
          background: '来自樱花之国的温柔少女，喜欢阅读和绘画，总是带着温暖的微笑。她相信每一个相遇都是命运的安排。',
          avatar_url: '/companion-1.jpg',
          bf_openness: 75,
          bf_conscientiousness: 60,
          bf_extraversion: 45,
          bf_agreeableness: 80,
          bf_neuroticism: 30,
          bio: '每一个相遇都是命运的安排～',
        }).select().maybeSingle();
        companionId = comp?.id;
        results.push(cErr ? `Companion error: ${cErr.message}` : `Companion created: 小樱 (${companionId?.slice(0,8)})`);
      }
    }

    // 4. Create intimacy and mood
    if (companionId && (action === 'full' || action === 'companion')) {
      const { error: iErr } = await supabase.from('intimacy_records').upsert({
        companion_id: companionId,
        user_id: userId,
        score: 53,
        milestone_stage: 3,
      }, { onConflict: 'companion_id' });
      results.push(iErr ? `Intimacy error: ${iErr.message}` : 'Intimacy: 53 (stage 3 - 暗生情愫)');

      const { error: mErr } = await supabase.from('mood_records').upsert({
        companion_id: companionId,
        pleasure: 0.3,
        arousal: 0.2,
        dominance: 0.1,
        valence: 0.3,
      }, { onConflict: 'companion_id' });
      results.push(mErr ? `Mood error: ${mErr.message}` : 'Mood record created');

      // 5. Create test messages
      if (action === 'full' || action === 'messages') {
        const testMessages = [
          { speaker: 'companion', content: '你好呀！我是小樱，很高兴认识你～', emotion_label: 'happy' },
          { speaker: 'user', content: '你好小樱！很高兴认识你', emotion_label: null },
          { speaker: 'companion', content: '今天过得怎么样？有什么想和我分享的吗？', emotion_label: 'curious' },
          { speaker: 'user', content: '今天工作有点累，但是看到你心情好多了', emotion_label: null },
          { speaker: 'companion', content: '辛苦啦～要不要我给你讲个故事放松一下？', emotion_label: 'caring' },
          { speaker: 'user', content: '好啊，什么故事？', emotion_label: null },
          { speaker: 'companion', content: '从前有一只小狐狸，它最喜欢在月光下散步...', emotion_label: 'peaceful' },
          { speaker: 'user', content: '好治愈的故事，谢谢你小樱！', emotion_label: null },
          { speaker: 'companion', content: '不用谢～能给你带来温暖我很开心。以后每天我都会在这里陪你哦。', emotion_label: 'loving' },
        ];

        // Delete old messages first
        await supabase.from('stm_messages').delete().eq('companion_id', companionId);

        for (let i = 0; i < testMessages.length; i++) {
          const msg = testMessages[i];
          const time = new Date(Date.now() - (testMessages.length - i) * 60000).toISOString();
          await supabase.from('stm_messages').insert({
            user_id: userId,
            companion_id: companionId,
            speaker: msg.speaker,
            content: msg.content,
            emotion_label: msg.emotion_label,
            tokens_used: 0,
            created_at: time,
          });
        }
        results.push(`Messages: ${testMessages.length} test messages created`);
      }
    }

    // 6. Upsert profile (conditionally - skip if table does not exist)
    if (action === 'full' || action === 'profile') {
      try {
        const { error: pErr } = await supabase.from('profiles').upsert({
          id: userId,
          email: 'test@platonic.ai',
          status: 'HAS_COMPANION',
          language: 'zh',
        }, { onConflict: 'id' });
        results.push(pErr ? `Profile error: ${pErr.message}` : 'Profile updated');
      } catch (e: any) {
        results.push(`Profile upsert skipped: table may not exist (${e.message})`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      companion_id: companionId,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
