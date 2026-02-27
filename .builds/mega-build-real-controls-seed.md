Read CLAUDE.md first. Your job is to replace ALL existing mock/seed controls with the REAL Arizona behavioral health compliance controls, and seed ALL 78 real checkpoints for the March 2026 – February 2027 compliance calendar year.

CRITICAL: This is REAL production data, not mock data. Remove ALL existing seed data functions. These controls and checkpoints are the foundation of the entire compliance calendar.

ONLY touch these files (create if needed):
- src/app/(portal)/controls/page.tsx (REWRITE seed data — replace buildSeedControls with real controls)
- src/lib/data/real-controls.ts (CREATE — the 13 real control definitions)
- src/lib/data/real-checkpoints.ts (CREATE — all 78 checkpoint instances with exact dates)
- src/app/actions/seed-compliance-calendar.ts (CREATE — server action to seed controls + checkpoints)
- src/app/(portal)/calendar/seed-button.tsx (CREATE — one-time seed trigger component)

## THE 13 REAL CONTROLS

These replace the old OIG/HIPAA/chart audit seed controls entirely. Use these exact values:

### Control 1: GOV-QM-001
- **Title:** Governance & Quality (QM/PI) checkpoint
- **Domain/Standard:** Quality Management / Governance
- **Category:** Governance
- **Applies To / Program:** ["BHRF", "OTC (IOP)"]
- **Test Procedure:** "Conduct QM/PI committee meeting. Review: previous month's action items and closure status; incident log and trend analysis; corrective action tracker with owner updates; grievance summary; staffing and coverage gaps; high-risk client review. Prepare governing authority report. Document all decisions and action items with owners and due dates."
- **Required Evidence:** ["QM/PI meeting minutes", "Incident log review summary", "Corrective action tracker (updated)", "Governing authority report prep"]
- **Frequency:** monthly
- **Default Owner Role:** compliance

### Control 2: CLN-CHART-001
- **Title:** Clinical documentation & safety chart audit
- **Domain/Standard:** Clinical / Patient Safety / Documentation
- **Category:** Clinical Quality
- **Applies To / Program:** ["BHRF", "OTC (IOP)"]
- **Test Procedure:** "Select sample charts (10% of active census or minimum 5). Audit each chart for: completed consent packet with rights/grievance acknowledgment; comprehensive BH assessment; treatment plan timeliness with measurable goals and required signatures; MBC tool completion at required intervals; suicide screening/assessment and safety/mitigation plan where indicated; discharge planning documentation. Calculate compliance score. Document deficiencies with clinician name. Create corrective action plan if score <90%."
- **Required Evidence:** ["Sample chart audit tool (completed)", "BH assessment completeness check", "Treatment plan timeliness verification", "MBC tool completion log", "Suicide screening/assessment & mitigation plan review", "Discharge planning documentation check"]
- **Frequency:** monthly
- **Default Owner Role:** clinical

### Control 3: HR-WF-001
- **Title:** Workforce: training, competency, and personnel-file audit
- **Domain/Standard:** HR / Training / Competency
- **Category:** Human Resources
- **Applies To / Program:** ["BHRF", "OTC (IOP)"]
- **Test Procedure:** "1. Pull current staff roster and cross-reference against HR files. 2. Verify new-hire competence checklists completed within 30 days. 3. Verify licensure/credential status via state board websites for all licensed staff. 4. Confirm CPR/First Aid certifications current. 5. Check TB evidence on file (required for residential). 6. Verify restraint/seclusion training where applicable. 7. Flag any credentials expiring within 30/60/90 days. 8. Document findings and issue corrective notices for deficiencies."
- **Required Evidence:** ["New-hire competence checklists", "Licensure/credential verification log", "CPR/First Aid certification status", "TB evidence (if residential)", "Restraint/seclusion training records (where applicable)"]
- **Frequency:** monthly
- **Default Owner Role:** hr

