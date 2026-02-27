import { NextRequest, NextResponse } from 'next/server';

// TODO: Replace mock responses with real Anthropic Claude integration
// import { anthropic } from '@ai-sdk/anthropic';
// import { generateText } from 'ai';

// ── Calendar / checkpoint-specific insight responses ───────────────────────
// These are returned when the checkpoint popover requests an AI insight
// for a specific checkpoint title + standard + status.
// The compliance_monitor agent handles these via keyword matching below.
const CHECKPOINT_INSIGHTS: Record<string, string> = {
  'oig exclusion':
    'OIG exclusion screening is a monthly regulatory requirement. Verify all current staff and contractors against the OIG LEIE database and document the results with a dated screenshot. Any match requires immediate HR escalation.',
  'hipaa':
    'HIPAA checkpoints require documented evidence of the specific activity — screenshots, logs, or signed records. Incomplete attestation without evidence is a compliance gap that survives audits poorly.',
  'fire drill':
    'Fire drill documentation must include the date, time, staff present, any deficiencies noted, and corrective actions taken. A photo of the log board or a completed drill form qualifies as evidence.',
  'credential':
    'Credential verification requires current license copies, primary source verification results, and expiration date tracking. AHCCCS requires credentials verified before first patient contact and at each renewal.',
  'medication':
    'Medication count and storage checks need a log signed by two staff members. Temperature logs for refrigerated medications must be continuous — a single missing day can trigger a regulatory citation.',
  'incident':
    'Incident reports must be completed within 24 hours of the event. Late filing is independently cited as a deficiency regardless of the incident outcome. Attach the completed report as evidence.',
  'training':
    'Staff training records must show completion date, trainer name, topic covered, and staff signature. AHCCCS requires training verification at hire and annually. Upload the sign-in sheet or LMS completion certificate.',
  'chart audit':
    'Chart audits should sample at least 10% of active records or a minimum of 5 charts. Document the audit tool used, scores per domain, and any corrective action plans generated.',
  'safety inspection':
    'Physical safety inspections require a completed checklist covering exits, fire suppression, sharps disposal, and hazardous materials storage. Photo evidence of corrected deficiencies strengthens the audit record.',
  'grievance':
    'Grievance logs must be reviewed monthly and show that each complaint received a timely response. AHCCCS requires resolution documentation within 45 days for standard grievances.',
  'treatment plan':
    'Treatment plans must be reviewed and updated per program frequency requirements — typically every 30 days for IOP and every 60–90 days for residential. Missing signature dates are the most common audit finding.',
  'background check':
    'Background check audits verify that checks were completed prior to hire, meet the statutory lookback period, and are renewed per AHCCCS schedule. Fingerprint clearance cards must be on file for all clinical staff.',
  'telehealth':
    'Telehealth compliance requires documented informed consent for virtual sessions, HIPAA-compliant platform use, and verification that the client is in a private location. Keep platform audit logs as evidence.',
  'capa':
    'CAPA follow-up reviews should verify that corrective actions were implemented as planned, that root cause analysis is documented, and that the issue has not recurred. Closed CAPAs need a verified-by signature.',
  'default':
    'This checkpoint documents a required compliance activity. Ensure the test procedure has been followed completely, required evidence has been uploaded, and the attestation reflects the actual outcome — not what you wish it were.',
};

