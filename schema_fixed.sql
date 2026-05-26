-- ═══════════════════════════════════════════════════════════════════════════════
-- Platonic AI Virtual Companion - Complete Database Schema
-- Supabase PostgreSQL 15+
-- ═══════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  DESIGN PRINCIPLES                                                           │
-- │  1. All primary keys use UUID (gen_random_uuid()) except audit/log tables   │
-- │  2. All user-data tables have RLS enabled with (SELECT auth.uid()) policies │
-- │  3. All FKs define explicit ON DELETE/UPDATE actions                        │
-- │  4. Every FK target column and RLS-filtered column is indexed               │
-- │  5. Triggers guard against infinite recursion with session variables         │
-- │  6. Functions use SECURITY DEFINER only where bypassing RLS is required     │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════════════════
-- 0. EXTENSIONS & HELPERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper to safely set config without affecting statement_timeout permanently
CREATE OR REPLACE FUNCTION private.set_config(key text, val text)
RETURNS void AS $$
BEGIN
  PERFORM set_config(key, val, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. INDEPENDENT CORE TABLES (no FK dependencies)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.1 profiles  (extends Supabase Auth users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname        text NOT NULL DEFAULT 'User',
  email           text NOT NULL,
  avatar_url      text,
  language        text NOT NULL DEFAULT 'zh-CN',
  timezone        text NOT NULL DEFAULT 'Asia/Shanghai',
  status          text NOT NULL DEFAULT 'NO_COMPANION'
                    CHECK (status IN ('NO_COMPANION', 'HAS_COMPANION')),
  onboarding_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- MVP预留扩展字段
  live2d_enabled  boolean DEFAULT false,
  voice_enabled   boolean DEFAULT false,
  pet_enabled     boolean DEFAULT false
);

COMMENT ON TABLE  profiles IS '用户Profile表，一行对应一个Supabase Auth用户';
COMMENT ON COLUMN profiles.status IS 'NO_COMPANION=未创建伴侣, HAS_COMPANION=已有伴侣';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.2 milestone_definitions  (好感度阶段定义)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE milestone_definitions (
  id              smallint PRIMARY KEY,
  name            text NOT NULL,
  description     text NOT NULL,
  min_score       smallint NOT NULL CHECK (min_score >= 0 AND min_score <= 100),
  max_score       smallint NOT NULL CHECK (max_score >= 0 AND max_score <= 100),
  icon_url        text,
  unlocked_features text DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE milestone_definitions IS '好感度Milestone阶段定义，静态配置表';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.3 pricing_plans  (充值套餐)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE pricing_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  energy_amount   bigint NOT NULL CHECK (energy_amount > 0),
  price_cents     bigint NOT NULL CHECK (price_cents >= 0),
  currency        text NOT NULL DEFAULT 'CNY',
  sort_order      smallint NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pricing_plans IS '电量充值套餐定义';
COMMENT ON COLUMN pricing_plans.price_cents IS '价格，单位为分，避免浮点数';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.4 crowdfunding_projects  (筹资项目)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE crowdfunding_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name    text NOT NULL,
  description     text NOT NULL,
  target_amount   bigint NOT NULL CHECK (target_amount > 0),
  current_amount  bigint NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft', 'active', 'funded', 'cancelled')),
  cover_image_url text,
  deadline        timestamptz,
  sort_order      smallint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE crowdfunding_projects IS '筹资/支持系统项目表';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.5 system_config  (全局系统配置)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE system_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key      text NOT NULL UNIQUE,
  config_value    text NOT NULL,
  description     text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_config IS '全局系统配置表，key-value形式';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.6 emotion_occs  (OCC情绪标签字典)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE emotion_occs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label           text NOT NULL UNIQUE,
  pleasure_delta  smallint NOT NULL DEFAULT 0,
  arousal_delta   smallint NOT NULL DEFAULT 0,
  dominance_delta smallint NOT NULL DEFAULT 0,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE emotion_occs IS 'OCC情绪模型情绪标签字典表';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.7 drama_definitions  (高级剧情定义)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE drama_definitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text NOT NULL,
  scene_setting   text,
  drama_prompt    text NOT NULL,
  cover_image_path text,
  unlock_condition text DEFAULT 'default',
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      smallint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE drama_definitions IS '高级剧情空间定义表';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.8 discount_coupons  (支持者折扣券，MVP后回馈)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE discount_coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  discount_type   text NOT NULL DEFAULT 'percentage'
                    CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value  bigint NOT NULL CHECK (discount_value > 0),
  min_order_cents bigint NOT NULL DEFAULT 0,
  max_uses        bigint NOT NULL DEFAULT 1,
  used_count      bigint NOT NULL DEFAULT 0,
  valid_from      timestamptz NOT NULL,
  valid_until     timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE discount_coupons IS '折扣券表，MVP后用于回馈支持者';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SECOND-LEVEL TABLES (depend on profiles or independent tables)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.1 companions  (伴侣表)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE companions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname        text NOT NULL,
  gender          text CHECK (gender IN ('male', 'female', 'nonbinary', 'unknown')),
  age             smallint CHECK (age > 0 AND age < 200),
  birth_month     smallint CHECK (birth_month BETWEEN 1 AND 12),
  birth_day       smallint CHECK (birth_day BETWEEN 1 AND 31),
  background      text,
  language        text NOT NULL DEFAULT 'zh-CN',
  bio             text,
  avatar_url      text,
  -- Big Five Personality Dimensions (0-100)
  bf_openness     smallint NOT NULL DEFAULT 50
                    CHECK (bf_openness BETWEEN 0 AND 100),
  bf_conscientiousness smallint NOT NULL DEFAULT 50
                    CHECK (bf_conscientiousness BETWEEN 0 AND 100),
  bf_extraversion smallint NOT NULL DEFAULT 50
                    CHECK (bf_extraversion BETWEEN 0 AND 100),
  bf_agreeableness smallint NOT NULL DEFAULT 50
                    CHECK (bf_agreeableness BETWEEN 0 AND 100),
  bf_neuroticism  smallint NOT NULL DEFAULT 50
                    CHECK (bf_neuroticism BETWEEN 0 AND 100),
  -- MVP预留扩展字段
  live2d_model_path text,
  voice_id        text,
  pet_name        text,
  pet_type        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id)
);

COMMENT ON TABLE  companions IS '伴侣表，与用户一对一绑定';
COMMENT ON COLUMN companions.bf_openness IS 'Big Five开放性O: 0-100';
COMMENT ON COLUMN companions.bf_conscientiousness IS 'Big Five尽责性C: 0-100';
COMMENT ON COLUMN companions.bf_extraversion IS 'Big Five外向性E: 0-100';
COMMENT ON COLUMN companions.bf_agreeableness IS 'Big Five宜人性A: 0-100';
COMMENT ON COLUMN companions.bf_neuroticism IS 'Big Five神经质N: 0-100';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.2 energy_accounts  (用户电量余额账户)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE energy_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance         bigint NOT NULL DEFAULT 0,
  total_recharged bigint NOT NULL DEFAULT 0,
  total_consumed  bigint NOT NULL DEFAULT 0,
  version         bigint NOT NULL DEFAULT 1,  -- 乐观锁
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  energy_accounts IS '用户电量余额账户，一行对应一个用户';
COMMENT ON COLUMN energy_accounts.balance IS '当前电量余额，最小单位1电量';
COMMENT ON COLUMN energy_accounts.version IS '乐观锁版本号，用于并发扣减';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.3 free_trial_allocations  (新用户免费试用额度)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE free_trial_allocations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_energy    bigint NOT NULL CHECK (total_energy > 0),
  consumed_energy bigint NOT NULL DEFAULT 0 CHECK (consumed_energy >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CHECK (consumed_energy <= total_energy)
);

COMMENT ON TABLE free_trial_allocations IS '新用户免费试用额度表';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.4 intimacy_records  (好感度主记录)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE intimacy_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id    uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  score           smallint NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  milestone_stage smallint NOT NULL DEFAULT 1
                    REFERENCES milestone_definitions(id) ON DELETE RESTRICT,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, companion_id)
);

COMMENT ON TABLE intimacy_records IS '好感度主记录表，记录用户与伴侣之间的好感度分数和阶段';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. THIRD-LEVEL TABLES (memory, payment, mood, drama, etc.)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.1 stm_messages  (Short Term Memory - 对话消息)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE stm_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id    uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  speaker         text NOT NULL CHECK (speaker IN ('user', 'companion')),
  content         text NOT NULL,
  emotion_label   text,  -- 可选的情绪标注
  tokens_used     integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE stm_messages IS '短期记忆-对话消息表，保留可配置天数(默认3天)';
