# REPrieve.ai — Setup & Launch Guide

## Step 1: Create the GitHub Repo

Go to https://github.com/new and create:
- **Name:** `reprieve-ai`
- **Visibility:** Private
- **Don't** initialize with README (we already have one)

## Step 2: Push This Code to GitHub

Open your terminal and run:

```bash
# Clone the scaffold (or copy the files from the download)
cd ~/Projects  # or wherever you keep repos
# If you downloaded the folder:
cd reprieve-ai

# Connect to GitHub
git remote add origin https://github.com/YOUR_USERNAME/reprieve-ai.git
git push -u origin main
```

If you're starting fresh and need to pull the scaffold down from somewhere, just create a new folder, copy all the files in, and run:

```bash
cd reprieve-ai
git init
git branch -m main
git add -A
git commit -m "Initial scaffold: Next.js 15 + CLAUDE.md + DB migrations + types"
git remote add origin https://github.com/YOUR_USERNAME/reprieve-ai.git
git push -u origin main
```

## Step 3: Set Up Supabase

1. Go to https://supabase.com/dashboard and create a new project
   - **Name:** reprieve-ai
   - **Region:** us-west-1 (closest to Phoenix)
   - **Password:** save this somewhere safe

2. Once created, grab your keys from **Settings > API**:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

3. Create your `.env.local`:
```bash
cp .env.example .env.local
# Edit .env.local with your actual keys
```

4. Install Supabase CLI if you haven't:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

5. Push migrations:
```bash
supabase db push
```

## Step 4: Install Claude Code

If you don't have it yet:

```bash
npm install -g @anthropic-ai/claude-code
```

