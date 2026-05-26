-- proactive_schedule table: manages companion proactive message triggers
-- No frontend involvement — fully automated

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

-- Index for efficient scheduler query
CREATE INDEX IF NOT EXISTS idx_proactive_schedule_next_trigger
  ON proactive_schedule(next_trigger_at)
  WHERE is_triggered = false;

-- Enable RLS
ALTER TABLE proactive_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own schedule" ON proactive_schedule
  FOR SELECT USING (auth.uid() = user_id);

-- pg_cron: call proactive-scheduler every minute
-- Note: This requires pg_cron and pg_net extensions to be enabled

-- First, create the cron job
SELECT cron.schedule(
  'proactive-scheduler',
  '* * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/proactive-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;$$
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_proactive_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_proactive_schedule_updated_at ON proactive_schedule;
CREATE TRIGGER trigger_proactive_schedule_updated_at
  BEFORE UPDATE ON proactive_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_proactive_schedule_updated_at();
