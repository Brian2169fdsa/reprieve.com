Read CLAUDE.md first. Your job is to rebuild the AI Agents page to match the design screenshot (2x2 agent card grid + recent suggestions feed), build the AI chat slide-out panel, rebuild the AI Suggestions page with rich cards, and wire everything to real Supabase data with mock fallbacks.

INSTALL FIRST:
```
npm install ai @ai-sdk/anthropic
```

ONLY touch these files (create if needed):
- src/app/(portal)/ai/page.tsx (REWRITE — currently 201 lines, all mock data)
- src/app/(portal)/suggestions/page.tsx (REWRITE — currently 200 lines, buttons disabled)
- src/components/ai/ai-chat-slideout.tsx (CREATE — right-side chat panel)
- src/components/ai/agent-card.tsx (CREATE — individual agent card component)
- src/components/ai/suggestion-card.tsx (CREATE — suggestion card for suggestions page)
- src/app/api/ai-chat/route.ts (CREATE — API route for AI chat)

Current state: ai/page.tsx has all mock data for agents and activity. suggestions/page.tsx has ALL buttons disabled with no onClick handlers. No chat functionality exists. No "Manage AI" text anywhere.

## AI AGENTS PAGE (ai/page.tsx) — COMPLETE REWRITE

### Layout matches design screenshot:

**Page Header:**
- "AI Agents" title (Source Serif 4, bold)
- "Your intelligent compliance team" subtitle
- No "Manage AI" text anywhere

**Agent Cards Grid (2x2):**
Four agent cards in a 2-column grid:

Card 1 — **Policy Guardian** (purple accent):
- Icon: shield with eye (use Lucide ShieldCheck or similar)
- Title: "Policy Guardian"
- Subtitle: "Policy Analysis & Conflict Detection"
- Status: green dot + "Active"
- Metrics (4 rows, label + value):
  - "Policies Analyzed" → query policies count
  - "Conflicts Found" → query ai_suggestions WHERE agent='policy_guardian' AND suggestion_type='flag' count
  - "Reviews Pending" → query policies WHERE next_review_date < now + 30 days count
  - "Last Run" → query ai_agent_runs WHERE agent='policy_guardian' ORDER BY created_at DESC LIMIT 1, show relative time
- "Chat with Agent" button at bottom (opens slide-out)

Card 2 — **Compliance Monitor** (blue accent):
- Icon: activity/pulse icon
- Title: "Compliance Monitor"
- Subtitle: "Checkpoint Generation & Oversight"
- Status: green dot + "Active"
- Metrics:
  - "Checkpoints Generated" → query checkpoints count for current period
  - "Overdue Items" → query checkpoints WHERE status='overdue' count
  - "Reminders Sent" → query notifications WHERE type='checkpoint_due' count
  - "Last Run" → latest ai_agent_runs for compliance_monitor

Card 3 — **Evidence Librarian** (green accent):
- Icon: archive/folder icon
- Title: "Evidence Librarian"
- Subtitle: "Evidence Organization & Gap Detection"
- Status: green dot + "Active"
- Metrics:
  - "Evidence Tracked" → query evidence count
  - "Missing Evidence" → count checkpoints with status='passed' but no evidence
  - "Binders Organized" → count distinct periods in evidence
  - "Last Run" → latest ai_agent_runs for evidence_librarian

Card 4 — **QM Orchestrator** (amber accent):
- Icon: layout/grid icon
- Title: "QM Orchestrator"
- Subtitle: "Quality Meeting Preparation"
- Status: green dot + "Active"
- Metrics:
  - "Meetings Prepared" → query qm_meetings count
  - "Findings Tracked" → query findings count
  - "CAPAs Monitored" → query capas WHERE status != 'closed' count
  - "Last Run" → latest ai_agent_runs for qm_orchestrator

**Each Card Styling:**
- White bg, 1px border, 10px radius, shadow-sm
- Colored left border (3px) matching agent accent color
- Agent icon in a colored circle at top
- Metrics in a clean table layout (label left-aligned, value right-aligned, light separator lines)
- "Chat with Agent" button at bottom: outlined style, agent's accent color

**"Recent AI Suggestions" Section Below Cards:**
- Section header: "Recent AI Suggestions" with pending count badge
- List of suggestion items (query ai_suggestions ORDER BY created_at DESC LIMIT 8):
  - Each item: agent icon dot (colored by agent), suggestion title (bold), description text, confidence bar (horizontal, colored by score), confidence score percentage, status indicator
  - Action buttons on each:
    - If pending: "Accept" (green) + "Reject" (red outline) buttons
    - If pending with high confidence: also "Escalate" button
    - Accept: UPDATE ai_suggestions SET status='accepted', reviewed_by, reviewed_at. Write to audit_log.
    - Reject: Show rejection reason textarea first, then UPDATE with status='rejected' and review_notes.
  - Clicking the suggestion title: expands to show full suggested_changes details

**Mock Data for Agent Metrics:**
If queries return empty/zero, use these mock values:
- Policy Guardian: 47 analyzed, 3 conflicts, 5 reviews pending, "2 hours ago"
- Compliance Monitor: 24 generated, 2 overdue, 12 reminders, "1 hour ago"
- Evidence Librarian: 38 tracked, 4 missing, 3 binders, "4 hours ago"
- QM Orchestrator: 6 prepared, 8 findings, 3 CAPAs, "Yesterday"

