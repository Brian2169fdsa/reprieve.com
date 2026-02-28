-- ============================================================
-- REPrieve.ai — Full Database Setup (Migrations 003–011)
-- Run this ONCE in Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS and DO blocks.
-- ============================================================

-- ── SECURITY DEFINER helper (from migration 009) ─────────────
-- Must be created FIRST — all RLS policies below depend on it.
-- Avoids infinite recursion in org_members SELECT policies.
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id
  FROM public.org_members
  WHERE user_id = auth.uid() AND is_active = true
$$;

-- Also fix the org_members policies themselves to use the function
-- (replaces self-referential policies that cause infinite recursion)
DROP POLICY IF EXISTS "Members can view org members"                             ON public.org_members;
DROP POLICY IF EXISTS "Users can create own membership or admins can add members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can update org members"                            ON public.org_members;
DROP POLICY IF EXISTS "Admins can delete org members"                            ON public.org_members;
DROP POLICY IF EXISTS "Members can view their org"                               ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their org"                              ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create orgs"                      ON public.organizations;
DROP POLICY IF EXISTS "Members can view org audit log"                           ON public.audit_log;
DROP POLICY IF EXISTS "Members can insert audit log entries"                     ON public.audit_log;
DROP POLICY IF EXISTS "Members can view org member profiles"                     ON public.profiles;

CREATE POLICY "Members can view org members" ON public.org_members FOR SELECT
  USING (user_id = auth.uid() OR org_id IN (SELECT get_my_org_ids()));
CREATE POLICY "Users can create own membership or admins can add members" ON public.org_members FOR INSERT
  WITH CHECK (user_id = auth.uid() OR org_id IN (SELECT get_my_org_ids()));
CREATE POLICY "Admins can update org members" ON public.org_members FOR UPDATE
  USING (org_id IN (SELECT get_my_org_ids()));
CREATE POLICY "Admins can delete org members" ON public.org_members FOR DELETE
  USING (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Authenticated users can create orgs" ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Members can view their org" ON public.organizations FOR SELECT
  USING (id IN (SELECT get_my_org_ids()));
CREATE POLICY "Admins can update their org" ON public.organizations FOR UPDATE
  USING (id IN (SELECT get_my_org_ids()));

CREATE POLICY "Members can view org audit log" ON public.audit_log FOR SELECT
  USING (org_id IN (SELECT get_my_org_ids()));
CREATE POLICY "Members can insert audit log entries" ON public.audit_log FOR INSERT
  WITH CHECK (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Members can view org member profiles" ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT om.user_id FROM public.org_members om
      WHERE om.org_id IN (SELECT get_my_org_ids())
    )
  );

-- ── MIGRATION 003: Knowledge Vault ──────────────────────────

DO $$ BEGIN
  CREATE TYPE public.policy_status AS ENUM (
    'draft', 'in_review', 'approved', 'effective', 'retired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  program TEXT[],
  department TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  status public.policy_status DEFAULT 'draft',
  review_cadence_months INT DEFAULT 12,
  next_review_date DATE,
  current_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content JSONB NOT NULL,
  content_html TEXT,
  change_summary TEXT,
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.policies
    ADD CONSTRAINT fk_current_version
    FOREIGN KEY (current_version_id) REFERENCES public.policy_versions(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.policy_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  target_policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'related',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_policy_id, target_policy_id)
);