const AGENT_RESPONSES: Record<string, Record<string, string>> = {
  policy_guardian: {
    default:
      "I've reviewed your organization's policy library. Currently, all policies are up to date, though I've flagged a potential conflict between your HIPAA Privacy Policy and the new Telehealth procedures regarding patient data handling during virtual sessions. I recommend reviewing Section 4.2 of POL-HIPAA-001.",
    conflict:
      "I detected 3 potential policy conflicts:\n\n1. **HIPAA Privacy vs. Telehealth** — Patient data retention periods differ (30 days vs 90 days)\n2. **Safety Protocol vs. Emergency Procedures** — Conflicting escalation chains for after-hours incidents\n3. **HR Onboarding vs. Credentialing** — Background check requirements reference different OIG exclusion list versions\n\nI recommend addressing the HIPAA/Telehealth conflict first as it has the highest compliance risk.",
    review:
      "Here's your upcoming policy review schedule:\n\n- **POL-HIPAA-001** — HIPAA Privacy Policy: Due March 15, 2026\n- **POL-SAFE-001** — Safety Protocols: Due March 30, 2026\n- **POL-HR-003** — Staff Credentialing: Due April 12, 2026\n- **POL-CLIN-002** — Clinical Documentation: Due April 30, 2026\n\nAll 4 policies are currently in 'effective' status. Would you like me to initiate the review workflow for any of them?",
    hipaa:
      "Your HIPAA compliance posture looks strong overall. Key findings:\n\n- **Privacy Policy**: Effective, last reviewed January 2026\n- **Security Rule compliance**: 12/14 checkpoints passed this quarter\n- **Breach Notification**: Procedure is current and tested\n- **Business Associate Agreements**: 3 of 5 due for renewal\n\nThe main area of concern is the 2 failed security checkpoints related to access log reviews. I've created a suggestion to add a monthly access log review checkpoint.",
    changes:
      "Recent policy changes in the last 30 days:\n\n1. **POL-HIPAA-001 v3** — Updated Section 4.2 to reflect 2026 HITECH amendments (Approved Feb 10)\n2. **POL-CLIN-001 v2** — Added telehealth documentation requirements (Pending review)\n3. **POL-SAFE-002 v4** — Updated fire drill frequency from semi-annual to quarterly (Effective Feb 1)\n\nNo conflicts detected between these updates and existing policies.",
  },
  compliance_monitor: {
    default:
      "Here's your compliance overview for February 2026:\n\n- **24 checkpoints** generated for the month\n- **18 completed** (75% completion rate)\n- **2 overdue** — OIG Exclusion Screening and Fire Drill Documentation\n- **4 pending** with due dates this week\n\nI've sent reminders to the assigned staff members for the overdue items. Would you like me to escalate any of these?",
    overdue:
      "Current overdue checkpoints:\n\n1. **OIG-SCR-001** — OIG Exclusion Screening (Due: Feb 15) — Assigned to Sarah Chen\n   - Missing: Updated exclusion list verification\n   - Risk: HIGH — regulatory requirement\n\n2. **SAFE-FD-001** — Fire Drill Documentation (Due: Feb 20) — Assigned to Mike Torres\n   - Missing: February fire drill log upload\n   - Risk: MEDIUM — safety compliance\n\nBoth staff members have been notified 3 times. I recommend escalating to their supervisors.",
    summary:
      "**February 2026 Monthly Summary:**\n\n| Category | Completed | Total | Rate |\n|----------|-----------|-------|------|\n| OIG | 4 | 5 | 80% |\n| HIPAA | 6 | 6 | 100% |\n| Safety | 3 | 5 | 60% |\n| Clinical | 5 | 5 | 100% |\n| HR | 0 | 3 | 0% |\n\nOverall audit readiness score: **78%** (up from 72% last month). HR checkpoints are the main gap — credentialing verifications haven't started yet.",
    risk:
      "Top risk areas identified:\n\n1. **Staff Credentialing** — 3 employees have credentials expiring within 30 days\n2. **Fire Safety** — February drill not documented, March drill due in 5 days\n3. **OIG Screening** — Monthly screening overdue by 12 days\n4. **Medication Reconciliation** — No checkpoint exists for this (recommending creation)\n\nI've generated suggestions for corrective actions on items 1-3.",
    assignments:
      "Current staff checkpoint assignments:\n\n- **Sarah Chen** (Compliance): 8 checkpoints, 6 completed, 1 overdue\n- **Mike Torres** (Ops): 5 checkpoints, 3 completed, 1 overdue\n- **David Kim** (Clinical): 6 checkpoints, 5 completed\n- **Lisa Patel** (HR): 3 checkpoints, 0 completed\n- **James Wong** (Supervisor): 2 checkpoints, 2 completed\n\nLisa Patel has the lowest completion rate. Consider reassigning or providing additional support.",
  },
  evidence_librarian: {
    default:
      "Evidence library status for February 2026:\n\n- **38 evidence items** tracked across all checkpoints\n- **4 checkpoints** are missing required evidence\n- **3 audit binders** organized (Q4 2025, January 2026, February 2026)\n\nThe February binder is 82% complete. Missing items are primarily fire drill logs and credential verification documents.",
    missing:
      "Checkpoints with missing evidence:\n\n1. **SAFE-FD-001** — Fire Drill Documentation\n   - Required: Fire drill log, evacuation route photo\n   - Status: Checkpoint passed but NO evidence uploaded\n\n2. **OIG-SCR-001** — OIG Exclusion Screening\n   - Required: Exclusion list search results\n   - Status: Overdue, no evidence\n\n3. **HR-CRED-002** — License Verification\n   - Required: License copies, verification confirmations\n   - Status: Not started\n\n4. **HIPAA-TRAIN-001** — HIPAA Training Records\n   - Required: Training completion certificates\n   - Status: Passed, 2 of 5 certificates uploaded",
    audit:
      "Audit readiness by evidence completeness:\n\n- **OIG Standard**: 80% evidence coverage (4/5 checkpoints documented)\n- **HIPAA Standard**: 83% evidence coverage (5/6 checkpoints documented)\n- **Safety Standard**: 40% evidence coverage (2/5 — biggest gap)\n- **Clinical Standard**: 100% evidence coverage\n- **HR Standard**: 0% evidence coverage (0/3)\n\nTo reach 90% audit readiness, focus on Safety and HR evidence uploads first.",
    gaps:
      "Evidence gap analysis:\n\n**Critical gaps** (audit risk):\n- Fire drill logs for February — needed for Safety compliance\n- OIG exclusion screening results — regulatory requirement\n- Staff credential copies for 3 employees — AHCCCS requirement\n\n**Moderate gaps:**\n- HIPAA training certificates — 3 of 5 missing\n- Incident report follow-up documentation — 1 open item\n\n**Recommendation:** Schedule a 30-minute evidence upload session with each department lead this week.",
    binders:
      "Audit binder status:\n\n**Q4 2025 Binder** — Complete (archived)\n- 45 evidence items across 6 standards\n- Audit readiness: 91%\n\n**January 2026 Binder** — Complete\n- 38 evidence items\n- Audit readiness: 85%\n\n**February 2026 Binder** — In Progress\n- 31 of 38 expected evidence items\n- Audit readiness: 78%\n- Gaps: Safety (2), HR (3), HIPAA (2)",
  },
  qm_orchestrator: {
    default:
      "QM meeting preparation status:\n\n- **February 2026 QM meeting**: Scheduled for March 5\n- **Packet status**: Draft ready, pending final data\n- **Findings**: 8 new findings this month\n- **Open CAPAs**: 3 active, 1 pending verification\n\nThe executive summary draft is ready for review. Would you like me to walk through the key findings?",
    packet:
      "February QM Packet Status:\n\n**Sections complete:**\n- Executive Summary (draft)\n- Checkpoint Completion Report\n- Audit Readiness Score Trends\n- Open CAPA Summary\n\n**Sections pending:**\n- Final evidence gap analysis (waiting on Feb 28 data)\n- Department-specific metrics\n- Corrective action updates from 2 department leads\n\n**Meeting agenda:**\n1. Review audit readiness score (78% current)\n2. Discuss 3 critical findings\n3. CAPA progress review\n4. Staff credentialing deadline decisions\n5. Action items and assignments",
    findings:
      "Current findings for committee review:\n\n1. **Critical** — Staff credentials expiring without renewal plan (HR)\n2. **High** — Consecutive months of missed fire drill documentation (Safety)\n3. **High** — OIG screening delays exceeding 15 days (Compliance)\n4. **Medium** — HIPAA training completion rate below 80% target\n5. **Medium** — Medication reconciliation process not formalized\n6. **Medium** — Incident reporting follow-up exceeding 72-hour window\n7. **Low** — Policy cross-reference inconsistencies (3 policies)\n8. **Low** — Evidence naming convention not standardized\n\nFindings 1-3 require immediate corrective action plans.",
    capa:
      "Open CAPA Overview:\n\n1. **CAPA-2026-001** — Credential Tracking Process Improvement\n   - Status: In Progress | Due: March 15\n   - Root cause: No automated expiration tracking\n   - Corrective action: Implement credential tracking dashboard\n\n2. **CAPA-2026-002** — Fire Drill Documentation Workflow\n   - Status: In Progress | Due: March 1\n   - Root cause: Paper-based process with no accountability\n   - Corrective action: Digital drill checklist with required photo upload\n\n3. **CAPA-2026-003** — OIG Screening Automation\n   - Status: Pending Verification | Due: Feb 28\n   - Root cause: Manual process prone to delays\n   - Corrective action: Automated monthly screening via API\n\nAll CAPAs are tracking to their due dates.",
    trends:
      "Audit Readiness Score Trends (6-month):\n\n| Month | Score | Change |\n|-------|-------|--------|\n| Sep 2025 | 65% | — |\n| Oct 2025 | 68% | +3% |\n| Nov 2025 | 71% | +3% |\n| Dec 2025 | 72% | +1% |\n| Jan 2026 | 75% | +3% |\n| Feb 2026 | 78% | +3% |\n\n**Trending upward** at ~3% per month. At this rate, you'll reach the 90% target by May 2026. Key drivers: improved checkpoint completion and evidence collection processes.",
  },
};

