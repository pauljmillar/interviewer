-- Run this in the Supabase SQL Editor to create tables for the AI Interviewer app.
-- Multi-tenant: org_id scopes data to Clerk Organizations. Standard templates use org_id NULL.

-- Positions (job openings or biography projects)
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('job', 'biography', 'screening')),
  template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_positions_org ON positions(org_id);

-- Custom interview templates (org_id NULL = standard/shared; non-null = org-specific)
CREATE TABLE IF NOT EXISTS interview_templates (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  name TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  intro TEXT,
  conclusion TEXT,
  reminder TEXT,
  tts_voice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_templates_org ON interview_templates(org_id);

-- Interview instances (one per candidate/person)
CREATE TABLE IF NOT EXISTS interview_instances (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  template_id TEXT,
  position_id TEXT,
  recipient_name TEXT,
  shareable_token TEXT UNIQUE,
  questions JSONB NOT NULL DEFAULT '[]',
  intro TEXT,
  conclusion TEXT,
  reminder TEXT,
  tts_voice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_instances_org ON interview_instances(org_id);
CREATE INDEX IF NOT EXISTS idx_instances_position ON interview_instances(position_id);
CREATE INDEX IF NOT EXISTS idx_instances_token ON interview_instances(shareable_token);

-- Sessions (one sitting per instance)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  interview_instance_id TEXT NOT NULL REFERENCES interview_instances(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  messages JSONB NOT NULL DEFAULT '[]',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  covered_sub_topics JSONB NOT NULL DEFAULT '[]',
  current_question_word_count INTEGER NOT NULL DEFAULT 0,
  user_replies_for_current_question INTEGER NOT NULL DEFAULT 0,
  discovery_context JSONB NOT NULL DEFAULT '{"entities":[],"timeline":[],"entitySchemas":[]}',
  all_questions_covered BOOLEAN NOT NULL DEFAULT false,
  reminder_already_shown BOOLEAN NOT NULL DEFAULT false,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  recording_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_instance ON sessions(interview_instance_id);

-- Migration for recording_key (run once if sessions already existed):
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recording_key TEXT;

-- Migration for existing databases (run once if tables already existed without org_id):
-- ALTER TABLE positions ADD COLUMN IF NOT EXISTS org_id TEXT;
-- ALTER TABLE interview_templates ADD COLUMN IF NOT EXISTS org_id TEXT;
-- ALTER TABLE interview_instances ADD COLUMN IF NOT EXISTS org_id TEXT;
-- Backfill org_id with default '1':
-- UPDATE positions SET org_id = '1' WHERE org_id IS NULL;
-- UPDATE interview_templates SET org_id = '1' WHERE org_id IS NULL;
-- UPDATE interview_instances SET org_id = '1' WHERE org_id IS NULL;
-- Then:
-- ALTER TABLE positions ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE interview_instances ALTER COLUMN org_id SET NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_positions_org ON positions(org_id);
-- CREATE INDEX IF NOT EXISTS idx_templates_org ON interview_templates(org_id);
-- CREATE INDEX IF NOT EXISTS idx_instances_org ON interview_instances(org_id);
-- Migration for tts_voice (run if tables existed before voice was added):
-- ALTER TABLE interview_templates ADD COLUMN IF NOT EXISTS tts_voice TEXT;
-- ALTER TABLE interview_instances ADD COLUMN IF NOT EXISTS tts_voice TEXT;

-- Per-candidate AI scores for a position
CREATE TABLE IF NOT EXISTS candidate_scores (
  id            TEXT PRIMARY KEY,
  position_id   TEXT NOT NULL,
  instance_id   TEXT NOT NULL UNIQUE,
  org_id        TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  question_scores JSONB NOT NULL DEFAULT '[]',
  notes         TEXT,
  analyzed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scores_position ON candidate_scores(position_id);
CREATE INDEX IF NOT EXISTS idx_scores_instance ON candidate_scores(instance_id);

-- Per-position scoring prompt (Settings)
CREATE TABLE IF NOT EXISTS position_analysis_settings (
  position_id   TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  scoring_prompt TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content pipeline config (editable via /admin/content-config)
-- create table content_config (
--   id         integer primary key default 1,
--   content    text not null,
--   updated_at timestamptz not null default now(),
--   constraint single_row check (id = 1)
-- );

-- Email template columns for org_settings (run once if table already exists):
-- ALTER TABLE org_settings ADD COLUMN email_template_id INTEGER;
-- ALTER TABLE org_settings ADD COLUMN email_subject TEXT;
-- ALTER TABLE org_settings ADD COLUMN email_html_template TEXT;

-- Billing: interview activation tracking (run once):
-- ALTER TABLE interview_instances ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
-- CREATE INDEX IF NOT EXISTS idx_instances_activated ON interview_instances(org_id, activated_at) WHERE activated_at IS NOT NULL;

-- Billing: org plan and Stripe fields (run once):
-- ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
-- ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
-- ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
-- ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
-- ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS interviews_included INTEGER;
-- ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
-- ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS payg_payment_method_id TEXT;

-- Campaign outbound email tracking (for Cowork integration)
-- CREATE TABLE campaign_contacts (
--   id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
--   uid               TEXT UNIQUE NOT NULL,
--   email             TEXT NOT NULL,
--   name              TEXT NOT NULL,
--   sent_at           TIMESTAMPTZ,
--   brevo_message_id  TEXT,
--   demo_clicked      BOOLEAN NOT NULL DEFAULT false,
--   demo_clicked_at   TIMESTAMPTZ,
--   created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
-- CREATE INDEX idx_campaign_contacts_uid ON campaign_contacts(uid);
