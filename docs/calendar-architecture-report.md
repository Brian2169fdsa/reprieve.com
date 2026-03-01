# Calendar Architecture Report — REPrieve.ai Checkpoint Calendar

**Generated:** 2026-03-01
**Scope:** Full architectural analysis of the Checkpoint Calendar system

---

## 1. Executive Summary

The Calendar is the operational heart of REPrieve.ai's compliance engine. It visualizes compliance **checkpoints** — time-bound tasks generated from **controls** — on a month grid, letting staff see what's due, what's passed, what's overdue, and take action (attest, upload evidence, reassign) without leaving the view.

The system spans **7 source files**, **1 database migration**, **1 API seed route**, and **1 server action**. Everything is client-rendered via React with live Supabase queries (no server components for the calendar itself).

---

## 2. File Inventory

| File | Role | Lines |
|---|---|---|
| `src/app/(portal)/calendar/page.tsx` | Route page — thin wrapper | 5 |
| `src/components/calendar/checkpoint-calendar.tsx` | Main calendar component (grid, list, stats, nav, modals) | ~830 |
| `src/components/calendar/calendar-event.tsx` | Individual event pill rendered inside day cells | ~131 |
| `src/components/calendar/checkpoint-popover.tsx` | Full slide-in detail panel (view/edit/create/evidence/attest) | ~850+ |
| `src/hooks/use-checkpoints.ts` | Reusable hook for checkpoint data (used elsewhere, not by calendar itself) | ~89 |
| `src/hooks/use-org.ts` | Fetches the current user's organization context | ~40 |
| `src/app/(portal)/controls/generate-checkpoints.ts` | Server action — bulk-generates checkpoints from active controls | ~232 |
| `src/app/api/seed-checkpoints/route.ts` | API route — seeds 13 control definitions + 12 months of sample checkpoints | ~353 |
| `src/lib/supabase/storage.ts` | Evidence upload/download/delete helpers (Supabase Storage) | ~137 |
| `src/lib/types/index.ts` | Shared TypeScript types (Checkpoint, Control, Evidence, etc.) | ~254 |
| `supabase/migrations/004_controls_checkpoints.sql` | Database schema for controls, checkpoints, evidence tables | ~85 |

---

## 3. Component Architecture

### 3.1 Component Tree

```
CalendarPage                          ← Route: /calendar
└── CheckpointCalendar                ← Main orchestrator (client component)
    ├── Stats Bar                     ← 4 metric cards (Total, Completed, Pending, Overdue/Failed)
    ├── Month Navigation              ← Prev/Next arrows + month/year label
    ├── View Toggle                   ← Calendar grid ↔ List table switch
    ├── Calendar Grid (7×N)           ← Day cells with events
    │   └── CalendarEvent (×N)        ← Colored pills per checkpoint
    ├── List View Table               ← Sortable tabular view of all checkpoints
    ├── Legend                         ← Status color key
    ├── Generate Confirmation Modal    ← Confirm dialog for bulk checkpoint generation
    ├── No-Org Setup Modal             ← Shown when user has no organization
    └── CheckpointPopover              ← Slide-in right panel (the workhorse)
        ├── Header (badges, nav arrows, close)
        ├── View Mode                  ← Detail display (control info, assignee, status, evidence list)
        ├── Edit Mode                  ← Form to update assignee, status, due date, notes
        ├── Create Mode                ← Form to create new checkpoint from a control
        ├── Evidence Section           ← Drag-and-drop file upload + evidence list
        ├── Attestation Buttons        ← Pass/Fail with evidence requirement enforcement
        ├── AI Insight Panel           ← Real-time AI recommendation (calls /api/ai-chat)
        └── Reminder Toggle            ← Set/unset due-date notification
```

### 3.2 Data Flow Diagram

```
                    ┌─────────────┐
                    │  Supabase   │
                    │  PostgreSQL │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        checkpoints    controls    evidence
        (instances)   (definitions) (files)
              │            │            │
              └────────────┼────────────┘
                           │
                    Supabase Client
                    (browser-side)
                           │
              ┌────────────┼────────────┐
              │            │            │
         useOrg()    fetchCheckpoints  fetchDetail
         (hook)     (calendar effect)  (popover)
              │            │            │
              └────────────┼────────────┘
                           │
                  CheckpointCalendar
                   (state owner)
                           │
            ┌──────────────┼──────────────┐
            │              │              │
       CalendarEvent  CheckpointPopover  List View
       (display)      (interaction)     (table)
```