function getCheckpointInsight(message: string): string {
  const lower = message.toLowerCase();
  for (const [keyword, insight] of Object.entries(CHECKPOINT_INSIGHTS)) {
    if (keyword !== 'default' && lower.includes(keyword)) return insight;
  }
  return CHECKPOINT_INSIGHTS.default;
}

function getResponse(agent: string, message: string): string {
  const agentResponses = AGENT_RESPONSES[agent] ?? AGENT_RESPONSES.policy_guardian;
  const lower = message.toLowerCase();

  // ── Calendar / checkpoint popover insight queries ──────────────────────
  // Pattern: "Brief insight for {standard} checkpoint: "{title}" (status: {status})"
  if (lower.includes('brief insight') && lower.includes('checkpoint')) {
    return getCheckpointInsight(message);
  }

  // ── Create checkpoint intent (AI can suggest creating a checkpoint) ────
  if (lower.includes('create') && lower.includes('checkpoint')) {
    return 'To create a new checkpoint, click any day on the calendar and the checkpoint panel will open in create mode. Select the relevant control, assign it to a staff member, set the due date, and save. The AI Compliance Monitor will automatically include it in the monthly summary and send reminders to the assignee.';
  }

  // ── Calendar-specific queries ──────────────────────────────────────────
  if (lower.includes('calendar') || lower.includes('schedule') || lower.includes('due this') || lower.includes('what is due')) {
    return "Here's what's on the compliance calendar for this month:\n\n- **2 checkpoints** are overdue — OIG Exclusion Screening and CAPA Follow-Up Review\n- **4 checkpoints** are due this week with no evidence uploaded yet\n- **18 of 28** checkpoints are completed for the month\n\nI recommend prioritizing the overdue items immediately. Click on the flagged days (highlighted in red) to open the checkpoint panel and upload evidence.";
  }

  // Keyword matching per agent
  if (agent === 'policy_guardian') {
    if (lower.includes('conflict')) return agentResponses.conflict;
    if (lower.includes('review') || lower.includes('schedule')) return agentResponses.review;
    if (lower.includes('hipaa')) return agentResponses.hipaa;
    if (lower.includes('change') || lower.includes('recent')) return agentResponses.changes;
  } else if (agent === 'compliance_monitor') {
    if (lower.includes('overdue')) return agentResponses.overdue;
    if (lower.includes('summary') || lower.includes('monthly')) return agentResponses.summary;
    if (lower.includes('risk')) return agentResponses.risk;
    if (lower.includes('assign') || lower.includes('staff')) return agentResponses.assignments;
  } else if (agent === 'evidence_librarian') {
    if (lower.includes('missing')) return agentResponses.missing;
    if (lower.includes('audit') || lower.includes('readiness')) return agentResponses.audit;
    if (lower.includes('gap')) return agentResponses.gaps;
    if (lower.includes('binder')) return agentResponses.binders;
  } else if (agent === 'qm_orchestrator') {
    if (lower.includes('packet') || lower.includes('status')) return agentResponses.packet;
    if (lower.includes('finding')) return agentResponses.findings;
    if (lower.includes('capa')) return agentResponses.capa;
    if (lower.includes('trend')) return agentResponses.trends;
  }

  return agentResponses.default;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, agent } = body as { message: string; agent: string; orgId: string };

  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

  const response = getResponse(agent, message);

  return NextResponse.json({
    message: response,
  });
}
