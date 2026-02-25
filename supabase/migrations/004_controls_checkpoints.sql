-- Migration 004: Controls + Checkpoints + Evidence
-- The compliance automation engine

CREATE TYPE public.checkpoint_status AS ENUM (
  'pending', 'in_progress', 'passed', 'failed', 'overdue', 'skipped'
);

CREATE TYPE public.recurrence AS ENUM (
  'monthly', 'quarterly', 'semi_annual', 'annual'
);

CREATE TABLE public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  standard TEXT NOT NULL,
  category TEXT,
  test_procedure TEXT NOT NULL,
  required_evidence TEXT[],
  frequency recurrence NOT NULL,
  default_owner_role org_role,
  is_active BOOLEAN DEFAULT true,
  related_policy_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id),
  period TEXT NOT NULL,
  status checkpoint_status DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  attestation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.evidence (
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

-- Indexes
CREATE INDEX idx_controls_org ON public.controls(org_id);
CREATE INDEX idx_controls_standard ON public.controls(org_id, standard);
CREATE INDEX idx_checkpoints_org ON public.checkpoints(org_id);
CREATE INDEX idx_checkpoints_period ON public.checkpoints(org_id, period);
CREATE INDEX idx_checkpoints_status ON public.checkpoints(org_id, status);
CREATE INDEX idx_checkpoints_assigned ON public.checkpoints(assigned_to);
CREATE INDEX idx_evidence_checkpoint ON public.evidence(checkpoint_id);

-- RLS
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.controls FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "org_isolation" ON public.checkpoints FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "org_isolation" ON public.evidence FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