### Control 4: EOC-SAFE-001
- **Title:** Environment of Care / Life Safety / Infection Control rounds
- **Domain/Standard:** Environment of Care / Safety / Infection Control
- **Category:** Safety
- **Applies To / Program:** ["BHRF", "OTC (IOP)"]
- **Test Procedure:** "1. Conduct full facility EOC walkthrough using standardized checklist. 2. Perform ligature risk and environmental suicide risk assessment. 3. Inspect medication storage areas: controlled substances locked, temperature within range, expired meds segregated. 4. Review infection control logs and cleaning schedules. 5. Check safety/security incident documentation. 6. Verify fire safety equipment (extinguishers, alarms, exits) and documentation current. 7. Document all findings. 8. Create maintenance/corrective work orders for deficiencies found."
- **Required Evidence:** ["EOC walkthrough checklist (completed)", "Ligature/environmental suicide risk check", "Medication room/storage audit", "Infection control log", "Safety/security incident log", "Fire safety documentation"]
- **Frequency:** monthly
- **Default Owner Role:** ops

### Control 5: BIL-ENC-001
- **Title:** Billing/encounter integrity & timely filing checkpoint
- **Domain/Standard:** Billing / Program Integrity
- **Category:** Billing
- **Applies To / Program:** ["AHCCCS", "Other payers (as applicable)"]
- **Test Procedure:** "1. Run claims/encounter reconciliation for the month. 2. Select sample of encounters and validate claim-to-chart documentation match. 3. For IOP: verify hours/attendance support documentation (H0015/S9480 codes if used). 4. Review denial/appeals log and categorize by reason. 5. Check timely filing compliance — flag any claims approaching filing deadlines. 6. Calculate error rate. 7. Document corrective actions for billing staff based on denial themes."
- **Required Evidence:** ["Claims/encounter reconciliation report", "Sample claim-to-chart validation", "IOP hours/attendance support documentation (H0015/S9480)", "Denial/appeals log"]
- **Frequency:** monthly
- **Default Owner Role:** billing

### Control 6: EM-DRILL-001
- **Title:** Quarterly disaster drill (each shift) + after-action review
- **Domain/Standard:** Emergency Management / Life Safety
- **Category:** Emergency Management
- **Applies To / Program:** ["BHRF (required)", "OTC (best practice if facility-based)"]
- **Test Procedure:** "1. Schedule disaster drill covering each operational shift. 2. Execute drill scenario (fire, natural disaster, active threat, etc.). 3. Document roster of participating staff by shift. 4. Conduct after-action critique immediately following drill. 5. Document critique findings and lessons learned. 6. Assign corrective actions with owners and due dates. 7. Track corrective action closure. 8. File completed drill package."
- **Required Evidence:** ["Drill rosters by shift", "Critique/after-action report", "Corrective actions with closure documentation"]
- **Frequency:** quarterly
- **Default Owner Role:** ops

### Control 7: SR-DOC-001
- **Title:** Quarterly '2-hour readiness' document retrieval drill
- **Domain/Standard:** Survey Readiness / Document Control
- **Category:** Survey Readiness
- **Applies To / Program:** ["BHRF", "OTC (IOP)"]
- **Test Procedure:** "1. Prepare list of documents a surveyor would request (licensing, policies, credentials, QM minutes, safety logs, clinical exemplars). 2. Set timer for 2 hours. 3. Staff must locate and produce every document on the list. 4. Log retrieval times per document. 5. Identify any documents that could not be produced or took >15 minutes to find. 6. Create remediation tasks for gaps. 7. Update document index/filing system as needed."
- **Required Evidence:** ["Timed retrieval test log", "Required documents checklist", "Gap identification and remediation tasks"]
- **Frequency:** quarterly
- **Default Owner Role:** compliance

### Control 8: PRIV-CONSENT-001
- **Title:** Quarterly privacy & consent controls review (HIPAA + Part 2 if applicable)
- **Domain/Standard:** Privacy / Compliance
- **Category:** Privacy & Security
- **Applies To / Program:** ["All programs (especially SUD/Part 2)"]
- **Test Procedure:** "1. Review NPP (Notice of Privacy Practices) and consent form templates for currency. 2. Audit ROI (Release of Information) log for proper documentation and timeliness. 3. Sample access logs for unauthorized or unusual ePHI access patterns. 4. Review breach log — confirm any breaches were reported per HIPAA timelines. 5. If Part 2 applicable: validate Part 2 notice/consent workflow, re-disclosure prohibitions, and qualified service organization agreements. 6. Document findings and corrective actions."
- **Required Evidence:** ["NPP/consent templates (current versions)", "ROI log audit", "Access log sampling results", "Breach log review", "Part 2 notice/consent workflow validation (if applicable)"]
- **Frequency:** quarterly
- **Default Owner Role:** compliance