---

## 4. Database Layer

### 4.1 Schema (Migration 004)

Three tables power the calendar:

**`controls`** — Compliance requirement definitions
```
id              UUID PK
org_id          UUID FK → organizations
code            TEXT          e.g. "OIG-SCR-001"
title           TEXT
standard        TEXT          e.g. "HIPAA", "Safety", "AHCCCS"
category        TEXT
test_procedure  TEXT
required_evidence TEXT[]      e.g. ["Meeting minutes", "Audit tool"]
frequency       recurrence    ENUM: monthly | quarterly | semi_annual | annual
default_owner_role org_role
is_active       BOOLEAN
```

**`checkpoints`** — Specific task instances tied to a period
```
id              UUID PK
org_id          UUID FK → organizations
control_id      UUID FK → controls
period          TEXT          e.g. "2026-03", "2026-Q1"
status          checkpoint_status  ENUM: pending | in_progress | passed | failed | overdue | skipped
assigned_to     UUID FK → profiles (nullable)
assignee_name   TEXT          (added post-migration — allows name-only assignment)
due_date        DATE
completed_at    TIMESTAMPTZ
completed_by    UUID FK → profiles
attestation     TEXT          "pass" or "fail"
notes           TEXT
```

**`evidence`** — File attachments proving checkpoint completion
```
id              UUID PK
org_id          UUID FK → organizations
checkpoint_id   UUID FK → checkpoints
file_path       TEXT          Supabase Storage path
file_name       TEXT
file_type       TEXT          "pdf", "image", "document"
file_size_bytes BIGINT
uploaded_by     UUID FK → profiles
```

### 4.2 Row-Level Security (RLS)

All three tables have RLS enabled with an `org_isolation` policy:
```sql
CREATE POLICY "org_isolation" ON public.checkpoints FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.org_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```
Users can only access data belonging to organizations they're active members of.

### 4.3 Indexes

```sql
idx_controls_org          (org_id)
idx_controls_standard     (org_id, standard)
idx_checkpoints_org       (org_id)
idx_checkpoints_period    (org_id, period)
idx_checkpoints_status    (org_id, status)
idx_checkpoints_assigned  (assigned_to)
idx_evidence_checkpoint   (checkpoint_id)
```

### 4.4 Key Relationships

```
controls (1) ──→ (N) checkpoints ──→ (N) evidence
                         │
                         ├──→ profiles (assigned_to)
                         └──→ profiles (completed_by)
```

---

## 5. Component Deep Dive

### 5.1 CheckpointCalendar (`checkpoint-calendar.tsx`)

**Role:** The master orchestrator. Owns all calendar state, fetches data, renders both views, and manages modals.

**State Management:**

| State Variable | Type | Purpose |
|---|---|---|
| `viewYear` / `viewMonth` | `number` | Currently displayed month |
| `view` | `"calendar" \| "list"` | Active view mode |
| `checkpoints` | `CalendarDayEvent[]` | All checkpoints for the displayed month |
| `loading` | `boolean` | Data fetch in progress |
| `usingMocks` | `boolean` | Whether sample data is being shown |
| `userId` | `string \| null` | Current authenticated user |
| `popoverDay` | `number \| null` | Which day's popover is open (`null` = closed, `-1` = create new) |
| `showConfirm` | `boolean` | Generate checkpoints confirmation modal |
| `showNoOrgModal` | `boolean` | Organization setup required modal |
| `sortCol` / `sortDir` | `string` | List view sort state |
| `generating` | `boolean` | Checkpoint generation in progress |
| `seeding` | `boolean` | Seed data loading in progress |

**Data Fetching Logic:**

