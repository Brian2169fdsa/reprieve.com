-- Migration 005: QM + CAPA
-- Quality Management meetings, findings, corrective actions

CREATE TYPE public.capa_status AS ENUM (
  'open', 'in_progress', 'pending_verification', 'closed', 'overdue'
);

CREATE TYPE public.finding_severity AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TABLE public.qm_meetings (
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

CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  qm_meeting_id UUID REFERENCES public.qm_meetings(id),
  checkpoint_id UUID REFERENCES public.checkpoints(id),
  title TEXT NOT NULL,
  description TEXT,
  severity finding_severity DEFAULT 'medium',
  standard TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.capas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES public.findings(id),
  title TEXT NOT NULL,
  description TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  status capa_status DEFAULT 'open',
  due_date DATE,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_qm_meetings_org ON public.qm_meetings(org_id);
CREATE INDEX idx_findings_org ON public.findings(org_id);
CREATE INDEX idx_capas_org ON public.capas(org_id);
CREATE INDEX idx_capas_status ON public.capas(org_id, status);

-- RLS
ALTER TABLE public.qm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.qm_meetings FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "org_isolation" ON public.findings FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "org_isolation" ON public.capas FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