### Control 9: EM-EVAC-001
- **Title:** Semiannual evacuation drill (each shift) + documentation review
- **Domain/Standard:** Emergency Management / Life Safety
- **Category:** Emergency Management
- **Applies To / Program:** ["BHRF (required)"]
- **Test Procedure:** "1. Schedule evacuation drill covering each operational shift. 2. Activate alarm and conduct full facility evacuation to assembly point. 3. Time evacuation and record. 4. Verify all persons (staff + clients) reached assembly point. 5. Verify posted egress paths are accurate and unobstructed. 6. Document drill results per shift. 7. Conduct debrief and assign corrective actions for deficiencies. 8. Track corrective action closure."
- **Required Evidence:** ["Evacuation drill documentation per shift", "Posted egress path verification", "Corrective actions with closure"]
- **Frequency:** semi_annual
- **Default Owner Role:** ops

### Control 10: EOC-WV-001
- **Title:** Annual workplace violence worksite analysis & mitigation plan refresh
- **Domain/Standard:** Environment of Care / Workplace Violence
- **Category:** Safety
- **Applies To / Program:** ["All programs"]
- **Test Procedure:** "1. Conduct annual worksite analysis for workplace violence risk factors. 2. Review incident trend data for violence-related incidents (aggression, threats, elopement). 3. Update mitigation plan based on analysis findings. 4. Communicate updated plan to all staff. 5. Verify training requirements are current. 6. Document analysis, mitigation actions taken, and staff communication."
- **Required Evidence:** ["Annual worksite analysis report", "Mitigation actions documentation", "Incident trend dashboard (violence-related)", "Staff communication log"]
- **Frequency:** annual
- **Default Owner Role:** ops

### Control 11: PRIV-SEC-001
- **Title:** Annual HIPAA security risk analysis + remediation plan
- **Domain/Standard:** Privacy / Security
- **Category:** Privacy & Security
- **Applies To / Program:** ["All programs"]
- **Test Procedure:** "1. Conduct comprehensive HIPAA security risk analysis covering administrative, physical, and technical safeguards. 2. Identify threats and vulnerabilities to ePHI. 3. Assess current security measures and gaps. 4. Develop risk management/remediation plan with prioritized actions. 5. Review access control policies and audit log sampling. 6. Document remediation timeline with owners. 7. Present findings to leadership/governing authority."
- **Required Evidence:** ["HIPAA security risk analysis report", "Risk management/remediation plan", "Access control review documentation", "Audit log sampling results", "Remediation timeline with owners"]
- **Frequency:** annual
- **Default Owner Role:** compliance

### Control 12: GOV-QMP-001
- **Title:** Annual Quality Management Program evaluation + governing authority review
- **Domain/Standard:** Quality Management / Governance
- **Category:** Governance
- **Applies To / Program:** ["BHRF (required)", "OTC (QM required)"]
- **Test Procedure:** "1. Compile annual QMP evaluation covering all quality objectives and metrics. 2. Analyze results against targets: checkpoint completion, chart audit scores, incident trends, CAPA closure rates, training compliance. 3. Identify areas of improvement and areas needing continued focus. 4. Present evaluation to governing authority for review and approval. 5. Develop next-year work plan with updated objectives. 6. Document governing authority approval and next-year plan."
- **Required Evidence:** ["Annual QMP evaluation document", "Quality objectives and results summary", "Governing authority approval documentation", "Next-year work plan"]
- **Frequency:** annual
- **Default Owner Role:** compliance

### Control 13: SR-MOCK-001
- **Title:** Year-end compliance system stress test (mock survey / tracer day)
- **Domain/Standard:** Survey Readiness / Continuous Compliance
- **Category:** Survey Readiness
- **Applies To / Program:** ["All programs"]
- **Test Procedure:** "1. Conduct full mock survey simulation (1 full day). 2. Pick client tracers: follow 2-3 clients from admission through current treatment (or discharge). 3. Interview staff on workflows, policies, emergency procedures. 4. Test document retrieval for all survey-critical items. 5. Score each domain using survey standards. 6. Document all findings categorized by domain. 7. Create corrective action plan with owners and due dates. 8. Identify training refresh needs and document control gaps. 9. Re-test critical gaps within 30 days."
- **Required Evidence:** ["Tracer findings report", "Corrective action plan", "Training refresh needs assessment", "Document control gap analysis"]
- **Frequency:** annual
- **Default Owner Role:** compliance