1. On mount, `useOrg()` loads the user's organization via `/api/me`
2. On mount, a `useEffect` calls `supabase.auth.getUser()` to get `userId`
3. Whenever `org.id`, `viewYear`, or `viewMonth` changes, `fetchCheckpoints()` runs
4. `fetchCheckpoints()` queries Supabase directly from the browser:
   ```
   checkpoints
     .select(id, status, due_date, period, assigned_to, assignee_name,
             control:controls!control_id(title, code, standard),
             assignee:profiles!assigned_to(full_name))
     .eq(org_id, orgId)
     .gte(due_date, firstDay)
     .lte(due_date, lastDay)
   ```
5. If no results come back, it falls back to `generateMockData()` (28 sample checkpoints)

**Calendar Grid Construction:**

```typescript
// Calculate grid cells
const fw = firstWeekday(year, month)    // Day-of-week for the 1st (0=Sun)
const dim = daysInMonth(year, month)    // Number of days in month
const cells = [
  ...Array(fw).fill(null),              // Leading empty cells
  ...Array.from({length: dim}, (_, i) => i + 1),  // Day numbers
]
while (cells.length % 7 !== 0) cells.push(null)  // Trailing empty cells
```

This produces a flat array rendered as a CSS Grid with `grid-template-columns: repeat(7, 1fr)`.

**Event Mapping:**

Checkpoints are grouped by day number into an `eventMap: Record<number, CalendarDayEvent[]>`. Each day cell shows a maximum of 2 `CalendarEvent` pills, with a "+N more" overflow indicator.

**Visual Indicators:**
- **Today:** Blue outline ring (`2px solid #3BA7C9`) + blue circle on day number
- **Past incomplete:** Light red background (`#FFF8F8`)
- **Selected day:** Light blue background (`#F0F9FC`)
- **Empty day hover:** Shows a "+" hint

### 5.2 CalendarEvent (`calendar-event.tsx`)

**Role:** A compact colored pill representing a single checkpoint on a calendar day.

**Rendering:** Status-colored dot + truncated label + optional "AI" badge

**Hover Tooltip:** Dark floating tooltip showing:
- Checkpoint title
- Standard (OIG, HIPAA, etc.)
- Due date
- Assigned person
- AI generation indicator

**Status Color Map:**

| Status | Dot Color | Background | Text |
|---|---|---|---|
| `info` | `#3BA7C9` | `#E8F6FA` | `#2A8BA8` |
| `passed` | `#16A34A` | `#DCFCE7` | `#15803D` |
| `failed` | `#DC2626` | `#FEE2E2` | `#DC2626` |
| `overdue` | `#DC2626` | `#FEE2E2` | `#B91C1C` |
| `pending` | `#D97706` | `#FEF3C7` | `#B45309` |
| `in_progress` | `#3BA7C9` | `#E8F6FA` | `#2A8BA8` |
| `skipped` | `#A3A3A3` | `#F5F5F5` | `#737373` |

### 5.3 CheckpointPopover (`checkpoint-popover.tsx`)

**Role:** The richest component — a full-height slide-in panel from the right that handles viewing, editing, creating checkpoints, uploading evidence, attesting pass/fail, setting reminders, and displaying AI insights.

**Modes:**

| Mode | Trigger | Behavior |
|---|---|---|
| `view` | Click a day with existing events | Shows checkpoint detail, evidence, AI insight, attest buttons |
| `edit` | Click "Edit" in view mode | Pre-fills form from current checkpoint, allows updating |
| `create` | Click a day with no events, or "Add Checkpoint" button | Blank form with control dropdown, assignee, due date |

**Key Features:**

1. **Multi-event navigation:** When a day has multiple checkpoints, left/right arrows cycle through them
2. **Evidence upload:** Drag-and-drop or file picker; files go to Supabase Storage (`org-{orgId}-evidence/{checkpointId}/{timestamp}-{filename}`) then metadata is written to the `evidence` table
3. **Attestation workflow:** "Pass" requires at least one evidence file uploaded; "Fail" can be attested without evidence. Both write to `checkpoint.status`, `attestation`, `completed_at`, `completed_by`
4. **AI Insight:** On viewing a checkpoint, calls `/api/ai-chat` with the checkpoint title/standard/status to get a brief compliance recommendation
5. **Reminder system:** Toggle to create/delete a notification in the `notifications` table for the assigned user
6. **Named team members:** Supports assigning to named people (Emily, Wayne, Brian, Jericho) without requiring a Supabase Auth account — uses `assignee_name` column
7. **Audit logging:** Every create/update/attest writes to `audit_log`

