# CLAUDE.md — REPrieve.ai™ Compliance Operating System

## What This Is

REPrieve.ai is a membership-based Compliance + Quality Management Operating System for Arizona behavioral health organizations running IOP and Residential programs. Staff sign up, get assigned a role, and work inside a secure portal that turns compliance from "documents on a drive" into a living, automated program powered by an agentic AI team.

**One-liner:** A membership portal that runs compliance and quality management like an operating system — powered by an agentic AI team that automates monthly checkpoints, maintains policies, and builds audit-ready proof.

---

## Tech Stack (Final Decisions)

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | SSR + API routes + Edge Functions |
| Language | **TypeScript (strict)** | End-to-end type safety |
| UI | **shadcn/ui + Tailwind CSS** | Matches Cholla demo design system |
| Fonts | **Source Sans 3** (body) + **Source Serif 4** (headings) | Brand identity from demo |
| Database | **Supabase (PostgreSQL)** | Auth, RLS, Realtime, Storage, pg_cron, Edge Functions |
| Multi-Tenant RBAC | **`point-source/supabase-tenant-rbac`** Postgres extension | Per-org role resolution at DB level, not JWT-cached |
| Rich Text Editor | **Tiptap** via `ndtrung341/next-tiptap` | Policy editor with tables, track changes, AI highlights |
| Agentic AI | **`@openai/agents`** + Vercel AI SDK adapter → **Claude (Anthropic)** | Agent orchestration from OpenAI SDK, inference from Claude |
| File Storage | **Supabase Storage** | Org-scoped buckets for evidence isolation |
| PDF Export | **`@react-pdf/renderer`** | Server-side QM packet and audit binder generation |
| Scheduling | **Supabase pg_cron + pg_net** | Cron triggers for agent runs |
| Realtime | **Supabase Realtime** | Live notifications, dashboard refresh, AI suggestion feed |
| Payments (future) | **Stripe** | From SaaS starter kit scaffold |
| Deployment | **Vercel** (frontend) + **Supabase** (backend) | |

---

## Design System (from Cholla Demo)

```css
/* Core palette — use these exact values */
--blue: #3BA7C9;
--blue-light: #E8F6FA;
--blue-dark: #2A8BA8;
--blue-bg: #F0F9FC;
--rust: #C05A2C;
--rust-light: #FDF0EB;
--rust-dark: #9E4520;

/* Neutrals */
--g50: #FAFAFA;  --g100: #F5F5F5;  --g200: #E8E8E8;
--g300: #D4D4D4; --g400: #A3A3A3;  --g500: #737373;
--g600: #525252;  --g700: #404040;  --g800: #262626;
--g900: #171717;

/* Status */
--green: #16A34A;  --green-light: #F0FDF4;
--yellow: #D97706; --yellow-light: #FFFBEB;
--red: #DC2626;    --red-light: #FEF2F2;

/* Radii & shadows */
--radius: 6px;
--radius-lg: 10px;
--shadow: 0 1px 3px rgba(0,0,0,0.08);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
```

**Layout structure:**
- Top header bar: `52px`, `--blue-dark` background, `3px --rust` bottom border
- Left sidebar: `200px` width, white background, `1px --g200` right border
- Right aside (dashboard only): `240px`, `--g50` background
- Main content: fluid center

**Typography:**
- Headings: `Source Serif 4`, semi-bold/bold
- Body/UI: `Source Sans 3`, 400/500/600/700
- Monospace for codes/IDs: system monospace

---

## Project Structure