## ALL 78 REAL CHECKPOINTS (exact dates from compliance calendar)

Seed these into the checkpoints table. Each checkpoint references a control_id (from the controls above), has a specific due_date, period, and status of 'pending'.

Format: [Control Code] | Due Date | Period

### March 2026
1. EOC-WV-001 | 2026-03-02 | 2026-03
2. PRIV-SEC-001 | 2026-03-02 | 2026-03
3. GOV-QMP-001 | 2026-03-02 | 2026-03
4. GOV-QM-001 | 2026-03-04 | 2026-03
5. CLN-CHART-001 | 2026-03-11 | 2026-03
6. EM-DRILL-001 | 2026-03-13 | 2026-Q1
7. SR-DOC-001 | 2026-03-13 | 2026-Q1
8. PRIV-CONSENT-001 | 2026-03-13 | 2026-Q1
9. HR-WF-001 | 2026-03-18 | 2026-03
10. EOC-SAFE-001 | 2026-03-25 | 2026-03
11. BIL-ENC-001 | 2026-03-27 | 2026-03

### April 2026
12. GOV-QM-001 | 2026-04-01 | 2026-04
13. CLN-CHART-001 | 2026-04-08 | 2026-04
14. HR-WF-001 | 2026-04-15 | 2026-04
15. EM-EVAC-001 | 2026-04-17 | 2026-H1
16. EOC-SAFE-001 | 2026-04-22 | 2026-04
17. BIL-ENC-001 | 2026-04-24 | 2026-04

### May 2026
18. GOV-QM-001 | 2026-05-06 | 2026-05
19. CLN-CHART-001 | 2026-05-13 | 2026-05
20. HR-WF-001 | 2026-05-20 | 2026-05
21. EOC-SAFE-001 | 2026-05-27 | 2026-05
22. BIL-ENC-001 | 2026-05-29 | 2026-05

### June 2026
23. GOV-QM-001 | 2026-06-03 | 2026-06
24. CLN-CHART-001 | 2026-06-10 | 2026-06
25. EM-DRILL-001 | 2026-06-12 | 2026-Q2
26. SR-DOC-001 | 2026-06-12 | 2026-Q2
27. PRIV-CONSENT-001 | 2026-06-12 | 2026-Q2
28. HR-WF-001 | 2026-06-17 | 2026-06
29. EOC-SAFE-001 | 2026-06-24 | 2026-06
30. BIL-ENC-001 | 2026-06-26 | 2026-06

### July 2026
31. GOV-QM-001 | 2026-07-01 | 2026-07
32. CLN-CHART-001 | 2026-07-08 | 2026-07
33. HR-WF-001 | 2026-07-15 | 2026-07
34. EOC-SAFE-001 | 2026-07-22 | 2026-07
35. BIL-ENC-001 | 2026-07-31 | 2026-07

### August 2026
36. GOV-QM-001 | 2026-08-05 | 2026-08
37. CLN-CHART-001 | 2026-08-12 | 2026-08
38. HR-WF-001 | 2026-08-19 | 2026-08
39. EOC-SAFE-001 | 2026-08-26 | 2026-08
40. BIL-ENC-001 | 2026-08-28 | 2026-08

### September 2026
41. GOV-QM-001 | 2026-09-02 | 2026-09
42. CLN-CHART-001 | 2026-09-09 | 2026-09
43. EM-DRILL-001 | 2026-09-11 | 2026-Q3
44. SR-DOC-001 | 2026-09-11 | 2026-Q3
45. PRIV-CONSENT-001 | 2026-09-11 | 2026-Q3
46. HR-WF-001 | 2026-09-16 | 2026-09
47. EOC-SAFE-001 | 2026-09-23 | 2026-09
48. BIL-ENC-001 | 2026-09-25 | 2026-09

### October 2026
49. GOV-QM-001 | 2026-10-07 | 2026-10
50. CLN-CHART-001 | 2026-10-14 | 2026-10
51. EM-EVAC-001 | 2026-10-16 | 2026-H2
52. HR-WF-001 | 2026-10-21 | 2026-10
53. EOC-SAFE-001 | 2026-10-28 | 2026-10
54. BIL-ENC-001 | 2026-10-30 | 2026-10