**Data Fetching in Popover:**
- `fetchDetail(id)` — Full checkpoint with control join, assignee join, and evidence sub-select
- `fetchControls()` — All org controls via `/api/org/controls` (for create mode dropdown)
- `fetchMembers()` — All active org members with profile names (for assignee dropdown)
- `checkReminderStatus(id)` — Checks if a reminder notification exists
- `fetchAiInsight(title, standard, status)` — Calls AI chat endpoint

### 5.4 Stats Bar

Four metric cards computed from the loaded checkpoints array:

```typescript
const real      = checkpoints.filter(c => c.status !== "info")
const total     = real.length
const completed = real.filter(c => c.status === "passed").length
const pending   = real.filter(c => c.status === "pending" || c.status === "in_progress").length
const overdue   = real.filter(c => c.status === "overdue" || c.status === "failed").length
```

Note: `info` status checkpoints (like "Monthly Checkpoints Generated") are excluded from stats.

### 5.5 List View

A sortable HTML table with columns: Date, Checkpoint, Standard, Assigned To, Status, Code. Sorting is client-side on the already-fetched array. Click on any row opens the popover for that day.

---

## 6. Checkpoint Generation System

### 6.1 Server Action: `generateCheckpoints()`

Located at `src/app/(portal)/controls/generate-checkpoints.ts`. This is a Next.js Server Action (`"use server"`).

**Invocation:** Called from the "Generate Checkpoints" button in the calendar header. Always generates for the **next month** relative to the currently displayed month.

**Algorithm:**

1. Parse the period string (e.g., "2026-04")
2. Calculate the last business day of that month as the due date
3. Load all active controls for the org
4. Filter controls by frequency match:
   - `monthly` → every month
   - `quarterly` → March, June, September, December
   - `semi_annual` → June, December
   - `annual` → December only
5. Load existing checkpoints for the period to prevent duplicates
6. For each applicable control, find the first org member with the control's `default_owner_role` as the assignee
7. Bulk insert all new checkpoint records
8. Write to `audit_log`

**Period Labels by Frequency:**

| Frequency | Period Format | Example |
|---|---|---|
| `monthly` | `YYYY-MM` | `2026-03` |
| `quarterly` | `YYYY-Q#` | `2026-Q1` |
| `semi_annual` | `YYYY-H#` | `2026-H1` |
| `annual` | `YYYY` | `2026` |

### 6.2 Seed Route: `/api/seed-checkpoints`

Located at `src/app/api/seed-checkpoints/route.ts`. A POST endpoint that bootstraps a new organization with:

- **13 control definitions** covering: Governance/QM, Clinical Documentation, Workforce, Environment of Care, Billing Integrity, Emergency Drills, HIPAA Privacy, Workplace Violence, HIPAA Risk Analysis, QM Program Evaluation, Evacuation Drills, and Audit Stress Tests
- **~80+ checkpoint instances** spread across 12 months (March 2026 → February 2027)

**Idempotency:** Checks if checkpoints already exist for the org before inserting. Controls are upserted (safe to re-run).

**Uses admin client** (service role key) to bypass RLS for the insert operations.

---

## 7. Hooks & Utilities

### 7.1 `useOrg()` Hook

Fetches the user's organization by calling `/api/me`. Returns `{ org, isLoading, error }`. The calendar uses this to get `org.id` for all subsequent queries.

### 7.2 `useCheckpoints()` Hook

A reusable hook (not used by the calendar component itself — the calendar has its own inline fetch logic). Supports filtering by period, status, and assignee. Used by other pages (dashboard, checkpoints detail).

### 7.3 `uploadEvidence()` / `getEvidenceUrl()` / `deleteEvidence()`

Supabase Storage helpers. Bucket naming: `org-{orgId}-evidence`. File path: `{checkpointId}/{timestamp}-{safeName}`. Signed URLs expire after 60 minutes.

---

## 8. User Interaction Flows

### 8.1 View a Checkpoint