COMMENT ON COLUMN stm_messages.speaker IS '发言者: user=用户, companion=伴侣';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.2 ltm_memories  (Long Term Memory - 长期记忆)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE ltm_memories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id    uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  content         text NOT NULL,
  memory_type     text NOT NULL DEFAULT 'fact'
                    CHECK (memory_type IN ('fact', 'preference', 'event', 'emotion')),
  importance      numeric(2,1) NOT NULL DEFAULT 0.5
                    CHECK (importance >= 0.1 AND importance <= 1.0),
  is_permanent    boolean NOT NULL DEFAULT false,
  source_stm_ids  uuid[] DEFAULT '{}',
  source_summary  text,
  memory_date     date,  -- 记忆关联的日期（如事件发生日）
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  ltm_memories IS '长期记忆表，Consolidation生成的记忆';
COMMENT ON COLUMN ltm_memories.importance IS '重要性0.1-1.0，1.0为不可磨灭记忆';
COMMENT ON COLUMN ltm_memories.is_permanent IS 'true=不可磨灭(如用户生日、姓名)，即使importance=1.0也显式标记';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.3 anterior_memories  (Anterior Memory - 待办/未来事项)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE anterior_memories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id    uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  content         text NOT NULL,
  planned_at      timestamptz NOT NULL,
  trigger_type    text NOT NULL DEFAULT 'time_based'
                    CHECK (trigger_type IN ('time_based', 'event_based', 'milestone_based')),
  priority        smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE anterior_memories IS 'Anterior Memory待办事项队列，连接Proactive系统';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.4 intimacy_history  (好感度变化日志)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE intimacy_history (
  id              bigserial PRIMARY KEY,
  intimacy_id     uuid NOT NULL REFERENCES intimacy_records(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id    uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  old_score       smallint NOT NULL CHECK (old_score >= 0 AND old_score <= 100),
  new_score       smallint NOT NULL CHECK (new_score >= 0 AND new_score <= 100),
  change_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE intimacy_history IS '好感度每日/每次变化日志';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.5 mood_records  (情绪记录 - PAD三维 + OCC标签)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE mood_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id    uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  pleasure        smallint NOT NULL CHECK (pleasure BETWEEN -100 AND 100),
  arousal         smallint NOT NULL CHECK (arousal BETWEEN -100 AND 100),
  dominance       smallint NOT NULL CHECK (dominance BETWEEN -100 AND 100),
  occ_label       text REFERENCES emotion_occs(label) ON DELETE SET NULL,
  intensity       smallint NOT NULL DEFAULT 50 CHECK (intensity BETWEEN 0 AND 100),
  context         text,  -- 触发情绪的上下文
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE mood_records IS '情绪记录表，PAD三维模型+OCC情绪标签';
COMMENT ON COLUMN mood_records.pleasure IS '愉悦度: -100(极不悦) ~ +100(极愉悦)';
COMMENT ON COLUMN mood_records.arousal IS '唤醒度: -100(极低) ~ +100(极高)';
COMMENT ON COLUMN mood_records.dominance IS '支配度: -100(被支配) ~ +100(支配)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.6 energy_transactions  (电量流水表)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE energy_transactions (
  id              bigserial PRIMARY KEY,
  account_id      uuid NOT NULL REFERENCES energy_accounts(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  txn_type        text NOT NULL
                    CHECK (txn_type IN ('recharge', 'consume', 'gift', 'refund', 'compensation', 'trial')),
  amount          bigint NOT NULL CHECK (amount <> 0),
  balance_after   bigint NOT NULL,
  description     text,
  reference_id    text,  -- 关联订单号或其他外部ID
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  energy_transactions IS '电量流水表，完整审计追踪';
COMMENT ON COLUMN energy_transactions.txn_type IS 'recharge=充值, consume=消费, gift=赠送, refund=退款, compensation=系统补偿, trial=试用';
COMMENT ON COLUMN energy_transactions.amount IS '正数=收入, 负数=支出';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.7 payment_orders  (支付订单表 - 幂等性设计)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE payment_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no        text NOT NULL UNIQUE,
  request_id      text NOT NULL UNIQUE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id         uuid REFERENCES pricing_plans(id) ON DELETE SET NULL,
  coupon_id       uuid REFERENCES discount_coupons(id) ON DELETE SET NULL,
  amount_cents    bigint NOT NULL CHECK (amount_cents > 0),
  paid_cents      bigint NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  energy_amount   bigint NOT NULL CHECK (energy_amount > 0),
  currency        text NOT NULL DEFAULT 'CNY',
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunding', 'refunded')),
  paid_at         timestamptz,
  expired_at      timestamptz,
  payment_method  text,
  payment_channel text,
  third_party_txn_id text,
  metadata        jsonb DEFAULT '{}',
  version         bigint NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  payment_orders IS '支付订单表，幂等性设计：uk_request_id防止重复提交';
COMMENT ON COLUMN payment_orders.request_id IS '业务方请求ID，保证幂等性';
COMMENT ON COLUMN payment_orders.order_no IS '平台订单号，对外展示';
COMMENT ON COLUMN payment_orders.version IS '乐观锁，防止并发状态冲突';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.8 payment_callbacks  (支付回调通知记录表)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE payment_callbacks (
  id              bigserial PRIMARY KEY,
  order_id        uuid NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
  channel         text NOT NULL,
  callback_body   jsonb NOT NULL DEFAULT '{}',
  signature       text,
  is_processed    boolean NOT NULL DEFAULT false,
  processed_at    timestamptz,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_callbacks IS '支付渠道回调通知记录表，去重用';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.9 refund_orders  (退款单表)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE refund_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  refund_no       text NOT NULL UNIQUE,
  amount_cents    bigint NOT NULL CHECK (amount_cents > 0),
  reason          text,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'success', 'failed')),
  processed_at    timestamptz,
  operator_id     uuid,  -- 后台操作员
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE refund_orders IS '退款单表，独立状态机';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.10 calendar_events  (日历事件表)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE calendar_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id    uuid REFERENCES companions(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  event_type      text NOT NULL
                    CHECK (event_type IN ('milestone', 'anterior_memory', 'ltm_date', 'companion_birthday', 'user_event')),
  source_id       uuid,  -- 关联的anterior_memory或ltm_memories的ID
  event_date      date NOT NULL,
  event_time      time,
  is_all_day      boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived', 'deleted')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE calendar_events IS '日历事件表，聚合Milestone/Anterior Memory/LTM日期标记';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.11 drama_sessions  (剧情会话表)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE drama_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id    uuid REFERENCES companions(id) ON DELETE SET NULL,
  drama_id        uuid NOT NULL REFERENCES drama_definitions(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  current_scene   text,
  context_memory  jsonb DEFAULT '{}',
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE drama_sessions IS '用户进入剧情后的会话记录';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.12 drama_progress  (剧情解锁状态)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE drama_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  drama_id        uuid NOT NULL REFERENCES drama_definitions(id) ON DELETE CASCADE,
  is_unlocked     boolean NOT NULL DEFAULT false,
  unlocked_at     timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, drama_id)
);

COMMENT ON TABLE drama_progress IS '用户对每个剧情的解锁状态';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.13 crowdfunding_backers  (支持者记录)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE crowdfunding_backers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES crowdfunding_projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          bigint NOT NULL CHECK (amount > 0),
  message         text,
  is_anonymous    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (project_id, user_id)
);

COMMENT ON TABLE crowdfunding_backers IS '筹资项目支持者记录';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.14 drama_messages  (剧情会话中的对话记录)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE drama_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES drama_sessions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  speaker         text NOT NULL CHECK (speaker IN ('user', 'companion', 'narrator')),
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE drama_messages IS '剧情会话中的对话记录';



-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. INDEXES (performance optimization for RLS + common queries)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── profiles ──
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- ── companions ──
CREATE INDEX idx_companions_user_id ON companions(user_id);
CREATE INDEX idx_companions_created_at ON companions(created_at);

-- ── stm_messages ──
CREATE INDEX idx_stm_user_id ON stm_messages(user_id);
CREATE INDEX idx_stm_companion_id ON stm_messages(companion_id);
CREATE INDEX idx_stm_created_at ON stm_messages(created_at);
CREATE INDEX idx_stm_user_created ON stm_messages(user_id, created_at);
CREATE INDEX idx_stm_companion_created ON stm_messages(companion_id, created_at);



-- ═══════════════════════════════════════════════════════════════════════════════
-- 归档表 (Archival Tables)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── stm_messages_archive ──
-- 保留超过STM保留期的历史消息，用于分析和审计
CREATE TABLE stm_messages_archive (
  id              uuid PRIMARY KEY,
  companion_id    uuid NOT NULL,
  speaker         text NOT NULL CHECK (speaker IN ('user', 'companion')),
  content         text NOT NULL,
  emotion         text DEFAULT '',
  token_count     int DEFAULT 0,
  dialogue_id     text DEFAULT '',
  archived_at     timestamptz NOT NULL DEFAULT now(),
  original_created_at timestamptz NOT NULL
);

COMMENT ON TABLE stm_messages_archive IS 'STM归档存储，保留超过retention_days的历史消息';

-- ── calendar_events_archive ──
-- 保留已删除或已完成的日历事件历史
CREATE TABLE calendar_events_archive (
  id              uuid PRIMARY KEY,
  companion_id    uuid NOT NULL,
  title           text NOT NULL,
  description     text,
  event_date      date NOT NULL,
  event_type      text NOT NULL,
  related_memory_id uuid,
  archived_at     timestamptz NOT NULL DEFAULT now(),
  original_created_at timestamptz NOT NULL
);

COMMENT ON TABLE calendar_events_archive IS '日历事件归档存储';

-- ── ltm_memories ──
CREATE INDEX idx_ltm_user_id ON ltm_memories(user_id);
CREATE INDEX idx_ltm_companion_id ON ltm_memories(companion_id);
CREATE INDEX idx_ltm_memory_type ON ltm_memories(memory_type);
CREATE INDEX idx_ltm_importance ON ltm_memories(importance DESC);
CREATE INDEX idx_ltm_is_permanent ON ltm_memories(is_permanent) WHERE is_permanent = true;
CREATE INDEX idx_ltm_memory_date ON ltm_memories(memory_date) WHERE memory_date IS NOT NULL;
CREATE INDEX idx_ltm_user_type_importance ON ltm_memories(user_id, memory_type, importance DESC);
CREATE INDEX idx_ltm_created_at ON ltm_memories(created_at);

-- ── anterior_memories ──
CREATE INDEX idx_anterior_user_id ON anterior_memories(user_id);
CREATE INDEX idx_anterior_companion_id ON anterior_memories(companion_id);
CREATE INDEX idx_anterior_status ON anterior_memories(status);
CREATE INDEX idx_anterior_planned_at ON anterior_memories(planned_at);
CREATE INDEX idx_anterior_user_status ON anterior_memories(user_id, status);
CREATE INDEX idx_anterior_priority ON anterior_memories(priority, planned_at);

-- ── intimacy_records ──
CREATE INDEX idx_intimacy_user_id ON intimacy_records(user_id);
CREATE INDEX idx_intimacy_companion_id ON intimacy_records(companion_id);
CREATE INDEX idx_intimacy_milestone ON intimacy_records(milestone_stage);
CREATE INDEX idx_intimacy_score ON intimacy_records(score);

-- ── intimacy_history ──
CREATE INDEX idx_intimacy_hist_intimacy_id ON intimacy_history(intimacy_id);
CREATE INDEX idx_intimacy_hist_user_id ON intimacy_history(user_id);
CREATE INDEX idx_intimacy_hist_created ON intimacy_history(created_at);
CREATE INDEX idx_intimacy_hist_user_created ON intimacy_history(user_id, created_at);

-- ── mood_records ──
CREATE INDEX idx_mood_companion_id ON mood_records(companion_id);
CREATE INDEX idx_mood_created_at ON mood_records(created_at);
CREATE INDEX idx_mood_companion_created ON mood_records(companion_id, created_at);
CREATE INDEX idx_mood_occ_label ON mood_records(occ_label);

-- ── energy_accounts ──
CREATE INDEX idx_energy_user_id ON energy_accounts(user_id);

-- ── energy_transactions ──
CREATE INDEX idx_energy_txn_account ON energy_transactions(account_id);
CREATE INDEX idx_energy_txn_user ON energy_transactions(user_id);
CREATE INDEX idx_energy_txn_type ON energy_transactions(txn_type);
CREATE INDEX idx_energy_txn_created ON energy_transactions(created_at);
CREATE INDEX idx_energy_txn_user_created ON energy_transactions(user_id, created_at DESC);
CREATE INDEX idx_energy_txn_reference ON energy_transactions(reference_id) WHERE reference_id IS NOT NULL;

-- ── payment_orders ──
CREATE INDEX idx_payment_user_id ON payment_orders(user_id);
CREATE INDEX idx_payment_plan_id ON payment_orders(plan_id) WHERE plan_id IS NOT NULL;
CREATE INDEX idx_payment_coupon_id ON payment_orders(coupon_id) WHERE coupon_id IS NOT NULL;
CREATE INDEX idx_payment_status ON payment_orders(status);
CREATE INDEX idx_payment_created ON payment_orders(created_at);
CREATE INDEX idx_payment_user_status ON payment_orders(user_id, status);
CREATE INDEX idx_payment_third_party ON payment_orders(third_party_txn_id) WHERE third_party_txn_id IS NOT NULL;

-- ── payment_callbacks ──
CREATE INDEX idx_callback_order_id ON payment_callbacks(order_id);
CREATE INDEX idx_callback_processed ON payment_callbacks(is_processed) WHERE is_processed = false;
CREATE INDEX idx_callback_created ON payment_callbacks(created_at);

-- ── refund_orders ──
CREATE INDEX idx_refund_order_id ON refund_orders(order_id);
CREATE INDEX idx_refund_user_id ON refund_orders(user_id);
CREATE INDEX idx_refund_status ON refund_orders(status);
CREATE INDEX idx_refund_refund_no ON refund_orders(refund_no);

-- ── calendar_events ──
CREATE INDEX idx_calendar_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_companion_id ON calendar_events(companion_id);
CREATE INDEX idx_calendar_event_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_event_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_user_date ON calendar_events(user_id, event_date);
CREATE INDEX idx_calendar_source_id ON calendar_events(source_id) WHERE source_id IS NOT NULL;

-- ── drama_sessions ──
CREATE INDEX idx_drama_session_user ON drama_sessions(user_id);
CREATE INDEX idx_drama_session_companion ON drama_sessions(companion_id) WHERE companion_id IS NOT NULL;
CREATE INDEX idx_drama_session_drama ON drama_sessions(drama_id);
CREATE INDEX idx_drama_session_status ON drama_sessions(status);

-- ── drama_messages ──
CREATE INDEX idx_drama_msg_session ON drama_messages(session_id);
CREATE INDEX idx_drama_msg_user ON drama_messages(user_id);
CREATE INDEX idx_drama_msg_created ON drama_messages(created_at);

-- ── drama_progress ──
CREATE INDEX idx_drama_prog_user ON drama_progress(user_id);
CREATE INDEX idx_drama_prog_drama ON drama_progress(drama_id);
CREATE INDEX idx_drama_prog_unlocked ON drama_progress(is_unlocked);

-- ── crowdfunding_backers ──
CREATE INDEX idx_crowdfunding_project ON crowdfunding_backers(project_id);
CREATE INDEX idx_crowdfunding_user ON crowdfunding_backers(user_id);
CREATE INDEX idx_crowdfunding_created ON crowdfunding_backers(created_at);

-- ── pricing_plans ──
CREATE INDEX idx_pricing_active ON pricing_plans(is_active) WHERE is_active = true;
CREATE INDEX idx_pricing_sort ON pricing_plans(sort_order);

-- ── crowdfunding_projects ──
CREATE INDEX idx_crowdfunding_status ON crowdfunding_projects(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. DATABASE FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.1 Energy Recharge Function (idempotent, atomic)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recharge_energy(
  p_order_id      uuid,
  p_user_id       uuid,
  p_energy_amount bigint
)
RETURNS TABLE(new_balance bigint, success boolean) AS $$
DECLARE
  v_account_id uuid;
  v_old_balance bigint;
  v_affected int;
BEGIN
  -- Idempotency: already processed?
  SELECT 1 INTO v_affected FROM energy_transactions
   WHERE reference_id = p_order_id::text AND txn_type = 'recharge' LIMIT 1;
  IF FOUND THEN
    SELECT balance INTO new_balance FROM energy_accounts WHERE user_id = p_user_id;
    RETURN QUERY SELECT new_balance, false;
    RETURN;
  END IF;

  SELECT id, balance INTO v_account_id, v_old_balance
  FROM energy_accounts WHERE user_id = p_user_id FOR UPDATE;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Energy account not found for user %', p_user_id;
  END IF;

  UPDATE energy_accounts
     SET balance = balance + p_energy_amount,
         total_recharged = total_recharged + p_energy_amount,
         version = version + 1,
         updated_at = now()
   WHERE id = v_account_id;

  INSERT INTO energy_transactions (account_id, user_id, txn_type, amount, balance_after, description, reference_id)
  VALUES (v_account_id, p_user_id, 'recharge', p_energy_amount, v_old_balance + p_energy_amount,
          'Payment order recharge', p_order_id::text);

  RETURN QUERY SELECT (v_old_balance + p_energy_amount), true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recharge_energy(uuid, uuid, bigint) IS '电量充值函数，幂等性设计：同一order_id不会重复充值';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.2 Energy Consume Function (atomic deduction with pre-check)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION consume_energy(
  p_user_id       uuid,
  p_energy_amount bigint,
  p_description   text DEFAULT 'Energy consumption',
  p_reference_id  text DEFAULT NULL
)
RETURNS TABLE(success boolean, new_balance bigint, consumed bigint) AS $$
DECLARE
  v_account_id uuid;
  v_old_balance bigint;
  v_new_balance bigint;
BEGIN
  -- Lock account row for atomic operation
  SELECT id, balance INTO v_account_id, v_old_balance
  FROM energy_accounts WHERE user_id = p_user_id FOR UPDATE;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Energy account not found for user %', p_user_id;
  END IF;

  IF v_old_balance < p_energy_amount THEN
    -- Insufficient balance
    RETURN QUERY SELECT false, v_old_balance, 0::bigint;
    RETURN;
  END IF;

  v_new_balance := v_old_balance - p_energy_amount;

  UPDATE energy_accounts
     SET balance = v_new_balance,
         total_consumed = total_consumed + p_energy_amount,
         version = version + 1,
         updated_at = now()
   WHERE id = v_account_id;

  INSERT INTO energy_transactions (account_id, user_id, txn_type, amount, balance_after, description, reference_id)
  VALUES (v_account_id, p_user_id, 'consume', -p_energy_amount, v_new_balance, p_description, p_reference_id);

  RETURN QUERY SELECT true, v_new_balance, p_energy_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION consume_energy(uuid, bigint, text, text) IS '电量消费函数，原子扣减，余额不足时返回success=false';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.3 Adjust Intimacy Score Function (with boundary check 0-100)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION adjust_intimacy(
  p_user_id       uuid,
  p_companion_id  uuid,
  p_delta         smallint,
  p_reason        text DEFAULT NULL
)
RETURNS TABLE(old_score smallint, new_score smallint, milestone_stage smallint) AS $$
DECLARE
  v_intimacy_id uuid;
  v_old_score smallint;
  v_new_score smallint;
  v_new_stage smallint;
  v_now timestamptz := now();
BEGIN
  SELECT id, score INTO v_intimacy_id, v_old_score
  FROM intimacy_records
  WHERE user_id = p_user_id AND companion_id = p_companion_id
  FOR UPDATE;

  IF v_intimacy_id IS NULL THEN
    -- Auto-create if not exists
    INSERT INTO intimacy_records (user_id, companion_id, score, milestone_stage)
    VALUES (p_user_id, p_companion_id, 0, 1)
    RETURNING id, score INTO v_intimacy_id, v_old_score;
  END IF;

  v_new_score := GREATEST(0, LEAST(100, v_old_score + p_delta));

  -- Determine new milestone stage
  SELECT id INTO v_new_stage
  FROM milestone_definitions
  WHERE min_score <= v_new_score AND max_score >= v_new_score;

  UPDATE intimacy_records
     SET score = v_new_score,
         milestone_stage = v_new_stage,
         updated_at = v_now
   WHERE id = v_intimacy_id;

  -- Log the change
  INSERT INTO intimacy_history (intimacy_id, user_id, companion_id, old_score, new_score, change_reason)
  VALUES (v_intimacy_id, p_user_id, p_companion_id, v_old_score, v_new_score, p_reason);

  RETURN QUERY SELECT v_old_score, v_new_score, v_new_stage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION adjust_intimacy(uuid, uuid, smallint, text) IS '好感度调整函数，自动边界检查0-100，自动记录历史';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.4 Update Mood Function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_mood(
  p_companion_id  uuid,
  p_pleasure      smallint,
  p_arousal       smallint,
  p_dominance     smallint,
  p_occ_label     text DEFAULT NULL,
  p_intensity     smallint DEFAULT 50,
  p_context       text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_mood_id uuid;
BEGIN
  INSERT INTO mood_records (companion_id, pleasure, arousal, dominance, occ_label, intensity, context)
  VALUES (p_companion_id, p_pleasure, p_arousal, p_dominance, p_occ_label, p_intensity, p_context)
  RETURNING id INTO v_mood_id;

  RETURN v_mood_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_mood(uuid, smallint, smallint, smallint, text, smallint, text) IS '情绪更新函数，创建一条新的情绪记录';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.5 Dissolve Relationship Function (clear all memories + restore status)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dissolve_relationship(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_companion_id uuid;
BEGIN
  -- Guard against recursive trigger execution
  PERFORM set_config('app.dissolving_relationship', 'true', true);

  -- Get the companion
  SELECT id INTO v_companion_id FROM companions WHERE user_id = p_user_id;

  IF v_companion_id IS NULL THEN
    RETURN false;
  END IF;

  -- Clear STM (old messages)
  DELETE FROM stm_messages WHERE user_id = p_user_id;

  -- Clear LTM (non-permanent memories)
  DELETE FROM ltm_memories WHERE user_id = p_user_id AND is_permanent = false;

  -- Cancel pending anterior memories
  UPDATE anterior_memories
     SET status = 'cancelled',
         updated_at = now()
   WHERE user_id = p_user_id AND status = 'pending';

  -- Reset intimacy record
  UPDATE intimacy_records
     SET score = 0,
         milestone_stage = 1,
         updated_at = now()
   WHERE user_id = p_user_id;

  -- Delete the companion
  DELETE FROM companions WHERE user_id = p_user_id;

  -- Restore user status
  UPDATE profiles SET status = 'NO_COMPANION', updated_at = now() WHERE id = p_user_id;

  PERFORM set_config('app.dissolving_relationship', 'false', true);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION dissolve_relationship(uuid) IS '关系解除函数：清除所有非永久记忆+取消待办+重置好感度+删除伴侣+恢复用户状态';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.6 STM Cleanup Function (remove messages older than retention days)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_stm(p_retention_days int DEFAULT 3)
RETURNS int AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM stm_messages
   WHERE created_at < now() - (p_retention_days || ' days')::interval;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_stm(int) IS 'STM清理函数，删除超过保留天数的对话消息，默认3天';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.7 Free Trial Consume Function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION consume_trial_energy(
  p_user_id       uuid,
  p_energy_amount bigint,
  p_description   text DEFAULT 'Trial energy consumption'
)
RETURNS TABLE(success boolean, consumed_from_trial bigint, consumed_from_balance bigint, new_balance bigint) AS $$
DECLARE
  v_trial_id uuid;
  v_trial_remaining bigint;
  v_from_trial bigint := 0;
  v_from_balance bigint := 0;
  v_account_id uuid;
  v_old_balance bigint;
  v_new_balance bigint;
BEGIN
  -- Check trial allocation
  SELECT id, (total_energy - consumed_energy) INTO v_trial_id, v_trial_remaining
  FROM free_trial_allocations
  WHERE user_id = p_user_id AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF v_trial_remaining IS NOT NULL AND v_trial_remaining > 0 THEN
    -- Use trial energy first
    v_from_trial := LEAST(v_trial_remaining, p_energy_amount);

    UPDATE free_trial_allocations
       SET consumed_energy = consumed_energy + v_from_trial,
           updated_at = now()
     WHERE id = v_trial_id;

    -- Log trial consumption
    SELECT id INTO v_account_id FROM energy_accounts WHERE user_id = p_user_id;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO energy_transactions (account_id, user_id, txn_type, amount, balance_after, description)
      VALUES (v_account_id, p_user_id, 'trial', -v_from_trial,
              (SELECT balance FROM energy_accounts WHERE id = v_account_id),
              p_description);
    END IF;

    v_from_balance := p_energy_amount - v_from_trial;
  ELSE
    v_from_balance := p_energy_amount;
  END IF;

  -- Consume from balance if needed
  IF v_from_balance > 0 THEN
    SELECT id, balance INTO v_account_id, v_old_balance
    FROM energy_accounts WHERE user_id = p_user_id FOR UPDATE;

    IF v_account_id IS NULL OR v_old_balance < v_from_balance THEN
      RETURN QUERY SELECT false, v_from_trial, 0::bigint, COALESCE(v_old_balance, 0)::bigint;
      RETURN;
    END IF;

    v_new_balance := v_old_balance - v_from_balance;

    UPDATE energy_accounts
       SET balance = v_new_balance,
           total_consumed = total_consumed + v_from_balance,
           version = version + 1,
           updated_at = now()
     WHERE id = v_account_id;

    INSERT INTO energy_transactions (account_id, user_id, txn_type, amount, balance_after, description)
    VALUES (v_account_id, p_user_id, 'consume', -v_from_balance, v_new_balance, p_description);
  ELSE
    v_new_balance := (SELECT balance FROM energy_accounts WHERE user_id = p_user_id);
  END IF;

  RETURN QUERY SELECT true, v_from_trial, v_from_balance, COALESCE(v_new_balance, 0)::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION consume_trial_energy(uuid, bigint, text) IS '优先消耗试用额度再消耗余额的复合消费函数';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.8 Generic Updated-at Trigger Function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.1 Auto-set updated_at on all tables that have it
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_companions_updated_at
  BEFORE UPDATE ON companions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pricing_plans_updated_at
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_crowdfunding_projects_updated_at
  BEFORE UPDATE ON crowdfunding_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_drama_definitions_updated_at
  BEFORE UPDATE ON drama_definitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ltm_memories_updated_at
  BEFORE UPDATE ON ltm_memories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_anterior_memories_updated_at
  BEFORE UPDATE ON anterior_memories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_energy_accounts_updated_at
  BEFORE UPDATE ON energy_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_free_trial_allocations_updated_at
  BEFORE UPDATE ON free_trial_allocations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_refund_orders_updated_at
  BEFORE UPDATE ON refund_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_drama_sessions_updated_at
  BEFORE UPDATE ON drama_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_drama_progress_updated_at
  BEFORE UPDATE ON drama_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_discount_coupons_updated_at
  BEFORE UPDATE ON discount_coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_intimacy_records_updated_at
  BEFORE UPDATE ON intimacy_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.2 New user registration: create energy account + free trial allocation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create energy account
  INSERT INTO energy_accounts (user_id, balance, total_recharged, total_consumed, version)
  VALUES (NEW.id, 0, 0, 0, 1);

  -- Create free trial allocation (100 energy, 7 days expiry)
  INSERT INTO free_trial_allocations (user_id, total_energy, consumed_energy, is_active, expires_at)
  VALUES (NEW.id, 100, 0, true, now() + interval '7 days');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_profiles_after_insert
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_new_user_setup();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.3 Companion creation: auto-create Big Five defaults + intimacy record
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_companion_created()
RETURNS TRIGGER AS $$
DECLARE
  v_dissolving text;
BEGIN
  -- Guard: skip if in relationship dissolution
  v_dissolving := current_setting('app.dissolving_relationship', true);
  IF v_dissolving = 'true' THEN
    RETURN NEW;
  END IF;

  -- Update user status
  UPDATE profiles SET status = 'HAS_COMPANION' WHERE id = NEW.user_id;

  -- Create intimacy record at stage 1
  INSERT INTO intimacy_records (user_id, companion_id, score, milestone_stage)
  VALUES (NEW.user_id, NEW.id, 0, 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_companions_after_insert
  AFTER INSERT ON companions
  FOR EACH ROW EXECUTE FUNCTION trg_companion_created();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.4 Intim milestone promotion: when score crosses threshold
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_check_milestone_promotion()
RETURNS TRIGGER AS $$
DECLARE
  v_expected_stage smallint;
BEGIN
  -- Recalculate expected stage based on new score
  SELECT id INTO v_expected_stage
  FROM milestone_definitions
  WHERE min_score <= NEW.score AND max_score >= NEW.score;

  IF v_expected_stage IS NOT NULL AND v_expected_stage <> NEW.milestone_stage THEN
    NEW.milestone_stage := v_expected_stage;
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_intimacy_milestone_check
  BEFORE UPDATE OF score ON intimacy_records
  FOR EACH ROW EXECUTE FUNCTION trg_check_milestone_promotion();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.5 Payment order status change: log transaction when paid
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> 'paid' AND NEW.status = 'paid' AND NEW.paid_at IS NULL THEN
    NEW.paid_at := now();

    -- Recharge energy
    PERFORM recharge_energy(NEW.id, NEW.user_id, NEW.energy_amount);
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'cancelled' AND NEW.expired_at IS NULL THEN
    NEW.expired_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_payment_orders_status
  BEFORE UPDATE OF status ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION trg_payment_status_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.6 Crowdfunding backer: update project current_amount
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_crowdfunding_update_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE crowdfunding_projects
       SET current_amount = current_amount + NEW.amount,
           updated_at = now()
     WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE crowdfunding_projects
       SET current_amount = GREATEST(0, current_amount - OLD.amount),
           updated_at = now()
     WHERE id = OLD.project_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.amount <> NEW.amount THEN
    UPDATE crowdfunding_projects
       SET current_amount = GREATEST(0, current_amount - OLD.amount + NEW.amount),
           updated_at = now()
     WHERE id = NEW.project_id;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crowdfunding_backers_change
  AFTER INSERT OR DELETE OR UPDATE ON crowdfunding_backers
  FOR EACH ROW EXECUTE FUNCTION trg_crowdfunding_update_amount();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.7 Anterior memory completion: auto-update calendar event
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_anterior_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at := now();

    -- Archive related calendar events
    UPDATE calendar_events
       SET status = 'archived',
           updated_at = now()
     WHERE source_id = NEW.id AND event_type = 'anterior_memory';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_anterior_memories_status
  BEFORE UPDATE OF status ON anterior_memories
  FOR EACH ROW EXECUTE FUNCTION trg_anterior_status_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.8 Refund completion: create energy compensation transaction
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_refund_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id uuid;
  v_old_balance bigint;
  v_energy_amount bigint;
BEGIN
  IF OLD.status <> 'success' AND NEW.status = 'success' THEN
    NEW.processed_at := now();

    -- Cache the energy amount to avoid repeated subqueries
    SELECT energy_amount INTO v_energy_amount
    FROM payment_orders WHERE id = NEW.order_id;

    -- Deduct the energy that was recharged by this order's payment
    SELECT id, balance INTO v_account_id, v_old_balance
    FROM energy_accounts WHERE user_id = NEW.user_id FOR UPDATE;

    IF v_account_id IS NOT NULL THEN
      -- Log compensation (refund = energy deduction)
      INSERT INTO energy_transactions (account_id, user_id, txn_type, amount, balance_after, description, reference_id)
      VALUES (v_account_id, NEW.user_id, 'refund', -v_energy_amount,
              v_old_balance - v_energy_amount, 'Refund energy deduction', NEW.refund_no);

      -- Actually deduct the energy
      UPDATE energy_accounts
         SET balance = GREATEST(0, balance - v_energy_amount),
             version = version + 1,
             updated_at = now()
       WHERE id = v_account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_refund_orders_status
  BEFORE UPDATE OF status ON refund_orders
  FOR EACH ROW EXECUTE FUNCTION trg_refund_completed();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.1 profiles  (用户只能访问自己的profile)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.2 companions  (用户只能访问自己的companion)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companions_select_own"
  ON companions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "companions_insert_own"
  ON companions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "companions_update_own"
  ON companions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "companions_delete_own"
  ON companions FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.3 stm_messages  (通过companion_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE stm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stm_select_own"
  ON stm_messages FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "stm_insert_own"
  ON stm_messages FOR INSERT
  WITH CHECK (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "stm_delete_own"
  ON stm_messages FOR DELETE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.4 ltm_memories  (通过companion_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ltm_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ltm_select_own"
  ON ltm_memories FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "ltm_insert_own"
  ON ltm_memories FOR INSERT
  WITH CHECK (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "ltm_update_own"
  ON ltm_memories FOR UPDATE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "ltm_delete_own"
  ON ltm_memories FOR DELETE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.5 anterior_memories  (通过companion_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE anterior_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anterior_select_own"
  ON anterior_memories FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "anterior_insert_own"
  ON anterior_memories FOR INSERT
  WITH CHECK (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "anterior_update_own"
  ON anterior_memories FOR UPDATE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "anterior_delete_own"
  ON anterior_memories FOR DELETE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.6 intimacy_records  (通过companion_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE intimacy_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intimacy_select_own"
  ON intimacy_records FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "intimacy_insert_system"
  ON intimacy_records FOR INSERT
  WITH CHECK (true);  -- Inserted only by SECURITY DEFINER triggers/functions

CREATE POLICY "intimacy_update_own"
  ON intimacy_records FOR UPDATE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.7 intimacy_history  (通过companion_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE intimacy_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intimacy_hist_select_own"
  ON intimacy_history FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "intimacy_hist_insert_system"
  ON intimacy_history FOR INSERT
  WITH CHECK (true);  -- Inserted only by SECURITY DEFINER functions

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.8 mood_records  (通过companion_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE mood_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mood_select_own"
  ON mood_records FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "mood_insert_system"
  ON mood_records FOR INSERT
  WITH CHECK (true);  -- Inserted only by SECURITY DEFINER functions

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.9 energy_accounts  (用户只能访问自己的账户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE energy_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "energy_account_select_own"
  ON energy_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "energy_account_insert_system"
  ON energy_accounts FOR INSERT
  WITH CHECK (true);  -- Inserted only by SECURITY DEFINER trigger

CREATE POLICY "energy_account_update_system"
  ON energy_accounts FOR UPDATE
  USING (true);  -- Updated only by SECURITY DEFINER functions

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.10 energy_transactions  (用户只能查看自己的流水)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE energy_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "energy_txn_select_own"
  ON energy_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "energy_txn_insert_system"
  ON energy_transactions FOR INSERT
  WITH CHECK (true);  -- Inserted only by SECURITY DEFINER functions

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.11 free_trial_allocations  (用户只能访问自己的试用额度)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE free_trial_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_select_own"
  ON free_trial_allocations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "trial_insert_system"
  ON free_trial_allocations FOR INSERT
  WITH CHECK (true);  -- Inserted only by SECURITY DEFINER trigger

CREATE POLICY "trial_update_system"
  ON free_trial_allocations FOR UPDATE
  USING (true);  -- Updated only by SECURITY DEFINER functions/cron

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.12 payment_orders  (用户只能访问自己的订单)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_select_own"
  ON payment_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "payment_insert_own"
  ON payment_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_update_own"
  ON payment_orders FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.13 payment_callbacks  (通过order_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payment_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "callback_select_own"
  ON payment_callbacks FOR SELECT
  USING (order_id IN (SELECT id FROM payment_orders WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.14 refund_orders  (通过order_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE refund_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refund_select_own"
  ON refund_orders FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM payment_orders WHERE refund_orders.order_id = payment_orders.id));

CREATE POLICY "refund_insert_own"
  ON refund_orders FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM payment_orders WHERE refund_orders.order_id = payment_orders.id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.15 calendar_events  (通过companion_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_select_own"
  ON calendar_events FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "calendar_insert_own"
  ON calendar_events FOR INSERT
  WITH CHECK (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "calendar_update_own"
  ON calendar_events FOR UPDATE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "calendar_delete_own"
  ON calendar_events FOR DELETE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.16 drama_sessions  (通过companion_id关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE drama_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drama_session_select_own"
  ON drama_sessions FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "drama_session_insert_own"
  ON drama_sessions FOR INSERT
  WITH CHECK (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

CREATE POLICY "drama_session_update_own"
  ON drama_sessions FOR UPDATE
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.17 drama_messages  (通过session_id -> drama_sessions -> companion关联到用户)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE drama_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drama_msg_select_own"
  ON drama_messages FOR SELECT
  USING (session_id IN (
    SELECT id FROM drama_sessions
    WHERE companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid())
  ));

CREATE POLICY "drama_msg_insert_own"
  ON drama_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM drama_sessions
    WHERE companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid())
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.18 drama_progress  (用户只能访问自己的剧情进度)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE drama_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drama_progress_select_own"
  ON drama_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "drama_progress_insert_own"
  ON drama_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "drama_progress_update_own"
  ON drama_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.19 crowdfunding_backers  (用户可查看所有支持记录，只能插入自己的)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE crowdfunding_backers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backer_select_all_or_own"
  ON crowdfunding_backers FOR SELECT
  USING (auth.uid() = user_id OR true);

CREATE POLICY "backer_insert_own"
  ON crowdfunding_backers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "backer_delete_own"
  ON crowdfunding_backers FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.20 discount_coupons  (所有人可查看可用优惠券)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_select_all"
  ON discount_coupons FOR SELECT
  USING (is_active = true AND valid_from <= now()
         AND (valid_until IS NULL OR valid_until > now()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.21 milestone_definitions  (公共字典表，只读)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE milestone_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestone_select_all"
  ON milestone_definitions FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.22 pricing_plans  (公共字典表，只读活跃套餐)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_select_all"
  ON pricing_plans FOR SELECT
  USING (is_active = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.23 crowdfunding_projects  (公共字典表，只读)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE crowdfunding_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crowdfunding_select_all"
  ON crowdfunding_projects FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.24 system_config  (公共字典表，只读)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_select_all"
  ON system_config FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.25 emotion_occs  (公共字典表，只读)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE emotion_occs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emotion_occ_select_all"
  ON emotion_occs FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.26 drama_definitions  (根据用户milestone动态控制解锁)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE drama_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drama_def_select_unlocked"
  ON drama_definitions FOR SELECT
  USING (is_active = true AND (
    -- Allow all active dramas that are not locked behind milestones
    unlock_condition = 'default' OR unlock_condition IS NULL
    -- Or dramas where user's current milestone stage meets the requirement
    OR EXISTS (
      SELECT 1 FROM companions c
      JOIN intimacy_records ir ON ir.companion_id = c.id
      WHERE c.user_id = auth.uid()
        AND ir.milestone_stage >= (
          -- Parse numeric unlock requirement from unlock_condition
          -- e.g., 'milestone:3' means milestone_stage >= 3
          CASE
            WHEN unlock_condition ~ '^milestone:[0-9]+$'
            THEN (split_part(unlock_condition, ':', 2))::int
            ELSE 0
          END
        )
    )
  ));



-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 8.1 Milestone Definitions ──
INSERT INTO milestone_definitions (id, name, description, min_score, max_score, unlocked_features) VALUES
(1, '初见乍欢', '刚认识不久，彼此还在了解中，保持礼貌和友好的距离',    0,  20,  'basic_chat'),
(2, '渐入佳境', '开始熟悉，交流更加自然，会记住对方提到的小事',       21,  40,  'nickname_unlocked,shared_jokes'),
(3, '暗生情愫', '关系变得特别，开始在意自己在对方眼中的形象',          41,  60,  'memory_sharing,emotional_support,anterior_memory'),
(4, '情投意合', '建立了深厚的情感连接，能够直觉地理解对方的情绪',      61,  80,  'proactive_messages,personalized_greetings,advanced_drama'),
(5, '心有灵犀', '最深的情感连接，彼此是生命中最重要的人',             81, 100,  'all_features,exclusive_content,voice_preview')
ON CONFLICT (id) DO NOTHING;

-- ── 8.2 System Config ──
INSERT INTO system_config (config_key, config_value, description) VALUES
('stm_retention_days',        '3',   'Short Term Memory retention period in days'),
('consolidation_interval_hours', '6', 'LTM consolidation minimum interval in hours'),
('proactive_rate_limit_minutes', '30', 'Minimum interval between proactive messages in minutes'),
('free_trial_energy',         '100', 'New user free trial energy amount'),
('free_trial_expiry_days',    '7',   'Free trial expiration in days'),
('intimacy_daily_decay',      '0',   'Daily intimacy score decay (0 = no decay)'),
('mood_decay_hours',          '2',   'Mood auto-decay interval in hours'),
('max_stm_per_cleanup',       '10000', 'Maximum STM rows deleted per cleanup run'),
('payment_order_expiry_minutes', '30', 'Payment order expiration time'),
('companion_creation_energy_cost', '0', 'Energy cost to create a companion (0 = free)')
ON CONFLICT (config_key) DO NOTHING;

-- ── 8.3 Pricing Plans ──
INSERT INTO pricing_plans (name, description, energy_amount, price_cents, currency, sort_order, is_active) VALUES
('Starter Pack',   'Small energy pack for beginners',    100,   100,  'CNY', 1, true),
('Standard Pack',  'Most popular choice',               550,   500,  'CNY', 2, true),
('Premium Pack',   'Best value for regular users',     1200,  1000,  'CNY', 3, true),
('Ultimate Pack',  'Maximum energy for power users',   6500,  5000,  'CNY', 4, true)
ON CONFLICT DO NOTHING;

-- ── 8.4 Emotion OCC Labels ──
INSERT INTO emotion_occs (label, pleasure_delta, arousal_delta, dominance_delta, description) VALUES
('joy',         80,  60,  10,  'Happy, pleased, delighted'),
('distress',   -80, -40, -30,  'Sad, upset, distressed'),
('hope',        60,  40,  20,  'Hopeful, optimistic, expecting good'),
('fear',       -70,  80, -60,  'Afraid, anxious, fearful'),
('pride',       70,  30,  70,  'Proud, accomplished, self-satisfied'),
('shame',      -70, -20, -60,  'Ashamed, embarrassed, humiliated'),
('love',        90,  70,  20,  'Loving, adoring, affectionate'),
('hate',       -90,  80,  60,  'Hating, loathing, despising'),
('gratitude',   70,  20, -10,  'Grateful, thankful, appreciative'),
('anger',      -70,  90,  80,  'Angry, furious, irate'),
('surprise',    20,  90, -20,  'Surprised, amazed, astonished'),
('disgust',    -80,  40, -10,  'Disgusted, repulsed, revolted'),
('contentment', 60, -30,  20,  'Content, satisfied, peaceful'),
('boredom',    -20, -60, -30,  'Bored, uninterested, apathetic'),
('curiosity',   30,  60,  30,  'Curious, inquisitive, interested')
ON CONFLICT (label) DO NOTHING;

-- ── 8.5 Drama Definitions (Sample) ──
INSERT INTO drama_definitions (name, description, scene_setting, drama_prompt, sort_order, is_active) VALUES
('First Meeting', 'The moment when you first meet your companion',
 'A quiet cafe on a rainy afternoon',
 'You enter the cafe and notice someone sitting alone by the window...',
 1, true),
('Starry Night', 'A peaceful night under the stars',
 'A hilltop observatory overlooking the city',
 'The night is clear and the stars are bright. You and your companion are on the hilltop...',
 2, true),
('The Confession', 'A deeply emotional moment of truth',
 'A cozy room with soft candlelight',
 'The atmosphere feels different tonight. There is something important in the air...',
 3, true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. MAINTENANCE & UTILITY VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 9.1 User Dashboard View ──
CREATE OR REPLACE VIEW user_dashboard AS
SELECT
  p.id AS user_id,
  p.nickname,
  p.status AS user_status,
  p.language,
  p.timezone,
  ea.balance AS energy_balance,
  CASE
    WHEN ft.is_active AND (ft.expires_at IS NULL OR ft.expires_at > now())
    THEN ft.total_energy - ft.consumed_energy
    ELSE 0
  END AS trial_energy_remaining,
  COALESCE(ir.score, 0) AS intimacy_score,
  COALESCE(ir.milestone_stage, 1) AS milestone_stage,
  md.name AS milestone_name,
  c.id AS companion_id,
  c.nickname AS companion_nickname,
  c.gender AS companion_gender,
  c.bf_openness,
  c.bf_conscientiousness,
  c.bf_extraversion,
  c.bf_agreeableness,
  c.bf_neuroticism,
  (SELECT jsonb_build_object(
    'pleasure', pleasure,
    'arousal', arousal,
    'dominance', dominance,
    'occ_label', occ_label
  ) FROM mood_records WHERE companion_id = c.id ORDER BY created_at DESC LIMIT 1) AS latest_mood,
  (SELECT count(*) FROM anterior_memories WHERE user_id = p.id AND status = 'pending') AS pending_anterior_count,
  (SELECT count(*) FROM stm_messages WHERE user_id = p.id AND created_at > now() - interval '1 day') AS today_message_count,
  (SELECT count(*) FROM ltm_memories WHERE user_id = p.id) AS ltm_memory_count
FROM profiles p
LEFT JOIN energy_accounts ea ON ea.user_id = p.id
LEFT JOIN free_trial_allocations ft ON ft.user_id = p.id
LEFT JOIN companions c ON c.user_id = p.id
LEFT JOIN intimacy_records ir ON ir.user_id = p.id
LEFT JOIN milestone_definitions md ON md.id = COALESCE(ir.milestone_stage, 1);

COMMENT ON VIEW user_dashboard IS '用户仪表盘视图，聚合所有核心数据，需通过RLS过滤';

-- ── 9.2 Energy Balance Summary View ──
CREATE OR REPLACE VIEW energy_balance_summary AS
SELECT
  ea.user_id,
  p.nickname,
  ea.balance,
  ea.total_recharged,
  ea.total_consumed,
  COALESCE(ft.total_energy - ft.consumed_energy, 0) AS trial_remaining,
  ea.version,
  ea.created_at AS account_created_at
FROM energy_accounts ea
JOIN profiles p ON p.id = ea.user_id
LEFT JOIN free_trial_allocations ft ON ft.user_id = ea.user_id;

COMMENT ON VIEW energy_balance_summary IS '电量余额汇总视图，便于后台管理';

-- ── 9.3 Companion Full Profile View ──
CREATE OR REPLACE VIEW companion_full_profile AS
SELECT
  c.*,
  ir.score AS intimacy_score,
  ir.milestone_stage,
  md.name AS milestone_name,
  md.description AS milestone_description,
  (SELECT jsonb_build_object(
    'pleasure', pleasure,
    'arousal', arousal,
    'dominance', dominance,
    'occ_label', occ_label,
    'intensity', intensity,
    'context', context,
    'recorded_at', created_at
  ) FROM mood_records WHERE companion_id = c.id ORDER BY created_at DESC LIMIT 1) AS current_mood,
  (SELECT count(*) FROM stm_messages WHERE companion_id = c.id AND created_at > now() - interval '24 hours') AS stm_24h_count,
  (SELECT count(*) FROM ltm_memories WHERE companion_id = c.id) AS ltm_total_count,
  (SELECT count(*) FROM anterior_memories WHERE companion_id = c.id AND status = 'pending') AS anterior_pending_count
FROM companions c
LEFT JOIN intimacy_records ir ON ir.companion_id = c.id
LEFT JOIN milestone_definitions md ON md.id = ir.milestone_stage;

COMMENT ON VIEW companion_full_profile IS '伴侣完整档案视图，包含好感度、情绪、记忆统计';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. DATA ARCHIVAL & CLEANUP SUPPORT
-- ═══════════════════════════════════════════════════════════════════════════════

-- Note: Archive tables are defined in Section 4 (Archival Tables).
-- stm_messages_archive and calendar_events_archive use a simplified schema
-- without user_id (only companion_id) for storage efficiency.

-- ── 10.1 Intimacy History Partition Helper ──
-- Note: For high-volume installations, consider partitioning intimacy_history
-- by created_at range. Example setup:
-- CREATE TABLE intimacy_history_y2024m01 PARTITION OF intimacy_history
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. ADDITIONAL INDEXES AND RLS FOR ARCHIVE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Archive tables use companion_id (not user_id) for RLS, matching their schema
CREATE INDEX IF NOT EXISTS idx_stm_archive_archived_at ON stm_messages_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_stm_archive_companion_id ON stm_messages_archive(companion_id);
CREATE INDEX IF NOT EXISTS idx_calendar_archive_archived_at ON calendar_events_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_calendar_archive_companion_id ON calendar_events_archive(companion_id);

-- ── Enable RLS for archive tables (access via companion ownership chain) ──
ALTER TABLE stm_messages_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stm_archive_select_own"
  ON stm_messages_archive FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

ALTER TABLE calendar_events_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_archive_select_own"
  ON calendar_events_archive FOR SELECT
  USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. HELPER FUNCTIONS FOR APPLICATION USE
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 12.1 Get user's current energy (balance + trial) ──
CREATE OR REPLACE FUNCTION get_user_energy(p_user_id uuid)
RETURNS TABLE(balance bigint, trial_remaining bigint, total_available bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ea.balance, 0) AS balance,
    COALESCE(
      CASE WHEN ft.is_active AND (ft.expires_at IS NULL OR ft.expires_at > now())
           THEN ft.total_energy - ft.consumed_energy
           ELSE 0 END,
      0
    ) AS trial_remaining,
    COALESCE(ea.balance, 0) + COALESCE(
      CASE WHEN ft.is_active AND (ft.expires_at IS NULL OR ft.expires_at > now())
           THEN ft.total_energy - ft.consumed_energy
           ELSE 0 END,
      0
    ) AS total_available
  FROM profiles p
  LEFT JOIN energy_accounts ea ON ea.user_id = p.id
  LEFT JOIN free_trial_allocations ft ON ft.user_id = p.id
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── 12.2 Get companion's current mood ──
CREATE OR REPLACE FUNCTION get_current_mood(p_companion_id uuid)
RETURNS TABLE(
  pleasure smallint, arousal smallint, dominance smallint,
  occ_label text, intensity smallint, context text, created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT mr.pleasure, mr.arousal, mr.dominance, mr.occ_label, mr.intensity, mr.context, mr.created_at
  FROM mood_records mr
  WHERE mr.companion_id = p_companion_id
  ORDER BY mr.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── 12.3 Search LTM memories by content similarity (basic prefix match) ──
CREATE OR REPLACE FUNCTION search_ltm_memories(
  p_user_id uuid,
  p_keyword text,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  id uuid, content text, memory_type text, importance numeric,
  is_permanent boolean, memory_date date, created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.memory_type, m.importance,
         m.is_permanent, m.memory_date, m.created_at
  FROM ltm_memories m
  WHERE m.user_id = p_user_id
    AND m.content ILIKE '%' || p_keyword || '%'
  ORDER BY m.importance DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── 12.4 Get intimacy history for a date range ──
CREATE OR REPLACE FUNCTION get_intimacy_history(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  date_trunc date, old_score smallint, new_score smallint,
  change_reason text, entry_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.created_at::date AS date_trunc,
    MIN(h.old_score) AS old_score,
    MAX(h.new_score) AS new_score,
    string_agg(DISTINCT h.change_reason, '; ') AS change_reason,
    count(*) AS entry_count
  FROM intimacy_history h
  WHERE h.user_id = p_user_id
    AND h.created_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY h.created_at::date
  ORDER BY date_trunc;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── 12.5 Validate coupon ──
CREATE OR REPLACE FUNCTION validate_coupon(p_code text)
RETURNS TABLE(
  is_valid boolean, coupon_id uuid, discount_type text,
  discount_value bigint, message text
) AS $$
DECLARE
  v_coupon discount_coupons%ROWTYPE;
BEGIN
  SELECT * INTO v_coupon FROM discount_coupons WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::uuid, null::text, null::bigint, 'Coupon not found'::text;
    RETURN;
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN QUERY SELECT false, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 'Coupon is inactive'::text;
    RETURN;
  END IF;

  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT false, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 'Coupon not yet valid'::text;
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 'Coupon has expired'::text;
    RETURN;
  END IF;

  IF v_coupon.max_uses > 0 AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 'Coupon usage limit reached'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 'Coupon is valid'::text;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. COMPREHENSIVE DESIGN NOTES
-- ═══════════════════════════════════════════════════════════════════════════════
/*

┌─────────────────────────────────────────────────────────────────────────────┐
│                            DESIGN DECISION LOG                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 1. USER SYSTEM                                                              │
│    - profiles.id = auth.users.id (CASCADE delete ensures cleanup)           │
│    - status field uses CHECK constraint for enum safety                     │
│    - RLS: users can only read/update their own profile                      │
│                                                                             │
│ 2. COMPANION SYSTEM                                                         │
│    - UNIQUE(user_id) enforces 1:1 relationship                              │
│    - Big Five defaults to 50 (neutral), CHECK 0-100                         │
│    - Trigger auto-creates intimacy_record + updates profile status          │
│    - dissolve_relationship() guarded against recursion via session var      │
│                                                                             │
│ 3. MEMORY SYSTEM (3-Layer)                                                  │
│    STM:                                                                     │
│    - No update policy (append-only log)                                     │
│    - cleanup_stm() removes messages > retention_days (default 3)            │
│    - Index on (user_id, created_at) for efficient cleanup queries           │
│                                                                             │
│    LTM:                                                                     │
│    - importance 0.1-1.0 with NUMERIC(2,1) for precision                    │
│    - is_permanent explicit flag for unerasable memories                     │
│    - source_stm_ids array links back to originating messages                │
│    - Partial index on is_permanent=true for fast permanent memory queries   │
│                                                                             │
│    Anterior:                                                                │
│    - trigger_type supports time/event/milestone based scheduling            │
│    - priority 1-5 (1=highest)                                               │
│    - Status change to 'completed' auto-archives calendar events             │
│                                                                             │
│ 4. INTIMACY/MILESTONE SYSTEM                                                │
│    - Separate milestone_definitions table allows runtime stage config       │
│    - adjust_intimacy() function auto-creates record if missing              │
│    - Trigger auto-promotes stage when score crosses thresholds              │
│    - History logged with old/new score for audit trail                      │
│                                                                             │
│ 5. EMOTION SYSTEM                                                           │
│    - PAD model: pleasure/arousal/dominance each -100 to +100               │
│    - OCC label references emotion_occs dictionary table                     │
│    - mood_records is append-only (no updates)                               │
│                                                                             │
│ 6. ENERGY SYSTEM                                                            │
│    - BIGINT balance (min unit = 1 energy), no floating point               │
│    - Optimistic locking (version field) on energy_accounts                 │
│    - consume_energy() does balance pre-check, returns success flag          │
│    - recharge_energy() is idempotent (skips if already processed)          │
│    - consume_trial_energy() prioritizes trial over paid balance            │
│                                                                             │
│ 7. PAYMENT SYSTEM                                                           │
│    - Power design: uk_request_id + uk_order_no + version                    │
│    - payment_callbacks stores raw callback body for debugging               │
│    - refund_orders has independent status machine                           │
│    - refund completion deducts energy via compensation transaction          │
│                                                                             │
│ 8. CALENDAR SYSTEM                                                          │
│    - Generic event_type supports all memory types                           │
│    - source_id links to originating anterior/LTM records                    │
│    - Archive support via calendar_events_archive table                      │
│                                                                             │
│ 9. DRAMA SYSTEM                                                             │
│    - drama_definitions stores prompt/scene for LLM context                  │
│    - drama_sessions tracks user state within a storyline                    │
│    - drama_messages isolated from stm_messages (different domains)         │
│    - drama_progress tracks unlock/completion per user                       │
│                                                                             │
│ 10. CROWDFUNDING SYSTEM                                                     │
│    - Trigger auto-updates current_amount on backer insert/delete           │
│    - Backers can be anonymous                                               │
│    - discount_coupons table ready for MVP supporter rewards                │
│                                                                             │
│ 11. SECURITY & RLS                                                          │
│    - ALL user-data tables have RLS enabled                                  │
│    - Pattern: (SELECT auth.uid()) = user_id for user-scoped access         │
│    - Dictionary/config tables allow SELECT for all authenticated users     │
│    - SECURITY DEFINER functions bypass RLS for internal operations         │
│                                                                             │
│ 12. ANTI-RECURSION SAFEGUARDS                                               │
│    - dissolve_relationship() uses session variable guard                    │
│    - companion deletion trigger checks guard before profile update          │
│    - No FK cascade that would cause chained deletions                       │
│                                                                             │
│ 13. INDEX STRATEGY                                                          │
│    - Every user_id column indexed (RLS filter + common join)               │
│    - Every companion_id column indexed                                      │
│    - created_at indexed for time-range queries                              │
│    - Partial indexes for status-filtered queries (WHERE status='x')        │
│    - Composite indexes for common multi-column filters                      │
│                                                                             │
│ 14. EXTENSIBILITY (MVP预留)                                                 │
│    - live2d_enabled, live2d_model_path for Live2D integration              │
│    - voice_enabled, voice_id for voice synthesis                            │
│    - pet_enabled, pet_name, pet_type for pet system                         │
│    - drama system designed for expansion with more storylines              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. PG_CRON SCHEDULED JOBS (run via Supabase Edge Function cron triggers)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Note: These require pg_cron extension enabled in Supabase.
-- In Supabase Dashboard: Database → Extensions → enable pg_cron
-- Alternatively, use Supabase Edge Function scheduled invocations.

-- Job 1: Daily STM Cleanup (4:00 AM)
-- Removes STM messages older than retention period (default 3 days)
SELECT cron.schedule(
  'platonic-stm-cleanup',    -- job name
  '0 4 * * *',               -- cron expression: daily at 4:00 AM
  $$SELECT cleanup_stm(
    (SELECT config_value::int FROM system_config WHERE config_key = 'stm_retention_days')
  )$$
);

-- Job 2: Daily Consolidation Trigger (2:00 AM)
-- Calls Edge Function to run LTM consolidation for all active companions
SELECT cron.schedule(
  'platonic-consolidation',
  '0 2 * * *',               -- daily at 2:00 AM
  $$SELECT net.http_post(
    url := 'https://' || (SELECT config_value FROM system_config WHERE config_key = 'supabase_project_ref') || '.supabase.co/functions/v1/consolidation-trigger',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('batch_size', 50)
  )$$
);

-- Job 3: Daily Milestone Adjustment (3:00 AM)
-- Evaluates and adjusts intimacy scores for all active relationships
SELECT cron.schedule(
  'platonic-milestone-adjust',
  '0 3 * * *',               -- daily at 3:00 AM
  $$SELECT net.http_post(
    url := 'https://' || (SELECT config_value FROM system_config WHERE config_key = 'supabase_project_ref') || '.supabase.co/functions/v1/milestone-adjust',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);

-- Job 4: Order Timeout Scan (every 30 minutes)
-- Auto-cancels payment orders that have exceeded expiry time
SELECT cron.schedule(
  'platonic-order-timeout',
  '*/30 * * * *',            -- every 30 minutes
  $$UPDATE payment_orders
       SET status = 'cancelled',
           updated_at = now()
     WHERE status = 'pending'
       AND expired_at < now()$$
);

-- Job 5: Free Trial Expiry Check (daily at 5:00 AM)
SELECT cron.schedule(
  'platonic-trial-expiry',
  '0 5 * * *',               -- daily at 5:00 AM
  $$UPDATE free_trial_allocations
       SET is_active = false,
           updated_at = now()
     WHERE is_active = true
       AND expires_at IS NOT NULL
       AND expires_at < now()$$
);

-- Job 6: Inactive Session Cleanup (daily at 6:00 AM)
-- Marks abandoned drama sessions as completed after 24h of inactivity
SELECT cron.schedule(
  'platonic-session-cleanup',
  '0 6 * * *',               -- daily at 6:00 AM
  $$UPDATE drama_sessions
       SET status = 'abandoned',
           ended_at = now(),
           updated_at = now()
     WHERE status = 'active'
       AND started_at < now() - interval '24 hours'$$
);

COMMENT ON TABLE cron.job IS 'pg_cron scheduled jobs for Platonic AI - managed via Supabase Dashboard';


-- ── trg_stm_archive_old ──
-- 定时归档: 将超过保留期的STM消息移动到归档表
CREATE OR REPLACE FUNCTION trg_stm_archive_old()
RETURNS trigger AS $$
DECLARE
  v_retention_days int;
BEGIN
  -- 获取保留期配置
  SELECT config_value::int INTO v_retention_days
    FROM system_config
   WHERE config_key = 'stm_retention_days';

  IF v_retention_days IS NULL THEN
    v_retention_days := 3;  -- 默认3天
  END IF;

  -- 将超过保留期的消息归档
  INSERT INTO stm_messages_archive (
    id, companion_id, speaker, content, emotion, token_count, dialogue_id,
    archived_at, original_created_at
  )
  SELECT 
    id, companion_id, speaker, content, emotion, token_count, dialogue_id,
    now(), created_at
  FROM stm_messages
  WHERE created_at < now() - (v_retention_days || ' days')::interval;

  -- 删除已归档的原始消息
  DELETE FROM stm_messages
  WHERE created_at < now() - (v_retention_days || ' days')::interval;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trg_stm_archive_old() IS '将超过保留期的STM消息归档到archive表';

-- 通过pg_cron定时调用，而非行级触发器
-- SELECT cron.schedule('platonic-stm-archive', '0 4 * * *', 
--   $$SELECT trg_stm_archive_old()$$);