### November 2026
55. GOV-QM-001 | 2026-11-04 | 2026-11
56. CLN-CHART-001 | 2026-11-11 | 2026-11
57. HR-WF-001 | 2026-11-18 | 2026-11
58. EOC-SAFE-001 | 2026-11-25 | 2026-11
59. BIL-ENC-001 | 2026-11-27 | 2026-11

### December 2026
60. GOV-QM-001 | 2026-12-02 | 2026-12
61. CLN-CHART-001 | 2026-12-09 | 2026-12
62. EM-DRILL-001 | 2026-12-11 | 2026-Q4
63. SR-DOC-001 | 2026-12-11 | 2026-Q4
64. PRIV-CONSENT-001 | 2026-12-11 | 2026-Q4
65. HR-WF-001 | 2026-12-16 | 2026-12
66. EOC-SAFE-001 | 2026-12-23 | 2026-12
67. BIL-ENC-001 | 2026-12-25 | 2026-12

### January 2027
68. GOV-QM-001 | 2027-01-06 | 2027-01
69. CLN-CHART-001 | 2027-01-13 | 2027-01
70. HR-WF-001 | 2027-01-20 | 2027-01
71. EOC-SAFE-001 | 2027-01-27 | 2027-01
72. BIL-ENC-001 | 2027-01-29 | 2027-01

### February 2027
73. GOV-QM-001 | 2027-02-03 | 2027-02
74. CLN-CHART-001 | 2027-02-10 | 2027-02
75. HR-WF-001 | 2027-02-17 | 2027-02
76. SR-MOCK-001 | 2027-02-22 | 2027-02
77. EOC-SAFE-001 | 2027-02-24 | 2027-02
78. BIL-ENC-001 | 2027-02-26 | 2027-02

## IMPLEMENTATION

### src/lib/data/real-controls.ts

Export an array of 13 control objects matching the Control type. Each must include:
- code (e.g., "GOV-QM-001")
- title
- description (combine domain + applies_to info)
- standard (map domain to standard: "Quality Management / Governance" → "Internal", "Clinical / Patient Safety / Documentation" → "AHCCCS", "HR / Training / Competency" → "Internal", "Environment of Care / Safety / Infection Control" → "Safety", "Billing / Program Integrity" → "AHCCCS", "Emergency Management / Life Safety" → "Safety", "Survey Readiness / Document Control" → "Internal", "Privacy / Compliance" → "HIPAA", "Environment of Care / Workplace Violence" → "Safety", "Privacy / Security" → "HIPAA", "Survey Readiness / Continuous Compliance" → "Internal")
- category
- test_procedure
- required_evidence
- frequency (monthly, quarterly, semi_annual, annual)
- default_owner_role
- is_active: true
- related_policy_ids: []
- program field (the "Applies To" data as string array)

### src/lib/data/real-checkpoints.ts

Export an array of 78 checkpoint seed objects. Each must include:
- control_code (string, to look up control_id after controls are seeded)
- due_date (exact date from calendar above)
- period (month string like "2026-03" or quarter "2026-Q1" etc.)
- status: "pending" (all start as pending)

### src/app/actions/seed-compliance-calendar.ts

Server action that:
1. Gets current user's org_id
2. Checks if controls already exist for this org (skip if already seeded)
3. Inserts all 13 controls into the controls table
4. For each of the 78 checkpoints: looks up the control_id by code, inserts checkpoint record
5. Writes to audit_log: "compliance_calendar.seeded"
6. Returns { controlsCreated: number, checkpointsCreated: number }

### src/app/(portal)/controls/page.tsx — UPDATE

Remove the entire `buildSeedControls()` function and the auto-seed logic in useEffect.
Instead: if controls are empty, show a message "No controls found. Seed the compliance calendar from the Calendar page." with a link to /calendar.
Keep all existing table/filter/UI functionality.

### Calendar seed button

On the calendar page, if no checkpoints exist, show a prominent banner:
"Your compliance calendar is empty. Load the Arizona BH compliance calendar (March 2026 – February 2027)?"
With a "Seed Compliance Calendar" button that calls the server action.
After seeding: refetch and display all 78 checkpoints on the calendar.

DO NOT touch: dashboard, vault, qm, capa, settings, auth, layout, ai, suggestions, evidence, reports, or any files not listed above.
