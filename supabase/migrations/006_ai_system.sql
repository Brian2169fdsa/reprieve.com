-- Migration 006: AI System
-- Agent runs, suggestions, audit readiness scores

CREATE TYPE public.agent_name AS ENUM (
  'policy_guardian', 'compliance_monitor', 'evidence_librarian', 'qm_orchestrator'
);

CREATE TYPE public.suggestion_status AS ENUM (
  'pending', 'accepted', 'rejected', 'modified'
);

CREATE TABLE public.ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent agent_name NOT NULL,
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

CREATE TABLE public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES public.ai_agent_runs(id),
  agent agent_name NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_changes JSONB,
  confidence NUMERIC(3,2),
  status suggestion_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.audit_readiness_scores (
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

-- Indexes
CREATE INDEX idx_agent_runs_org ON public.ai_agent_runs(org_id);
CREATE INDEX idx_suggestions_org ON public.ai_suggestions(org_id);
CREATE INDEX idx_suggestions_status ON public.ai_suggestions(org_id, status);
CREATE INDEX idx_readiness_scores_org ON public.audit_readiness_scores(org_id, period);

-- RLS
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_readiness_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.ai_agent_runs FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "org_isolation" ON public.ai_suggestions FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "org_isolation" ON public.audit_readiness_scores FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