```
User clicks day cell
  → handleDayClick(day) sets popoverDay = day
  → CheckpointPopover opens in "view" mode
  → fetchDetail(eventId) loads from Supabase
  → fetchAiInsight() gets AI recommendation
  → User sees: title, standard, status, due date, assignee,
    test procedure, required evidence, current evidence files,
    AI insight, attest buttons
```

### 8.2 Create a Checkpoint

```
User clicks empty day (or "Add Checkpoint" button)
  → popoverDay set; mode = "create"
  → fetchControls() loads available controls
  → fetchMembers() loads assignable team members
  → User selects control, assignee, due date, notes
  → handleSave() inserts into checkpoints table
  → Writes to audit_log
  → Calls onRefresh() → re-fetches month data
```

### 8.3 Attest Pass/Fail

```
User clicks "Pass" or "Fail" in popover
  → handleAttest("pass" | "fail")
  → If "pass": requires evidence.length > 0 (enforced)
  → Updates checkpoint: status, attestation, completed_at, completed_by
  → Writes to audit_log
  → Calls onRefresh() + onClose()
```

### 8.4 Upload Evidence

```
User drags file into evidence area (or clicks to browse)
  → handleUploadFiles(files)
  → For each file:
    → uploadEvidence(orgId, checkpointId, file)  [Supabase Storage]
    → INSERT into evidence table (metadata)
  → fetchDetail() refreshes the evidence list
```

### 8.5 Generate Monthly Checkpoints

```
User clicks "Generate Checkpoints"
  → Confirmation modal appears (shows next month name)
  → User confirms
  → handleGenerate() calls generateCheckpoints(orgId, period) server action
  → Server action:
    → Loads active controls
    → Filters by frequency match
    → Skips existing checkpoints
    → Bulk inserts new ones
    → Returns { count, skipped }
  → Calendar navigates to the generated month
```

### 8.6 Seed Initial Data

```
User sees "Load Compliance Checkpoints" button (shown when using mock data + has org)
  → handleSeed() POSTs to /api/seed-checkpoints
  → API creates 13 controls + ~80 checkpoints
  → Calendar re-fetches current month from DB
  → Mock banner disappears
```

---

## 9. Mock Data Fallback

When no organization exists or no checkpoints are found for a month, the calendar generates 28 sample checkpoints via `generateMockData()`. These have `isMock: true` and cover a realistic spread of compliance activities (OIG screening, HIPAA audits, safety inspections, etc.) with various statuses.

Mock checkpoints are visually indistinguishable from real ones except for the blue info banner at the top saying "Showing sample data." The popover does not fetch from Supabase for mock events (`isMock` check prevents the query).

---

## 10. Styling Approach

The entire calendar uses **inline styles** — no Tailwind classes, no CSS modules. This is consistent across all three calendar components. Key design tokens used:

- Font families: `var(--font-source-serif-4)` for headings, `var(--font-source-sans-3)` for body
- Colors from the CLAUDE.md design system (blue: `#3BA7C9`, rust: `#C05A2C`, etc.)
- Radii: `6px` (buttons, cards), `10px` (main containers), `50%` (day number circles)
- Shadows: `0 1px 3px rgba(0,0,0,0.06)` for cards, `0 20px 60px rgba(0,0,0,0.18)` for modals

The only CSS-in-JS is a `<style>` block at the bottom for:
- `@keyframes spin` (loading spinners)
- `.calendar-day-cell:hover` (blue tint on hover)
- `.day-add-hint` opacity on hover
- `.list-row:hover` (light blue tint)

---

## 11. Known Architectural Patterns & Design Decisions

### 11.1 No Server Components for Calendar

The entire calendar is `"use client"`. This is because:
- Month navigation is highly interactive
- Supabase queries happen client-side for real-time responsiveness
- Popover state management requires client-side React

### 11.2 Supabase Direct Queries (not API routes)

The calendar queries Supabase directly from the browser using the anon key + RLS. This avoids API route overhead. The exception is the seed endpoint (`/api/seed-checkpoints`) which uses the admin client to bypass RLS.

### 11.3 Calendar Doesn't Use `useCheckpoints()` Hook