```
reprieve/
├── CLAUDE.md                          # THIS FILE
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.local                         # Supabase + Anthropic keys
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 001_tenant_rbac.sql        # Multi-tenant RBAC extension
│       ├── 002_core_schema.sql        # Orgs, profiles, roles
│       ├── 003_knowledge_vault.sql    # Policies, versions, approvals
│       ├── 004_controls_checkpoints.sql # Controls, checkpoints, evidence
│       ├── 005_qm_capa.sql           # QM meetings, CAPAs, findings
│       ├── 006_ai_system.sql          # Agent runs, suggestions, scores
│       ├── 007_notifications.sql      # Notifications + audit log
│       └── 008_rls_policies.sql       # Row-level security for all tables
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with fonts + providers
│   │   ├── page.tsx                   # Landing / marketing (future)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx             # Split-panel auth layout (from demo)
│   │   └── (portal)/
│   │       ├── layout.tsx             # Authenticated shell: header + sidebar + aside
│   │       ├── dashboard/page.tsx     # Home dashboard
│   │       ├── calendar/page.tsx      # Checkpoint calendar
│   │       ├── controls/
│   │       │   ├── page.tsx           # Control library list
│   │       │   └── [id]/page.tsx      # Control detail
│   │       ├── checkpoints/
│   │       │   └── [id]/page.tsx      # Checkpoint detail + evidence upload + attestation
│   │       ├── vault/
│   │       │   ├── page.tsx           # Policy library (browse, search, filter)
│   │       │   └── [id]/
│   │       │       ├── page.tsx       # Policy viewer with version history
│   │       │       └── edit/page.tsx  # Tiptap policy editor
│   │       ├── evidence/page.tsx      # Evidence library / audit binder view
│   │       ├── approvals/page.tsx     # Pending approvals queue
│   │       ├── qm/
│   │       │   ├── page.tsx           # QM workbench (tabs: checklist, exec summary, findings, CAPAs)
│   │       │   └── meetings/[id]/page.tsx
│   │       ├── capa/
│   │       │   ├── page.tsx           # CAPA list
│   │       │   └── [id]/page.tsx      # CAPA detail + verification
│   │       ├── ai/page.tsx            # AI agent activity feed
│   │       ├── suggestions/page.tsx   # AI suggestions with accept/reject
│   │       ├── reports/page.tsx       # Report generation + downloads
│   │       └── settings/
│   │           ├── page.tsx           # Org settings
│   │           ├── members/page.tsx   # User management + invites
│   │           └── roles/page.tsx     # Role permissions
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── header.tsx             # Top nav bar
│   │   │   ├── sidebar.tsx            # Left sidebar nav
│   │   │   ├── right-aside.tsx        # Compliance summary panel
│   │   │   └── nav-items.ts           # Sidebar menu config
│   │   ├── dashboard/
│   │   │   ├── stats-grid.tsx         # Top-line metric cards
│   │   │   ├── upcoming-tasks.tsx     # Next due checkpoints
│   │   │   ├── ai-activity-feed.tsx   # Recent agent actions
│   │   │   └── audit-readiness.tsx    # Score gauge
│   │   ├── calendar/
│   │   │   ├── checkpoint-calendar.tsx
│   │   │   └── calendar-event.tsx
│   │   ├── checkpoints/
│   │   │   ├── checkpoint-card.tsx
│   │   │   ├── checkpoint-modal.tsx   # Detail + evidence + attestation
│   │   │   └── evidence-uploader.tsx
│   │   ├── vault/
│   │   │   ├── policy-list.tsx
│   │   │   ├── policy-editor.tsx      # Tiptap wrapper
│   │   │   ├── version-history.tsx
│   │   │   └── approval-workflow.tsx
│   │   ├── qm/
│   │   │   ├── qm-tabs.tsx
│   │   │   ├── meeting-checklist.tsx
│   │   │   ├── executive-summary.tsx
│   │   │   ├── findings-grid.tsx
│   │   │   └── capa-list.tsx
│   │   └── ai/
│   │       ├── suggestion-card.tsx    # Accept / reject / modify
│   │       ├── agent-run-log.tsx
│   │       └── ai-insight-badge.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser client
│   │   │   ├── server.ts              # Server client
│   │   │   ├── middleware.ts           # Auth middleware
│   │   │   └── storage.ts             # Evidence upload helpers
│   │   ├── agents/
│   │   │   ├── policy-guardian.ts
│   │   │   ├── compliance-monitor.ts
│   │   │   ├── evidence-librarian.ts
│   │   │   ├── qm-orchestrator.ts
│   │   │   └── tools/                 # Shared agent tool definitions
│   │   │       ├── policy-tools.ts
│   │   │       ├── checkpoint-tools.ts
│   │   │       ├── evidence-tools.ts
│   │   │       ├── notification-tools.ts
│   │   │       └── scoring-tools.ts
│   │   ├── types/
│   │   │   └── index.ts              # All TypeScript types/interfaces
│   │   └── utils/
│   │       ├── audit-readiness.ts     # Score calculation
│   │       ├── date-helpers.ts
│   │       └── permissions.ts         # Role-based access helpers
│   │
│   └── hooks/
│       ├── use-org.ts                 # Current org context
│       ├── use-role.ts                # Current user role
│       ├── use-realtime.ts            # Supabase realtime subscriptions
│       └── use-checkpoints.ts         # Checkpoint data hooks
│
└── supabase/functions/                # Edge Functions (agent triggers)
    ├── compliance-monitor/index.ts    # Monthly checkpoint generation
    ├── evidence-librarian/index.ts    # Weekly missing-evidence scan
    ├── qm-orchestrator/index.ts       # Pre-meeting packet assembly
    ├── policy-guardian/index.ts       # Policy review + conflict detection
    └── daily-overdue/index.ts         # Overdue detection + escalation
```

