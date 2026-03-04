import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// ── Control definitions ────────────────────────────────────────────────────
const CONTROLS = [
  {
    code: 'GOV-QM-001',
    title: 'Governance & Quality (QM/PI) checkpoint',
    standard: 'Internal',
    category: 'Quality Management',
    test_procedure: 'Review QM/PI meeting minutes, action items, and governance documents. Verify quorum, agenda completion, and follow-through on prior action items.',
    required_evidence: ['Meeting minutes', 'Attendance sheet', 'Action item tracker'],
    frequency: 'monthly',
    default_owner_role: 'ops',
    assignee_name: 'Wayne',
  },
  {
    code: 'CLIN-DOC-001',
    title: 'Clinical documentation & safety chart audit',
    standard: 'AHCCCS',
    category: 'Clinical',
    test_procedure: 'Audit a random sample of clinical charts for documentation completeness, treatment plan currency, and safety planning compliance.',
    required_evidence: ['Audit tool / scoring sheet', 'De-identified chart list', 'Corrective action notes'],
    frequency: 'monthly',
    default_owner_role: 'clinical',
    assignee_name: 'Emily',
  },
  {
    code: 'WORK-COMP-001',
    title: 'Workforce: training, competency, and personnel-file audit',
    standard: 'HR',
    category: 'Workforce',
    test_procedure: 'Verify training completion rates, competency documentation, and personnel file completeness (licenses, background checks, annual reviews).',
    required_evidence: ['Training completion report', 'Competency checklists', 'Personnel file audit log'],
    frequency: 'monthly',
    default_owner_role: 'hr',
    assignee_name: 'Brian',
  },
  {
    code: 'ENV-CARE-001',
    title: 'Environment of Care / Life Safety / Infection Control rounds',
    standard: 'Safety',
    category: 'Facility',
    test_procedure: 'Conduct facility walk-through covering life safety systems, infection control protocols, hazardous materials storage, and general environment of care standards.',
    required_evidence: ['Inspection checklist', 'Photos of findings', 'Work order / corrective action log'],
    frequency: 'monthly',
    default_owner_role: 'ops',
    assignee_name: 'Wayne',
  },
  {
    code: 'BILL-INT-001',
    title: 'Billing/encounter integrity & timely filing checkpoint',
    standard: 'Operations',
    category: 'Billing',
    test_procedure: 'Review a sample of claims for encounter data accuracy, timely filing compliance, and unbundling or upcoding flags.',
    required_evidence: ['Claims sample report', 'Timely filing log', 'Denial/rejection summary'],
    frequency: 'monthly',
    default_owner_role: 'billing',
    assignee_name: 'Brian',
  },
  {
    code: 'EMER-DRILL-001',
    title: 'Quarterly disaster drill (each shift) + after-action review',
    standard: 'Safety',
    category: 'Emergency Preparedness',
    test_procedure: 'Conduct tabletop or functional disaster drill covering all shifts. Document participation, gaps identified, and corrective actions from after-action review.',
    required_evidence: ['Drill sign-in sheets (all shifts)', 'After-action review report', 'Corrective action plan'],
    frequency: 'quarterly',
    default_owner_role: 'ops',
    assignee_name: 'Wayne',
  },
  {
    code: 'EMER-READY-001',
    title: "Quarterly '2-hour readiness' document retrieval drill",
    standard: 'Safety',
    category: 'Emergency Preparedness',
    test_procedure: "Simulate a regulator request requiring retrieval of critical compliance documents within 2 hours. Document retrieval times, gaps, and remediation.",
    required_evidence: ['Drill log with timestamps', 'Document retrieval checklist', 'Gap analysis notes'],
    frequency: 'quarterly',
    default_owner_role: 'ops',
    assignee_name: 'Wayne',
  },
  {
    code: 'HIPAA-PRIV-001',
    title: 'Quarterly privacy & consent controls review (HIPAA + Part 2 if applicable)',
    standard: 'HIPAA',
    category: 'Privacy',
    test_procedure: 'Review consent form currency, access log audits, privacy notice distribution records, and Part 42 CFR Part 2 compliance if applicable.',
    required_evidence: ['Consent audit log', 'Access log review summary', 'Privacy notice distribution records'],
    frequency: 'quarterly',
    default_owner_role: 'compliance',
    assignee_name: 'Brian',
  },
  {
    code: 'SAFETY-WV-001',
    title: 'Annual workplace violence worksite analysis & mitigation plan refresh',
    standard: 'Safety',
    category: 'Workplace Safety',
    test_procedure: 'Conduct annual worksite analysis per OSHA guidelines. Review incident data, update risk assessments, and refresh the workplace violence prevention plan.',
    required_evidence: ['Worksite analysis report', 'Updated mitigation plan', 'Staff acknowledgment records'],
    frequency: 'annual',
    default_owner_role: 'compliance',
    assignee_name: 'Brian',
  },
  {
    code: 'HIPAA-RISK-001',
    title: 'Annual HIPAA security risk analysis + remediation plan',
    standard: 'HIPAA',
    category: 'Privacy',
    test_procedure: 'Perform full HIPAA Security Rule risk analysis. Identify and document vulnerabilities, rate risk levels, and produce a remediation plan with timelines.',
    required_evidence: ['Risk analysis report', 'Remediation plan with due dates', 'Vendor BAA inventory'],
    frequency: 'annual',
    default_owner_role: 'compliance',
    assignee_name: 'Brian',
  },
  {
    code: 'QM-EVAL-001',
    title: 'Annual Quality Management Program evaluation + governing authority review',
    standard: 'Internal',
    category: 'Quality Management',
    test_procedure: 'Evaluate the annual effectiveness of the QM program against goals. Present findings to governing authority. Document approval of updated QM plan.',
    required_evidence: ['Annual QM evaluation report', 'Governing authority meeting minutes', 'Updated QM program plan'],
    frequency: 'annual',
    default_owner_role: 'compliance',
    assignee_name: 'Brian',
  },
  {
    code: 'EMER-EVAC-001',
    title: 'Semiannual evacuation drill (each shift) + documentation review',
    standard: 'Safety',
    category: 'Emergency Preparedness',
    test_procedure: 'Conduct evacuation drill covering all shifts. Time and document the drill. Review evacuation routes, assembly points, and staff roles post-drill.',
    required_evidence: ['Drill sign-in sheets (all shifts)', 'Drill timing log', 'After-action notes'],
    frequency: 'semi_annual',
    default_owner_role: 'ops',
    assignee_name: 'Wayne',
  },
  {
    code: 'AUDIT-STRESS-001',
    title: 'Year-end compliance system stress test (mock survey / tracer day)',
    standard: 'Internal',
    category: 'Compliance',
    test_procedure: 'Run a full mock survey / tracer day simulating an AHCCCS, TJC, or CARF visit. Use actual survey tools. Document all findings and corrective actions.',
    required_evidence: ['Mock survey tool with scores', 'Tracer audit records', 'Corrective action plan'],
    frequency: 'annual',
    default_owner_role: 'compliance',
    assignee_name: 'Brian',
  },
] as const;