**Mock Suggestions (if empty):**
Seed 6 suggestions:
1. Policy Guardian / flag / "Potential conflict between HIPAA Privacy and Telehealth policies" / confidence 0.87 / pending
2. Compliance Monitor / create / "Recommend adding quarterly medication reconciliation checkpoint" / confidence 0.92 / pending
3. Evidence Librarian / flag / "Fire Drill Log (SAFE-FD-001) missing evidence for February" / confidence 0.95 / pending
4. Policy Guardian / edit / "Update POL-HIPAA-001 Section 4.2 to reflect 2026 HITECH amendments" / confidence 0.78 / pending
5. QM Orchestrator / review / "February QM packet ready — 3 findings need committee review" / confidence 0.91 / pending
6. Compliance Monitor / flag / "Staff member David Kim credentials expire March 15, 2026" / confidence 0.99 / pending

## AI CHAT SLIDE-OUT (ai-chat-slideout.tsx) — CREATE NEW

Right-side panel that slides in from the right edge of the screen. Matches the design screenshot:

**Panel Structure:**
- Width: 400px (or 30% of screen, min 360px)
- Height: full viewport height
- Background: white
- Border-left: 1px solid #E8E8E8
- Shadow: -4px 0 20px rgba(0,0,0,0.08)
- Z-index: 50 (above content, below modals)
- Slide-in animation: translateX(100%) → translateX(0) with 200ms ease

**Header:**
- Agent icon (colored circle with agent-specific icon)
- Agent name (bold, 16px)
- Agent role subtitle (13px, gray) — e.g., "Policy Analysis & Conflict Detection"
- Close X button (top right)

**Agent Description:**
- Brief text block: "I can help you analyze policies, detect conflicts, review compliance requirements, and provide recommendations based on your organization's data."
- Vary text per agent

**Suggested Prompts:**
- Row of pill/chip buttons with suggested questions:
  - Policy Guardian: "Policy conflicts", "Review schedule", "HIPAA compliance", "Recent changes"
  - Compliance Monitor: "Overdue checkpoints", "Monthly summary", "Risk areas", "Staff assignments"
  - Evidence Librarian: "Missing evidence", "Audit readiness", "Evidence gaps", "Binder status"
  - QM Orchestrator: "QM packet status", "Open findings", "CAPA overview", "Trend analysis"
- Clicking a chip fills the input and auto-sends

**Chat Messages Area:**
- Scrollable message list
- User messages: right-aligned, blue-dark bg, white text, rounded bubble
- AI messages: left-aligned, #F5F5F5 bg, dark text, rounded bubble
- AI messages can include formatted text (bold, lists, etc.)
- Show typing indicator when waiting for response (3 animated dots)

**Input Area (bottom):**
- Text input: "Ask {Agent Name}..." placeholder
- Send button (arrow icon, blue-dark)
- "Enter to send · Shift+Enter for newline" helper text below input
- Disabled state while waiting for response

**API Route (src/app/api/ai-chat/route.ts):**
For now, create a mock API route that returns contextual responses:
- Accept POST with { message: string, agent: string, orgId: string }
- Based on the agent name and message keywords, return relevant mock responses
- Include a 1-2 second delay to simulate API latency
- Response format: { message: string, suggestions?: string[] }
- Mock responses should reference real data types (checkpoint names, policy titles, etc.)
- Add a comment noting where the real Anthropic Claude integration will go

**State Management:**
- The slide-out is triggered by clicking "Chat with Agent" button on any agent card
- Pass the agent name to determine which agent persona to use
- Maintain separate chat history per agent (use React state, reset on close or use a Map)
- The slide-out can be closed by clicking X, clicking the overlay, or pressing Escape

## AI SUGGESTIONS PAGE (suggestions/page.tsx) — COMPLETE REWRITE

Full page of suggestion cards (not the compact list from the AI page):

**Page Header:**
- "AI Suggestions" title
- "Review and act on AI-generated recommendations" subtitle
- Filter tabs: "Pending" (active), "Accepted", "Rejected", "All"
- Pending count badge on the Pending tab

**Suggestion Cards (full-width cards, stacked vertically):**
Each card:
- Left: Agent icon dot (colored by agent type)
- Header row: Suggestion title (bold) + agent name badge + suggestion_type badge (edit/create/flag/review)
- Description paragraph
- "Suggested Changes" expandable section (if suggestion_type is 'edit'):
  - Show the before/after or the specific changes as formatted text
  - JSON-to-readable formatting for suggested_changes JSONB
- Entity reference: "Affects: {entity_type} — {entity code/title}" with link to the entity
- Confidence meter: horizontal bar with percentage label
  - Green (>0.9): "High Confidence"
  - Yellow (0.75-0.9): "Medium Confidence"
  - Red/Rust (<0.75): "Review Carefully"
- Timestamp: "Suggested 2 hours ago by Policy Guardian"
- Action buttons (right side):
  - "Accept" — green button, updates status, applies changes, writes audit_log
  - "Reject" — red outline button, shows rejection reason textarea, then updates
  - "View Details" — opens relevant entity page in new tab
- Accepted/Rejected cards: show who reviewed, when, and any notes. Muted/collapsed style.

**Empty State:**
If no suggestions: "All clear! No pending suggestions from your AI team."

**Mock Data:** Same 6 suggestions as the AI page mock data above, but shown in full card format.

Wire all Accept/Reject buttons to real Supabase mutations:
- Accept: UPDATE ai_suggestions SET status='accepted', reviewed_by=auth.uid(), reviewed_at=now()
- Reject: UPDATE ai_suggestions SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), review_notes={reason}
- Write to audit_log on every action
- Refetch list after action

DO NOT touch: dashboard, controls, vault, qm, capa, settings, auth, layout (header/sidebar/right-aside), calendar, checkpoints, evidence, reports, or any files not listed above.