---

## Database Schema

### Migration 001: Multi-Tenant RBAC

Install `point-source/supabase-tenant-rbac` extension. This gives us:
- `tenants` table (our orgs)
- `tenant_members` with role assignment
- `db_pre_request` hook that populates request context with org + role
- RLS policies that reference org membership natively

### Migration 002: Core Schema

```sql
-- Extend the RBAC tenant as our org
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles linked to Supabase Auth
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Org membership with role
CREATE TYPE public.org_role AS ENUM (
  'admin', 'compliance', 'clinical', 'ops',
  'hr', 'billing', 'supervisor', 'executive'
);

CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'clinical',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Audit log (append-only, system-write-only)
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,           -- e.g. 'checkpoint.complete', 'policy.approve'
  entity_type TEXT NOT NULL,      -- e.g. 'checkpoint', 'policy', 'evidence'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration 003: Knowledge Vault

```sql
CREATE TYPE public.policy_status AS ENUM (
  'draft', 'in_review', 'approved', 'effective', 'retired'
);

CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT NOT NULL,                    -- e.g. 'POL-HIPAA-001'
  category TEXT NOT NULL,                -- e.g. 'HIPAA', 'Safety', 'HR'
  program TEXT[],                        -- ['IOP', 'Residential']
  department TEXT,
  owner_id UUID REFERENCES profiles(id),
  status policy_status DEFAULT 'draft',
  review_cadence_months INT DEFAULT 12,
  next_review_date DATE,
  current_version_id UUID,               -- FK to policy_versions
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content JSONB NOT NULL,                -- Tiptap JSON document
  content_html TEXT,                     -- Rendered HTML for display
  change_summary TEXT,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cross-references between policies
CREATE TABLE public.policy_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  target_policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'related',   -- 'related', 'supersedes', 'supplements'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_policy_id, target_policy_id)
);
```

### Migration 004: Controls + Checkpoints

```sql
CREATE TYPE public.checkpoint_status AS ENUM (
  'pending', 'in_progress', 'passed', 'failed', 'overdue', 'skipped'
);

CREATE TYPE public.recurrence AS ENUM (
  'monthly', 'quarterly', 'semi_annual', 'annual'
);

-- Control = a compliance requirement definition
CREATE TABLE public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                    -- e.g. 'OIG-SCR-001'
  title TEXT NOT NULL,
  description TEXT,
  standard TEXT NOT NULL,                -- 'OIG', 'HIPAA', 'AHCCCS', 'TJC', 'CARF', 'Safety', 'Internal'
  category TEXT,
  test_procedure TEXT NOT NULL,          -- What to do
  required_evidence TEXT[],              -- What proof is needed
  frequency recurrence NOT NULL,
  default_owner_role org_role,
  is_active BOOLEAN DEFAULT true,
  related_policy_ids UUID[],            -- Links to policies
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checkpoint = a specific instance of a control for a period
CREATE TABLE public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES controls(id),
  period TEXT NOT NULL,                  -- '2026-02', '2026-Q1'
  status checkpoint_status DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  attestation TEXT,                      -- 'pass' or 'fail'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Evidence objects attached to checkpoints
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES checkpoints(id),
  policy_id UUID REFERENCES policies(id),
  file_path TEXT NOT NULL,               -- Supabase Storage path
  file_name TEXT NOT NULL,
  file_type TEXT,                        -- 'pdf', 'image', 'video', 'document'
  file_size_bytes BIGINT,
  tags JSONB DEFAULT '{}',               -- { standard, program, period, department }
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration 005: QM + CAPA