Despite the hook existing, the calendar implements its own `fetchCheckpoints()` with a different query shape (it needs the control join with title/code/standard, which the hook's generic query also does but returns a different type). The popover also has its own `fetchDetail()` for the richer single-checkpoint query with evidence.

### 11.4 Named Assignees Without Auth Accounts

The `assignee_name` column (added post-migration) allows assigning checkpoints to team members like "Emily", "Wayne", "Brian", "Jericho" without requiring them to have Supabase Auth accounts. The popover's assignee dropdown shows both database-backed members and these hardcoded names.

### 11.5 Evidence-Gated Attestation

A checkpoint cannot be attested as "Pass" without at least one evidence file. This is enforced at the UI level in `handleAttest()`, not at the database level.

---

## 12. Integration Points

| System | Integration | Direction |
|---|---|---|
| **Supabase Auth** | `getUser()` for userId | Read |
| **Supabase Postgres** | checkpoints, controls, evidence, notifications, audit_log tables | Read + Write |
| **Supabase Storage** | Evidence file upload/download | Read + Write |
| **AI Chat API** | `/api/ai-chat` for checkpoint insights | Read |
| **Organization API** | `/api/me` for org context | Read |
| **Controls API** | `/api/org/controls` for control dropdown | Read |
| **Server Action** | `generateCheckpoints()` for bulk creation | Write |
| **Dashboard** | Shares checkpoint status data (separate queries) | Indirect |
| **QM Workbench** | References checkpoint pass/fail rates | Indirect |

---

## 13. Performance Characteristics

- **Initial load:** 2 API calls (useOrg → `/api/me`, then `fetchCheckpoints()` to Supabase)
- **Month navigation:** 1 API call per month change (`fetchCheckpoints()`)
- **Popover open:** 3-4 API calls (fetchDetail, fetchControls, fetchMembers, fetchAiInsight)
- **No pagination:** All checkpoints for a month are loaded at once (typically 5-30 items)
- **No caching:** Each month change triggers a fresh Supabase query
- **No SSR/SSG:** Fully client-rendered; initial HTML is empty

---

## 14. Dependency Map

```
checkpoint-calendar.tsx
  ├── react (useState, useEffect, useCallback)
  ├── lucide-react (ChevronLeft, ChevronRight, LayoutGrid, List, Plus, X, Loader2)
  ├── ./calendar-event (CalendarEvent component)
  ├── ./checkpoint-popover (CheckpointPopover component, CalendarDayEvent type)
  ├── @/lib/supabase/client (createClient)
  ├── @/hooks/use-org (useOrg)
  └── @/app/(portal)/controls/generate-checkpoints (generateCheckpoints server action)

calendar-event.tsx
  ├── react (useState)
  └── (no external deps — fully self-contained)

checkpoint-popover.tsx
  ├── react (useState, useEffect, useCallback, useRef)
  ├── lucide-react (X, ChevronLeft, ChevronRight, User, Calendar, FileText,
  │                  Upload, Loader2, Bell, BellRing, Check, AlertTriangle,
  │                  Bot, Edit2, Paperclip, Plus, ClipboardList)
  ├── @/lib/supabase/client (createClient)
  └── @/lib/supabase/storage (uploadEvidence)
```

---

## 15. Summary

The Checkpoint Calendar is a **self-contained, client-rendered system** built around three components:

1. **CheckpointCalendar** — Orchestrates month navigation, data fetching, grid/list rendering, and modal state
2. **CalendarEvent** — Pure display component for individual checkpoint pills
3. **CheckpointPopover** — Feature-rich slide-in panel handling the full checkpoint lifecycle (create → assign → evidence → attest)

Data flows from **Supabase Postgres** through **browser-side queries** protected by **RLS org isolation**. Checkpoints are generated in bulk from controls via a **server action**, with a **seed route** for bootstrapping. Evidence files live in **Supabase Storage** with org-scoped buckets. Every mutation writes to the **audit log**. AI insights are fetched on-demand from the **AI chat API**.

The architecture is straightforward and pragmatic — no state management library, no caching layer, no abstraction framework. It trades some efficiency (redundant fetches, no SSR) for simplicity and directness.
