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
  elapsed_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_instance ON sessions(interview_instance_id);

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