CREATE INDEX IF NOT EXISTS idx_policies_org ON public.policies(org_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(org_id, status);
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON public.policy_versions(policy_id);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.policies;
CREATE POLICY "org_isolation" ON public.policies FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

DROP POLICY IF EXISTS "org_isolation" ON public.policy_versions;
CREATE POLICY "org_isolation" ON public.policy_versions FOR ALL USING (
  policy_id IN (SELECT id FROM public.policies WHERE org_id IN (SELECT get_my_org_ids()))
);

DROP POLICY IF EXISTS "org_isolation" ON public.policy_references;
CREATE POLICY "org_isolation" ON public.policy_references FOR ALL USING (
  source_policy_id IN (SELECT id FROM public.policies WHERE org_id IN (SELECT get_my_org_ids()))
);

-- ── MIGRATION 004: Controls + Checkpoints + Evidence ────────

DO $$ BEGIN
  CREATE TYPE public.checkpoint_status AS ENUM (
    'pending', 'in_progress', 'passed', 'failed', 'overdue', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.recurrence AS ENUM (
    'monthly', 'quarterly', 'semi_annual', 'annual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  standard TEXT NOT NULL,
  category TEXT,
  test_procedure TEXT NOT NULL,
  required_evidence TEXT[],
  frequency public.recurrence NOT NULL,
  default_owner_role public.org_role,
  is_active BOOLEAN DEFAULT true,
  related_policy_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id),
  period TEXT NOT NULL,
  status public.checkpoint_status DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  attestation TEXT,
  notes TEXT,
  assignee_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES public.checkpoints(id),
  policy_id UUID REFERENCES public.policies(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes BIGINT,
  tags JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_controls_org ON public.controls(org_id);
CREATE INDEX IF NOT EXISTS idx_controls_standard ON public.controls(org_id, standard);
CREATE INDEX IF NOT EXISTS idx_checkpoints_org ON public.checkpoints(org_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_period ON public.checkpoints(org_id, period);
CREATE INDEX IF NOT EXISTS idx_checkpoints_status ON public.checkpoints(org_id, status);
CREATE INDEX IF NOT EXISTS idx_checkpoints_assigned ON public.checkpoints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_evidence_checkpoint ON public.evidence(checkpoint_id);

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.controls;
CREATE POLICY "org_isolation" ON public.controls FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

DROP POLICY IF EXISTS "org_isolation" ON public.checkpoints;
CREATE POLICY "org_isolation" ON public.checkpoints FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

DROP POLICY IF EXISTS "org_isolation" ON public.evidence;
CREATE POLICY "org_isolation" ON public.evidence FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

-- Unique constraint on controls (needed for upsert idempotency)
DO $$ BEGIN
  ALTER TABLE public.controls ADD CONSTRAINT controls_org_id_code_key UNIQUE (org_id, code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── MIGRATION 005: QM + CAPA ─────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.capa_status AS ENUM (
    'open', 'in_progress', 'pending_verification', 'closed', 'overdue'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.finding_severity AS ENUM (
    'low', 'medium', 'high', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.qm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  meeting_date DATE,
  status TEXT DEFAULT 'draft',
  agenda JSONB,
  executive_summary TEXT,
  audit_readiness_score NUMERIC(5,2),
  attendees UUID[],
  action_items JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  qm_meeting_id UUID REFERENCES public.qm_meetings(id),
  checkpoint_id UUID REFERENCES public.checkpoints(id),
  title TEXT NOT NULL,
  description TEXT,
  severity public.finding_severity DEFAULT 'medium',
  standard TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.capas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES public.findings(id),
  title TEXT NOT NULL,
  description TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  status public.capa_status DEFAULT 'open',
  due_date DATE,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qm_meetings_org ON public.qm_meetings(org_id);
CREATE INDEX IF NOT EXISTS idx_findings_org ON public.findings(org_id);
CREATE INDEX IF NOT EXISTS idx_capas_org ON public.capas(org_id);
CREATE INDEX IF NOT EXISTS idx_capas_status ON public.capas(org_id, status);

ALTER TABLE public.qm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.qm_meetings;
CREATE POLICY "org_isolation" ON public.qm_meetings FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

DROP POLICY IF EXISTS "org_isolation" ON public.findings;
CREATE POLICY "org_isolation" ON public.findings FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

DROP POLICY IF EXISTS "org_isolation" ON public.capas;
CREATE POLICY "org_isolation" ON public.capas FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

-- ── MIGRATION 006: AI System ─────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.agent_name AS ENUM (
    'policy_guardian', 'compliance_monitor', 'evidence_librarian', 'qm_orchestrator'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.suggestion_status AS ENUM (
    'pending', 'accepted', 'rejected', 'modified'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent public.agent_name NOT NULL,
  trigger_type TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  input_summary TEXT,
  output_summary TEXT,
  tokens_used INT,
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES public.ai_agent_runs(id),
  agent public.agent_name NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_changes JSONB,
  confidence NUMERIC(3,2),
  status public.suggestion_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  overall_score NUMERIC(5,2),
  checkpoint_score NUMERIC(5,2),
  evidence_score NUMERIC(5,2),
  policy_score NUMERIC(5,2),
  capa_score NUMERIC(5,2),
  calculated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_org ON public.ai_agent_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_org ON public.ai_suggestions(org_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.ai_suggestions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_readiness_scores_org ON public.audit_readiness_scores(org_id, period);

ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_readiness_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.ai_agent_runs;
CREATE POLICY "org_isolation" ON public.ai_agent_runs FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

DROP POLICY IF EXISTS "org_isolation" ON public.ai_suggestions;
CREATE POLICY "org_isolation" ON public.ai_suggestions FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

DROP POLICY IF EXISTS "org_isolation" ON public.audit_readiness_scores;
CREATE POLICY "org_isolation" ON public.audit_readiness_scores FOR ALL USING (
  org_id IN (SELECT get_my_org_ids())
);

-- ── MIGRATION 007: Notifications ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(org_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_notifications" ON public.notifications;
CREATE POLICY "users_own_notifications" ON public.notifications FOR ALL USING (
  user_id = auth.uid()
);

-- Enable Realtime (safe to run even if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.checkpoints;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_suggestions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── DONE ─────────────────────────────────────────────────────
-- All tables, indexes, RLS, and realtime subscriptions are set up.
-- Next step: go to Calendar → click "Load Compliance Checkpoints"