// ── Checkpoint schedule: { date, control_code, assignee_name } ─────────────
// Exact dates provided for March 2026 through March 2027.
// Assignments: Emily = clinical, Jericho = clinical (alternating), Wayne = facility/safety/ops, Brian = compliance/HR/billing
const SCHEDULE: { date: string; code: string; assignee: string }[] = [
  // ── March 2026 ──────────────────────────────────────────────
  { date: '2026-03-10', code: 'SAFETY-WV-001',   assignee: 'Brian' },   // Annual workplace violence worksite analysis
  { date: '2026-03-10', code: 'HIPAA-RISK-001',  assignee: 'Brian' },   // Annual HIPAA security risk analysis
  { date: '2026-03-10', code: 'QM-EVAL-001',     assignee: 'Brian' },   // Annual QM Program evaluation
  { date: '2026-03-12', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-03-19', code: 'CLIN-DOC-001',    assignee: 'Emily' },   // Clinical documentation & safety chart audit
  { date: '2026-03-21', code: 'EMER-DRILL-001',  assignee: 'Wayne' },   // Quarterly disaster drill
  { date: '2026-03-21', code: 'EMER-READY-001',  assignee: 'Wayne' },   // Quarterly 2-hour readiness drill
  { date: '2026-03-21', code: 'HIPAA-PRIV-001',  assignee: 'Brian' },   // Quarterly privacy & consent controls
  { date: '2026-03-26', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce training & competency audit

  // ── April 2026 ──────────────────────────────────────────────
  { date: '2026-04-02', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2026-04-04', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-04-09', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-04-16', code: 'CLIN-DOC-001',    assignee: 'Jericho' }, // Clinical documentation
  { date: '2026-04-23', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit
  { date: '2026-04-25', code: 'EMER-EVAC-001',   assignee: 'Wayne' },   // Semiannual evacuation drill
  { date: '2026-04-30', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds

  // ── May 2026 ────────────────────────────────────────────────
  { date: '2026-05-02', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-05-14', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-05-21', code: 'CLIN-DOC-001',    assignee: 'Emily' },   // Clinical documentation
  { date: '2026-05-28', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit

  // ── June 2026 ───────────────────────────────────────────────
  { date: '2026-06-04', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2026-06-06', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-06-11', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-06-18', code: 'CLIN-DOC-001',    assignee: 'Jericho' }, // Clinical documentation
  { date: '2026-06-20', code: 'EMER-DRILL-001',  assignee: 'Wayne' },   // Quarterly disaster drill
  { date: '2026-06-20', code: 'EMER-READY-001',  assignee: 'Wayne' },   // Quarterly 2-hour readiness drill
  { date: '2026-06-20', code: 'HIPAA-PRIV-001',  assignee: 'Brian' },   // Quarterly privacy & consent controls
  { date: '2026-06-25', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit

  // ── July 2026 ───────────────────────────────────────────────
  { date: '2026-07-02', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2026-07-04', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-07-09', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-07-16', code: 'CLIN-DOC-001',    assignee: 'Emily' },   // Clinical documentation
  { date: '2026-07-23', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit
  { date: '2026-07-30', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds

  // ── August 2026 ─────────────────────────────────────────────
  { date: '2026-08-08', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-08-13', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-08-20', code: 'CLIN-DOC-001',    assignee: 'Jericho' }, // Clinical documentation
  { date: '2026-08-27', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit

  // ── September 2026 ──────────────────────────────────────────
  { date: '2026-09-03', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2026-09-05', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-09-10', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-09-17', code: 'CLIN-DOC-001',    assignee: 'Emily' },   // Clinical documentation
  { date: '2026-09-19', code: 'EMER-DRILL-001',  assignee: 'Wayne' },   // Quarterly disaster drill
  { date: '2026-09-19', code: 'EMER-READY-001',  assignee: 'Wayne' },   // Quarterly 2-hour readiness drill
  { date: '2026-09-19', code: 'HIPAA-PRIV-001',  assignee: 'Brian' },   // Quarterly privacy & consent controls
  { date: '2026-09-24', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit

  // ── October 2026 ────────────────────────────────────────────
  { date: '2026-10-01', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2026-10-03', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-10-15', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-10-22', code: 'CLIN-DOC-001',    assignee: 'Jericho' }, // Clinical documentation
  { date: '2026-10-24', code: 'EMER-EVAC-001',   assignee: 'Wayne' },   // Semiannual evacuation drill
  { date: '2026-10-29', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit

  // ── November 2026 ───────────────────────────────────────────
  { date: '2026-11-05', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2026-11-07', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-11-12', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-11-19', code: 'CLIN-DOC-001',    assignee: 'Emily' },   // Clinical documentation
  { date: '2026-11-26', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit

  // ── December 2026 ───────────────────────────────────────────
  { date: '2026-12-03', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2026-12-05', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2026-12-10', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2026-12-17', code: 'CLIN-DOC-001',    assignee: 'Jericho' }, // Clinical documentation
  { date: '2026-12-19', code: 'EMER-DRILL-001',  assignee: 'Wayne' },   // Quarterly disaster drill
  { date: '2026-12-19', code: 'EMER-READY-001',  assignee: 'Wayne' },   // Quarterly 2-hour readiness drill
  { date: '2026-12-19', code: 'HIPAA-PRIV-001',  assignee: 'Brian' },   // Quarterly privacy & consent controls
  { date: '2026-12-24', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit
  { date: '2026-12-31', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds (year-end)

  // ── January 2027 ────────────────────────────────────────────
  { date: '2027-01-02', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2027-01-14', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2027-01-21', code: 'CLIN-DOC-001',    assignee: 'Emily' },   // Clinical documentation
  { date: '2027-01-28', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit

  // ── February 2027 ───────────────────────────────────────────
  { date: '2027-02-04', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2027-02-06', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
  { date: '2027-02-11', code: 'GOV-QM-001',      assignee: 'Wayne' },   // Governance & Quality (QM/PI)
  { date: '2027-02-18', code: 'CLIN-DOC-001',    assignee: 'Jericho' }, // Clinical documentation
  { date: '2027-02-25', code: 'WORK-COMP-001',   assignee: 'Brian' },   // Workforce audit

  // ── March 2027 ──────────────────────────────────────────────
  { date: '2027-03-02', code: 'AUDIT-STRESS-001',assignee: 'Brian' },   // Year-end compliance stress test (mock survey)
  { date: '2027-03-04', code: 'ENV-CARE-001',    assignee: 'Wayne' },   // Environment of Care rounds
  { date: '2027-03-06', code: 'BILL-INT-001',    assignee: 'Brian' },   // Billing/encounter integrity
];

function periodFromDate(dateStr: string): string {
  return dateStr.slice(0, 7); // "2026-03"
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const userClient = await createClient();
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get user's org
    const { data: membership } = await admin
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership?.org_id) {
      return NextResponse.json({ error: 'No organization found for this user.' }, { status: 400 });
    }

    const orgId = membership.org_id;

    // Idempotency: check if CHECKPOINTS are already seeded
    const { count: checkpointCount } = await admin
      .from('checkpoints')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if (checkpointCount && checkpointCount > 0) {
      if (force) {
        // Force mode: delete existing checkpoints (and their evidence) then re-insert
        await admin.from('evidence').delete().eq('org_id', orgId);
        await admin.from('checkpoints').delete().eq('org_id', orgId);
      } else {
        return NextResponse.json(
          { error: 'Compliance checkpoints are already loaded for this organization.' },
          { status: 409 }
        );
      }
    }

    // ── 1. Upsert controls (idempotent — safe to re-run) ─────────────────
    const controlRows = CONTROLS.map(c => ({
      org_id: orgId,
      code: c.code,
      title: c.title,
      standard: c.standard,
      category: c.category,
      test_procedure: c.test_procedure,
      required_evidence: c.required_evidence,
      frequency: c.frequency,
      default_owner_role: c.default_owner_role,
      is_active: true,
    }));

    const { data: upsertedControls, error: controlsError } = await admin
      .from('controls')
      .upsert(controlRows, { onConflict: 'org_id,code', ignoreDuplicates: false })
      .select('id, code');

    if (controlsError || !upsertedControls) {
      return NextResponse.json({ error: `Failed to create controls: ${controlsError?.message}` }, { status: 500 });
    }

    // Build code → id map
    const codeToId: Record<string, string> = {};
    for (const c of upsertedControls) {
      codeToId[c.code] = c.id;
    }

    // ── 2. Create checkpoint instances ────────────────────────────────────
    const checkpointRows = SCHEDULE.map(s => ({
      org_id: orgId,
      control_id: codeToId[s.code],
      period: periodFromDate(s.date),
      due_date: s.date,
      status: 'pending',
      assignee_name: s.assignee,
      assigned_to: null,
    }));

    const { error: checkpointsError } = await admin
      .from('checkpoints')
      .insert(checkpointRows);

    if (checkpointsError) {
      // Provide a clear hint if the column is missing
      const hint = checkpointsError.message.includes('assignee_name')
        ? ' Run this in Supabase SQL Editor: ALTER TABLE public.checkpoints ADD COLUMN IF NOT EXISTS assignee_name TEXT;'
        : '';
      return NextResponse.json(
        { error: `Failed to create checkpoints: ${checkpointsError.message}.${hint}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      controls: upsertedControls.length,
      checkpoints: checkpointRows.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
