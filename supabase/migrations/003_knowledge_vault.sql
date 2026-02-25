-- Migration 003: Knowledge Vault
-- Policies, versions, approvals, cross-references

CREATE TYPE public.policy_status AS ENUM (
  'draft', 'in_review', 'approved', 'effective', 'retired'
);

CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  program TEXT[],
  department TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  status policy_status DEFAULT 'draft',
  review_cadence_months INT DEFAULT 12,
  next_review_date DATE,
  current_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.policy_versions (
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

-- Add FK after both tables exist
ALTER TABLE public.policies
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES public.policy_versions(id);

CREATE TABLE public.policy_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  target_policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'related',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_policy_id, target_policy_id)
);

-- Indexes
CREATE INDEX idx_policies_org ON public.policies(org_id);
CREATE INDEX idx_policies_status ON public.policies(org_id, status);
CREATE INDEX idx_policy_versions_policy ON public.policy_versions(policy_id);

-- RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.policies FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "org_isolation" ON public.policy_versions FOR ALL USING (
  policy_id IN (SELECT id FROM public.policies WHERE org_id IN (
    SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true
  ))
);

CREATE POLICY "org_isolation" ON public.policy_references FOR ALL USING (
  source_policy_id IN (SELECT id FROM public.policies WHERE org_id IN (
    SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true
  ))
);
