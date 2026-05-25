-- ═══════════════════════════════════════════════════════════
-- Proactive 功能数据库设置
-- 请在 Supabase Dashboard → SQL Editor 中执行
-- ═══════════════════════════════════════════════════════════

-- 1. 创建 proactive_schedule 表（管理伴侣主动消息触发时间）
CREATE TABLE IF NOT EXISTS proactive_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  next_trigger_at timestamptz NOT NULL DEFAULT now(),
  last_user_message_at timestamptz,
  last_triggered_at timestamptz,
  is_triggered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, companion_id)
);

-- 2. 创建索引（加速调度器查询）
CREATE INDEX IF NOT EXISTS idx_proactive_schedule_trigger
  ON proactive_schedule(next_trigger_at)
  WHERE is_triggered = false;

-- 3. 创建 updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_proactive_schedule_updated_at()
RETURNS TRIGGER AS $$ BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_proactive_schedule_updated_at ON proactive_schedule;
CREATE TRIGGER trigger_proactive_schedule_updated_at
  BEFORE UPDATE ON proactive_schedule
  FOR EACH ROW EXECUTE FUNCTION update_proactive_schedule_updated_at();

-- 4. 启用 RLS
ALTER TABLE proactive_schedule ENABLE ROW LEVEL SECURITY;

-- 5. 删除旧的 cron 任务（如果存在）
SELECT cron.unschedule('proactive-scheduler') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'proactive-scheduler'
);

-- 6. 创建 pg_cron 定时任务（每分钟检查一次）
-- 注意：需要 pg_cron 和 pg_net 扩展已启用
DO $$
DECLARE
  supabase_url text := current_setting('app.settings.supabase_url', true);
  service_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  IF supabase_url IS NULL THEN
    RAISE NOTICE 'app.settings.supabase_url not set. Please set it in Supabase Dashboard > Settings > API.';
  END IF;

  PERFORM cron.schedule(
    'proactive-scheduler',
    '* * * * *',  -- 每分钟
    format($SQL$
      SELECT net.http_post(
        url := '%s/functions/v1/proactive-scheduler',
        headers := jsonb_build_object(
          'Authorization', 'Bearer %s',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $SQL$, supabase_url, service_key)
  );
END $$;

-- 如果上面的 DO 块因为权限问题失败，请用下面的替代方案：
-- （需要手动替换 YOUR_SUPABASE_URL 和 YOUR_SERVICE_ROLE_KEY）
-- SELECT cron.schedule(
--   'proactive-scheduler',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://iqylckwmmygqutycqmlb.supabase.co/functions/v1/proactive-scheduler',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );

-- 7. 验证 cron 任务是否创建成功
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'proactive-scheduler';
