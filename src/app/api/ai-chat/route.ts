import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

// ── Calendar / checkpoint-specific insight responses (fallback) ──────────
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
    'This checkpoint documents a required compliance activity. Ensure the test procedure has been followed completely, required evidence has been uploaded, and the attestation reflects the actual outcome.',
};

function getCheckpointInsight(message: string): string {
  const lower = message.toLowerCase();
  for (const [keyword, insight] of Object.entries(CHECKPOINT_INSIGHTS)) {
    if (keyword !== 'default' && lower.includes(keyword)) return insight;
  }
  return CHECKPOINT_INSIGHTS.default;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  compliance_monitor: `You are the REPrieve.ai Compliance Monitor agent for an Arizona behavioral health organization running IOP and Residential programs. You help staff manage compliance checkpoints, track overdue items, analyze failure patterns, and maintain audit readiness. Keep responses concise and actionable. Use markdown tables when presenting data. Reference specific control codes (e.g., OIG-SCR-001) and standards (OIG, HIPAA, AHCCCS, Safety, HR, Operations).`,
  policy_guardian: `You are the REPrieve.ai Policy Guardian agent. You help manage organizational policies for an Arizona behavioral health compliance program. You review policies for conflicts, flag upcoming review dates, suggest updates based on regulatory changes, and maintain cross-references between related policies. Keep responses concise and actionable.`,
  evidence_librarian: `You are the REPrieve.ai Evidence Librarian agent. You help organize audit-ready evidence for an Arizona behavioral health compliance program. You track which checkpoints have evidence uploaded, identify gaps, organize audit binders by period and standard, and ensure nothing falls through the cracks. Keep responses concise and actionable.`,
  qm_orchestrator: `You are the REPrieve.ai QM Orchestrator agent. You help prepare monthly Quality Management meetings for an Arizona behavioral health organization. You assemble meeting packets, draft executive summaries, compile findings and trends, track open CAPAs, and calculate audit readiness scores. Keep responses concise and actionable.`,
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, agent } = body as { message: string; agent: string; orgId: string };

  // Fast path: checkpoint popover insight queries use pre-written domain knowledge
  const lower = message.toLowerCase();
  if (lower.includes('brief insight') && lower.includes('checkpoint')) {
    return NextResponse.json({ message: getCheckpointInsight(message) });
  }

  // Use real Claude if ANTHROPIC_API_KEY is set
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const systemPrompt = SYSTEM_PROMPTS[agent] ?? SYSTEM_PROMPTS.compliance_monitor;

      const { text } = await generateText({
        model: anthropic('claude-sonnet-4-5-20250929'),
        system: systemPrompt,
        prompt: message,
        maxOutputTokens: 1024,
      });

      return NextResponse.json({ message: text });
    } catch (err) {
      console.error('AI chat error:', err);
      // Fall through to fallback
    }
  }

  // Fallback: keyword-matched responses when no API key
  const response = getFallbackResponse(agent, message);
  return NextResponse.json({ message: response });
}

// ── Fallback responses (used when ANTHROPIC_API_KEY is not set) ──────────

const AGENT_RESPONSES: Record<string, Record<string, string>> = {
  policy_guardian: {
    default:
      "I've reviewed your organization's policy library. Currently, all policies are up to date, though I've flagged a potential conflict between your HIPAA Privacy Policy and the new Telehealth procedures regarding patient data handling during virtual sessions. I recommend reviewing Section 4.2 of POL-HIPAA-001.",
    conflict:
      "I detected 3 potential policy conflicts:\n\n1. **HIPAA Privacy vs. Telehealth** — Patient data retention periods differ (30 days vs 90 days)\n2. **Safety Protocol vs. Emergency Procedures** — Conflicting escalation chains for after-hours incidents\n3. **HR Onboarding vs. Credentialing** — Background check requirements reference different OIG exclusion list versions\n\nI recommend addressing the HIPAA/Telehealth conflict first as it has the highest compliance risk.",
    review:
      "Here's your upcoming policy review schedule:\n\n- **POL-HIPAA-001** — HIPAA Privacy Policy: Due March 15, 2026\n- **POL-SAFE-001** — Safety Protocols: Due March 30, 2026\n- **POL-HR-003** — Staff Credentialing: Due April 12, 2026\n- **POL-CLIN-002** — Clinical Documentation: Due April 30, 2026\n\nAll 4 policies are currently in 'effective' status. Would you like me to initiate the review workflow for any of them?",
  },
  compliance_monitor: {
    default:
      "Here's your compliance overview:\n\n- **24 checkpoints** generated for the month\n- **18 completed** (75% completion rate)\n- **2 overdue** — Check the calendar for red-flagged items\n- **4 pending** with due dates this week\n\nI've sent reminders to the assigned staff members for the overdue items.",
    overdue:
      "Current overdue checkpoints require immediate attention. Check the calendar for items highlighted in red — these need evidence uploaded and attestation completed. I recommend escalating items overdue by more than 7 days to supervisors.",
    summary:
      "Monthly compliance summary is available in the QM Workbench. Click 'Refresh from Calendar' to pull the latest checkpoint data into your QM meeting packet.",
  },
  evidence_librarian: {
    default:
      "Evidence library status: Check the Evidence Binder page for a complete breakdown by standard. Missing evidence items are highlighted in red. Upload evidence through the calendar checkpoint popover.",
    missing:
      "Missing evidence items are tracked on the Evidence Binder page. Each standard shows its coverage percentage. Focus on standards below 80% coverage first.",
  },
  qm_orchestrator: {
    default:
      "QM meeting preparation: Use the 'Refresh from Calendar' button on the QM Workbench to auto-populate your meeting with the latest checkpoint data, audit readiness scores, and findings.",
  },
};

function getFallbackResponse(agent: string, message: string): string {
  const agentResponses = AGENT_RESPONSES[agent] ?? AGENT_RESPONSES.compliance_monitor;
  const lower = message.toLowerCase();

  if (agent === 'policy_guardian') {
    if (lower.includes('conflict')) return agentResponses.conflict ?? agentResponses.default;
    if (lower.includes('review') || lower.includes('schedule')) return agentResponses.review ?? agentResponses.default;
  } else if (agent === 'compliance_monitor') {
    if (lower.includes('overdue')) return agentResponses.overdue ?? agentResponses.default;
    if (lower.includes('summary') || lower.includes('monthly')) return agentResponses.summary ?? agentResponses.default;
  } else if (agent === 'evidence_librarian') {
    if (lower.includes('missing')) return agentResponses.missing ?? agentResponses.default;
  }

  return agentResponses.default;
}
