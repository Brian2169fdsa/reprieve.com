// REPrieve.ai — Core Types
// These mirror the database schema. After running migrations, regenerate with:
// npx supabase gen types typescript --local > src/lib/supabase/database.types.ts

export type OrgRole = 'admin' | 'compliance' | 'clinical' | 'ops' | 'hr' | 'billing' | 'supervisor' | 'executive';
export type PolicyStatus = 'draft' | 'in_review' | 'approved' | 'effective' | 'retired';
export type CheckpointStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'overdue' | 'skipped';
export type Recurrence = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type CAPAStatus = 'open' | 'in_progress' | 'pending_verification' | 'closed' | 'overdue';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AgentName = 'policy_guardian' | 'compliance_monitor' | 'evidence_librarian' | 'qm_orchestrator';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'modified';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
  joined_at: string;
  profile?: Profile;
}

export interface Policy {
  id: string;
  org_id: string;
  title: string;
  code: string;
  category: string;
  program: string[];
  department?: string;
  owner_id?: string;
  status: PolicyStatus;
  review_cadence_months: number;
  next_review_date?: string;
  current_version_id?: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  current_version?: PolicyVersion;
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version_number: number;
  content: Record<string, unknown>; // Tiptap JSON
  content_html?: string;
  change_summary?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  effective_date?: string;
  created_at: string;
}

export interface Control {
  id: string;
  org_id: string;
  code: string;
  title: string;
  description?: string;
  standard: string;
  category?: string;
  test_procedure: string;
  required_evidence: string[];
  frequency: Recurrence;
  default_owner_role?: OrgRole;
  is_active: boolean;
  related_policy_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Checkpoint {
  id: string;
  org_id: string;
  control_id: string;
  period: string;
  status: CheckpointStatus;
  assigned_to?: string;
  due_date: string;
  completed_at?: string;
  completed_by?: string;
  attestation?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  control?: Control;
  assignee?: Profile;
  evidence?: Evidence[];
}

export interface Evidence {
  id: string;
  org_id: string;
  checkpoint_id?: string;
  policy_id?: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size_bytes?: number;
  tags: Record<string, unknown>;
  uploaded_by?: string;
  created_at: string;
}

export interface QMMeeting {
  id: string;
  org_id: string;
  period: string;
  meeting_date?: string;
  status: string;
  agenda?: Record<string, unknown>;
  executive_summary?: string;
  audit_readiness_score?: number;
  attendees: string[];
  action_items?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Finding {
  id: string;
  org_id: string;
  qm_meeting_id?: string;
  checkpoint_id?: string;
  title: string;
  description?: string;
  severity: FindingSeverity;
  standard?: string;
  created_at: string;
}

export interface CAPA {
  id: string;
  org_id: string;
  finding_id?: string;
  title: string;
  description?: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  owner_id?: string;
  status: CAPAStatus;
  due_date?: string;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  finding?: Finding;
}

export interface AIAgentRun {
  id: string;
  org_id: string;
  agent: AgentName;
  trigger_type: string;
  status: string;
  input_summary?: string;
  output_summary?: string;
  tokens_used?: number;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface AISuggestion {
  id: string;
  org_id: string;
  agent_run_id?: string;
  agent: AgentName;
  entity_type: string;
  entity_id?: string;
  suggestion_type: string;
  title: string;
  description: string;
  suggested_changes?: Record<string, unknown>;
  confidence?: number;
  status: SuggestionStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export interface AuditReadinessScore {
  id: string;
  org_id: string;
  period: string;
  overall_score?: number;
  checkpoint_score?: number;
  evidence_score?: number;
  policy_score?: number;
  capa_score?: number;
  calculated_at: string;
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

// Sidebar nav config
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  roles?: OrgRole[]; // which roles can see this item
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'Calendar', href: '/calendar', icon: '📅' },
  { label: 'Controls', href: '/controls', icon: '🛡', roles: ['admin', 'compliance'] },
  { label: 'Evidence', href: '/evidence', icon: '📎' },
  { label: 'Knowledge Vault', href: '/vault', icon: '📖' },
  { label: 'Approvals', href: '/approvals', icon: '✅', roles: ['admin', 'compliance', 'supervisor'] },
  { label: 'QM Workbench', href: '/qm', icon: '📊', roles: ['admin', 'compliance', 'executive'] },
  { label: 'CAPAs', href: '/capa', icon: '🔄' },
  { label: 'AI Activity', href: '/ai', icon: '🤖', roles: ['admin', 'compliance'] },
  { label: 'Suggestions', href: '/suggestions', icon: '💡' },
  { label: 'Reports', href: '/reports', icon: '📄' },
  { label: 'Settings', href: '/settings', icon: '⚙', roles: ['admin'] },
];