```sql
CREATE TYPE public.capa_status AS ENUM (
  'open', 'in_progress', 'pending_verification', 'closed', 'overdue'
);

CREATE TYPE public.finding_severity AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TABLE public.qm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL,                  -- '2026-02'
  meeting_date DATE,
  status TEXT DEFAULT 'draft',           -- 'draft', 'ready', 'completed'
  agenda JSONB,                          -- Generated by QM Orchestrator
  executive_summary TEXT,                -- AI-generated
  audit_readiness_score NUMERIC(5,2),
  attendees UUID[],
  action_items JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  qm_meeting_id UUID REFERENCES qm_meetings(id),
  checkpoint_id UUID REFERENCES checkpoints(id),
  title TEXT NOT NULL,
  description TEXT,
  severity finding_severity DEFAULT 'medium',
  standard TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.capas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES findings(id),
  title TEXT NOT NULL,
  description TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  owner_id UUID REFERENCES profiles(id),
  status capa_status DEFAULT 'open',
  due_date DATE,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration 006: AI System

```sql
CREATE TYPE public.agent_name AS ENUM (
  'policy_guardian', 'compliance_monitor', 'evidence_librarian', 'qm_orchestrator'
);

CREATE TYPE public.suggestion_status AS ENUM (
  'pending', 'accepted', 'rejected', 'modified'
);

CREATE TABLE public.ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent agent_name NOT NULL,
  trigger_type TEXT NOT NULL,            -- 'scheduled', 'manual', 'event'
  status TEXT DEFAULT 'running',         -- 'running', 'completed', 'failed'
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
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES ai_agent_runs(id),
  agent agent_name NOT NULL,
  entity_type TEXT NOT NULL,             -- 'policy', 'control', 'checkpoint', 'capa'
  entity_id UUID,
  suggestion_type TEXT NOT NULL,         -- 'edit', 'create', 'flag', 'review'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_changes JSONB,               -- Structured diff/changes
  confidence NUMERIC(3,2),               -- 0.00 to 1.00
  status suggestion_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Composite audit readiness score history
CREATE TABLE public.audit_readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  overall_score NUMERIC(5,2),
  checkpoint_score NUMERIC(5,2),         -- % checkpoints completed on time
  evidence_score NUMERIC(5,2),           -- % checkpoints with required evidence
  policy_score NUMERIC(5,2),             -- % policies current + effective
  capa_score NUMERIC(5,2),               -- % CAPAs closed on time
  calculated_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration 007: Notifications

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,                    -- 'checkpoint_due', 'overdue', 'suggestion', 'approval_needed', 'capa_due'
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration 008: RLS Policies