Make sure your `ANTHROPIC_API_KEY` is set:
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
# Or add to your shell profile (~/.zshrc or ~/.bashrc)
```

## Step 5: Launch Claude Code on the Repo

```bash
cd ~/Projects/reprieve-ai
claude
```

Claude Code will automatically read the `CLAUDE.md` file and understand the full project context.

---

## Phase 1 Prompts for Claude Code

Copy-paste these prompts one at a time. Each builds on the previous.

### Prompt 1: Install Dependencies + shadcn/ui

```
Install the core dependencies for the project: @supabase/supabase-js @supabase/ssr. Then initialize shadcn/ui with the default config and install these components: button, input, label, card, dialog, table, tabs, badge, toast, dropdown-menu, avatar, separator, command, sidebar. Use the zinc color scheme. Make sure Tailwind is configured with the custom CSS variables from CLAUDE.md (our blue/rust/green/yellow palette).
```

### Prompt 2: Auth Layout + Login Page

```
Build the auth layout and login page matching the Cholla demo design (reprieve-cholla-portal.html is the reference). The auth layout should be a split-panel: left 42% with blue-dark gradient background showing the REPrieve.ai brand + 4 feature callouts, right side with the login form. Build both Sign In and Create Account tabs. Wire up Supabase Auth with email/password. On signup, also collect full_name and create the organization (org name + slug). After successful login, redirect to /dashboard. Use our exact color palette and Source Sans 3 / Source Serif 4 fonts.
```

### Prompt 3: Portal Shell (Header + Sidebar + Layout)

```
Build the authenticated portal layout at src/app/(portal)/layout.tsx. This wraps all portal pages with: (1) Top header bar - 52px tall, blue-dark background, 3px rust bottom border, shows REPrieve.ai logo + org name + notification bell + user avatar dropdown with logout. (2) Left sidebar - 200px, white background, shows nav items from NAV_ITEMS in types/index.ts with active state highlighting. (3) Right aside panel (visible on dashboard only) showing Compliance Summary stats. (4) Main content area that renders the page. Add auth middleware that redirects to /login if not authenticated. Create a useOrg hook and useRole hook that fetch the current user's org membership and role from Supabase.
```

### Prompt 4: Dashboard Page

```
Build the dashboard page at src/app/(portal)/dashboard/page.tsx. Match the Cholla demo layout: (1) Stats grid at top showing Audit Readiness %, Checkpoints completed, Policies effective, Open CAPAs - use card components with the blue/rust/green status colors. (2) Two-column layout below: left column shows "Upcoming Checkpoints" as a task list with status badges and due dates, right column shows "AI Activity" feed with recent agent actions. (3) The right aside panel should show the Compliance Summary with Audit Readiness score, checkpoint count, policy count, evidence coverage %, open CAPAs count, pending AI suggestions count, plus an "Attention Required" alert card and an "AI Insight" card. Use placeholder/seed data for now — we'll wire to real queries in the next phase.
```

### Prompt 5: Supabase Client + Middleware

```
Set up the Supabase client infrastructure: (1) src/lib/supabase/client.ts - browser client using createBrowserClient from @supabase/ssr. (2) src/lib/supabase/server.ts - server client using createServerClient with cookie handling for Next.js App Router. (3) src/middleware.ts - auth middleware that refreshes the session on every request and redirects unauthenticated users from /dashboard/* to /login. (4) src/lib/supabase/storage.ts - helper functions for evidence upload (uploadEvidence, getEvidenceUrl, deleteEvidence) using org-scoped bucket names. Make sure all server components use the server client and all client components use the browser client.
```

### Prompt 6: Org Creation + Member Management

```
Build the org creation flow that triggers on first signup: after a user creates an account, redirect them to an org setup page where they enter their organization name. This creates the org in the organizations table and adds them as the first member with 'admin' role. Then build the Settings > Members page at src/app/(portal)/settings/members/page.tsx with: invite user form (email + role picker), member list table showing name/email/role/status, ability for admin to change roles, and deactivate members. Use the org_members table with the 8-role enum.
```

---

## Phase 2 Prompts (Knowledge Vault)

### Prompt 7: Policy CRUD + List View

```
Build the Knowledge Vault at src/app/(portal)/vault/page.tsx. Show a searchable, filterable table of policies with columns: Code, Title, Category, Program, Status, Owner, Next Review Date. Add filters for category, program (IOP/Residential), and status. Include a "New Policy" button that opens a creation form with fields matching the policies table schema. Each row links to the policy detail page at /vault/[id].
```

### Prompt 8: Tiptap Policy Editor

```
Install tiptap and build the policy editor at src/app/(portal)/vault/[id]/edit/page.tsx. Use @tiptap/react with extensions: StarterKit, Table, Highlight, Placeholder. Build a formatting toolbar with headings, bold, italic, bullet list, numbered list, table insert, and highlight toggle. The editor saves content as both Tiptap JSON (to policy_versions.content) and rendered HTML (to policy_versions.content_html). On save, create a new policy_version record with incremented version_number and a change_summary field. Show version history in a sidebar panel with the ability to view any previous version.
```

### Prompt 9: Policy Approval Workflow

```
Build the approval workflow for policies. When a policy is in 'draft' status, the owner can click "Submit for Review" which changes status to 'in_review'. On the Approvals page (src/app/(portal)/approvals/page.tsx), show all policies pending review. Admin/Compliance/Supervisor roles can Approve (→ status becomes 'approved', then 'effective' once effective_date is set) or Reject (→ back to 'draft' with review notes). Record who approved and when in the policy_versions table. Add cross-reference linking: on the policy detail page, show a "Related Policies" section where you can search and link other policies.
```

---

## Phase 3 Prompts (Controls + Checkpoints)

### Prompt 10: Control Library

```
Build the Control Library at src/app/(portal)/controls/page.tsx. Show a table of controls with columns: Code, Title, Standard, Frequency, Active status. Add a "New Control" form with all fields from the controls table. The standard field should be a select with options: OIG, HIPAA, AHCCCS, TJC, CARF, Safety, Internal. Frequency select: Monthly, Quarterly, Semi-Annual, Annual. Include a required_evidence field as a tag input where you can add multiple evidence requirements as strings. Each control can optionally link to related policies via related_policy_ids.
```

### Prompt 11: Checkpoint Calendar

```
Build the checkpoint calendar at src/app/(portal)/calendar/page.tsx matching the Cholla demo. Show a month grid view with checkpoint events color-coded by status: green=passed, red=failed/overdue, yellow=pending, blue=in_progress. Clicking a day with events opens the checkpoint detail modal showing: control info, test procedure, assigned person, due date, status badge, evidence upload zone, and pass/fail attestation buttons. Add a "Generate Checkpoints" button that creates checkpoint records for the selected month based on all active controls and their frequency. This is the manual version before the AI agent automates it in Phase 4.
```

### Prompt 12: Evidence Upload

```
Build the evidence upload system. Create a Supabase Storage bucket per org (org-{id}-evidence). On the checkpoint detail modal, add a drag-and-drop upload zone that accepts PDF, images (JPG/PNG), and video (MP4). On upload, store the file in Supabase Storage at path {checkpoint_id}/{filename} and create an evidence record in the database with tags (standard, period, program). Enforce the rule: a checkpoint cannot be marked as 'passed' without at least one evidence upload. Also build the Evidence Library page at src/app/(portal)/evidence/page.tsx showing all evidence filterable by standard, period, and program — this is the "Audit Binder" view.
```

---

## Overnight Build Prompts (Ambitious)

If you want to hand Claude Code an overnight session, try:

```
Read CLAUDE.md thoroughly. Build Phase 1 completely: install all dependencies including shadcn/ui components, set up Supabase client/server/middleware, build the auth layout + login/signup matching the Cholla demo design, build the portal shell with header/sidebar/aside, build the dashboard with stats grid and placeholder data, build org creation flow on first signup, and build the Settings > Members page with invite + role management. Every page should use our exact color palette (blue #3BA7C9, rust #C05A2C, etc), Source Sans 3 / Source Serif 4 fonts, and match the layout dimensions from CLAUDE.md. Commit after each major component is working.
```

---

## Tips for Working with Claude Code on This Project

1. **Always point it at CLAUDE.md first.** If it seems lost, say: "Re-read CLAUDE.md for the full project spec."

2. **Reference the Cholla demo for UI.** Say: "Match the design from the Cholla demo HTML" and it'll follow the patterns.

3. **One phase at a time.** Don't ask it to build everything at once. The prompts above are sequenced intentionally.

4. **Commit checkpoints.** After each prompt, ask Claude Code to `git add -A && git commit -m "description"` before moving on.

5. **Seed data is your friend.** For early phases, ask it to create a seed script that populates sample controls, policies, and checkpoints so you can see the UI working before the AI agents exist.

6. **Test as you go.** After each prompt, run `npm run dev` and verify the page works before moving on.