All tables get RLS enabled. Core pattern:
```sql
-- Users can only see data for orgs they belong to
CREATE POLICY "org_isolation" ON public.checkpoints
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

Role-based restrictions layered on top:
- `admin`: full CRUD on all org data
- `compliance`: full CRUD on controls, checkpoints, policies, evidence, CAPAs
- `clinical`: read controls/policies, write own checkpoints + evidence
- `ops` / `hr` / `billing`: read + write own assigned checkpoints
- `supervisor`: read all, write own checkpoints, approve suggestions
- `executive`: read all, read-only dashboards + reports

---

## Agentic AI Architecture

### Framework: `@openai/agents` + Anthropic Claude

Each agent is defined using `@openai/agents` SDK but routes inference to Claude via Vercel AI SDK adapter. Agents are deployed as **Supabase Edge Functions** triggered by **pg_cron**.

```typescript
// Pattern for all agents
import { Agent, run, tool } from '@openai/agents';
import { createAISDKModel } from '@openai/agents-extensions/ai-sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const model = createAISDKModel(anthropic('claude-sonnet-4-5-20250929'));
```

### Agent Definitions

#### A) Policy Guardian
**Trigger:** Weekly scheduled + on policy save events
**Instructions:** Review policies for conflicts, redundancy, missing sections, inconsistent terminology. Suggest edits routed through approval workflow. Flag policies nearing review dates or impacted by repeated checkpoint failures.

**Tools:**
- `read_policy` — fetch policy content + metadata
- `list_related_policies` — find cross-referenced and same-category policies
- `get_checkpoint_failures` — failures related to a policy's controls
- `create_suggestion` — write to `ai_suggestions` table (NEVER directly edit a policy)

#### B) Compliance Monitor
**Trigger:** 1st of each month (pg_cron) + daily overdue check
**Instructions:** Generate monthly checkpoint tasks from active controls. Send reminders for upcoming due dates. Escalate overdue tasks. Detect missing-proof patterns.

**Tools:**
- `list_active_controls` — all controls with their frequency + default owners
- `create_checkpoint` — insert into checkpoints table for a period
- `send_notification` — write to notifications table
- `analyze_failure_patterns` — query historical checkpoint pass/fail rates

**Cron Schedule:**
| Job | Cron | Description |
|---|---|---|
| Monthly generation | `0 0 1 * *` | Create all checkpoint tasks for the month |
| Daily overdue scan | `0 7 * * *` | Mark overdue, send notifications |
| Reminder escalation | `0 9 * * *` | 7-day, 3-day, 1-day reminders |

#### C) Evidence Librarian
**Trigger:** Weekly (Monday 8 AM) + on checkpoint completion
**Instructions:** Scan checkpoints missing required evidence. Organize uploads into audit-ready binders by month/standard/program. Prevent "we did it but can't prove it" failures.

**Tools:**
- `list_checkpoints_missing_evidence` — checkpoints completed but lacking uploads
- `organize_audit_binder` — group evidence by period + standard
- `send_notification` — alert owners about missing evidence

#### D) QM Orchestrator
**Trigger:** 5 business days before QM meeting date
**Instructions:** Assemble the monthly QM packet. Draft meeting agenda + executive summary. Calculate audit readiness score. Compile findings, trends, and open CAPAs.

**Tools:**
- `list_checkpoints_for_period` — all checkpoints + status for the month
- `calculate_audit_readiness_score` — composite score → `audit_readiness_scores` table
- `create_qm_meeting` — insert into `qm_meetings` with generated content
- `list_open_capas` — all CAPAs not yet closed
- `get_trend_data` — historical scores for trend analysis

### CRITICAL RULE: AI Never Writes Directly

All AI agent outputs are **suggestions only**. Every policy edit, checkpoint modification, or CAPA action requires human approval via the `ai_suggestions` table → accept/reject UI. The agent writes to `ai_suggestions`, a human reviews, and only upon acceptance does the system apply the change.

---

## Sidebar Navigation (matches Cholla demo)

```
🏠 Dashboard
📅 Calendar
🛡 Controls
📎 Evidence
📖 Knowledge Vault
✅ Approvals (badge: pending count)
📊 QM Workbench
🔄 CAPAs
🤖 AI Activity
💡 Suggestions (badge: pending count)
📄 Reports
⚙ Settings
```

---

## Repo Accelerators — What To Clone/Steal

### Scaffold: `Saas-Starter-Kit/Saas-Kit-supabase`
Clone as project skeleton. Take: auth flows, org creation, invite system, dashboard shell, Stripe integration. Replace: their RBAC with our 8-role enum + `supabase-tenant-rbac` extension.

### Multi-Tenant: `point-source/supabase-tenant-rbac`
Install as Postgres extension. Gives us: per-org role resolution, `db_pre_request` hook, RLS policies referencing org membership.

### Audit Logging: `chrisorei/multitenancy-rbac-supabase-template`
Take: append-only audit log migrations, invite system patterns.

### Compliance Reference: `trycompai/comp`
Study (don't clone): control → evidence → policy DB relationships, AI suggestion pipeline, audit readiness scoring methodology, trust portal concept.

### Policy Editor: `ndtrung341/next-tiptap`
Drop in as policy editor component. Add extensions: `@tiptap/extension-table`, `@tiptap/extension-track-changes`, `@tiptap/extension-highlight`.

### Templates: `strongdm/comply`
Adapt their SOC2 policy templates as starting content for Arizona behavioral health policies.

---

## Phased Build Plan

### Phase 1 — Foundation (Member Portal + Workspaces)
**Goal:** People can sign up, create an org, invite members, and see a dashboard.

1. Clone SaaS starter kit scaffold
2. Install `supabase-tenant-rbac` extension
3. Run migrations 001 + 002
4. Build auth pages matching Cholla demo split-panel layout
5. Build portal shell: header, sidebar, right aside
6. Dashboard with placeholder stats grid
7. Settings: org settings + member management + role assignment
8. Audit log writes on all mutations

**Done when:** A user can sign up → create org → invite a second user with a role → both see a dashboard.

### Phase 2 — Knowledge Vault
**Goal:** Policies are controlled assets with version history.

1. Run migration 003
2. Build policy list page (browse, search, filter by category/program/status)
3. Integrate Tiptap editor for policy creation/editing
4. Version history sidebar showing diffs
5. Approval workflow: draft → in_review → approved → effective
6. Cross-reference linking between policies
7. Evidence upload on policies (supporting docs)

**Done when:** A compliance officer can create a policy, edit it, submit for review, admin approves, and the version history shows the full trail.

### Phase 3 — Controls + Checkpoint Calendar
**Goal:** Compliance requirements become repeatable checkpoints.

1. Run migration 004
2. Control library CRUD (code, title, standard, test procedure, required evidence, frequency)
3. Checkpoint calendar view (month grid with status-colored events)
4. Checkpoint detail modal: info, test procedure, evidence upload, pass/fail attestation
5. Task generation: manual "Generate Month" button (before Phase 4 automates it)
6. Evidence upload with Supabase Storage (org-scoped buckets)
7. "No evidence = incomplete" enforcement

**Done when:** Admin can create controls, generate February checkpoints, assign to staff, staff can open a checkpoint, upload evidence, and attest pass/fail.

### Phase 4 — Agentic AI v1
**Goal:** Agents reduce admin work. All suggestions require human approval.

1. Run migration 006
2. Install `@openai/agents` + Vercel AI SDK adapter
3. Build Compliance Monitor agent + Edge Function + pg_cron trigger
4. Build Evidence Librarian agent + weekly scan
5. Build Policy Guardian agent + suggestion creation
6. AI suggestion panel UI: list pending suggestions with accept/reject/modify
7. Agent run log (AI Activity page)
8. "Missing evidence" and "high-risk" alert badges

**Done when:** On the 1st of the month, checkpoints auto-generate. Weekly, missing evidence is flagged. Policy conflicts surface as suggestions. All require human approval.

### Phase 5 — QM Workbench
**Goal:** QM meetings are standardized and effortless.

1. Run migration 005
2. Build QM Orchestrator agent
3. QM workbench page with tabs: Checklist, Executive Summary, Findings, CAPAs
4. Monthly QM packet auto-generation (5 days before meeting)
5. Findings + trend dashboards
6. CAPA CRUD with owner, due date, verification workflow
7. Audit readiness score history + trend chart
8. PDF export: QM meeting packet, audit binder, executive summary

**Done when:** 5 days before the QM meeting, the orchestrator assembles the packet. Leadership opens the QM workbench and sees checklist, summary, findings, and CAPAs ready to review. They can export a PDF.

### Phase 6 — Continuous Update Monitoring (Future)
**Goal:** Platform stays current without manual chasing.

1. Regulatory source registry (AHCCCS, OIG, HIPAA, TJC, CARF)
2. Monthly change detection via web scraping or API
3. Impact mapping: detected change → affected controls → affected policies
4. Auto-create "policy review required" tasks
5. Review queues and assignments

---

## Audit Readiness Score Calculation

```
overall = (checkpoint_weight * checkpoint_score)
        + (evidence_weight * evidence_score)
        + (policy_weight * policy_score)
        + (capa_weight * capa_score)

Weights (default):
  checkpoint: 0.35  (% completed on time this period)
  evidence:   0.25  (% checkpoints with all required evidence)
  policy:     0.25  (% policies in 'effective' status + not past review date)
  capa:       0.15  (% CAPAs closed on time)
```

---

## Key Patterns & Rules

1. **Tenant isolation is non-negotiable.** Every query must be scoped to `org_id`. RLS enforces this at the DB level.
2. **AI never writes directly.** All agent outputs go through the `ai_suggestions` table and require human approval before any mutation.
3. **Evidence is required.** A checkpoint cannot be marked "passed" without at least one evidence upload (enforced in the UI and via a DB check constraint or application logic).
4. **Audit trail on everything.** Every create/update/delete writes to `audit_log` with user, action, entity, and metadata.
5. **Role-based UI.** Components conditionally render based on user role. Use the `use-role` hook to check permissions.
6. **Realtime where it matters.** Subscribe to `notifications`, `checkpoints`, and `ai_suggestions` tables for live updates on dashboard.
7. **The Cholla demo is the UI spec.** Match its layout, colors, typography, and interaction patterns. The HTML file (`reprieve-cholla-portal.html`) is the authoritative design reference.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic (for agents)
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=REPrieve.ai
```

---

## Commands

```bash
# Dev
npm run dev

# Database
npx supabase db push          # Apply migrations
npx supabase db reset          # Reset + re-run all migrations
npx supabase gen types typescript --local > src/lib/supabase/types.ts

# Deploy Edge Functions
npx supabase functions deploy compliance-monitor
npx supabase functions deploy evidence-librarian
npx supabase functions deploy qm-orchestrator
npx supabase functions deploy policy-guardian
npx supabase functions deploy daily-overdue
```
