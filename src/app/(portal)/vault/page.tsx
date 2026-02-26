'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Policy, PolicyStatus } from '@/lib/types';

// ─── Style constants ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#F5F5F5', color: '#737373', label: 'Draft' },
  in_review: { bg: '#FFFBEB', color: '#B45309', label: 'In Review' },
  approved:  { bg: '#E8F6FA', color: '#0E7490', label: 'Approved' },
  effective: { bg: '#F0FDF4', color: '#15803D', label: 'Effective' },
  retired:   { bg: '#FEF2F2', color: '#B91C1C', label: 'Retired' },
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  HIPAA:      { bg: '#F5F3FF', color: '#6D28D9' },
  Safety:     { bg: '#FFFBEB', color: '#B45309' },
  HR:         { bg: '#FDF4FF', color: '#9333EA' },
  Clinical:   { bg: '#F0FDF4', color: '#15803D' },
  Operations: { bg: '#EFF6FF', color: '#1D4ED8' },
  Billing:    { bg: '#FFF7ED', color: '#C2410C' },
  Admin:      { bg: '#F5F5F5', color: '#525252' },
};

const CAT_CODE: Record<string, string> = {
  HIPAA: 'HIPAA', Safety: 'SAF', HR: 'HR',
  Clinical: 'CLN', Operations: 'OPS', Billing: 'BIL', Admin: 'ADM',
};

const CATEGORIES = ['HIPAA', 'Safety', 'HR', 'Clinical', 'Operations', 'Billing', 'Admin'];
const PROGRAMS   = ['IOP', 'Residential'];
const STATUSES   = ['draft', 'in_review', 'approved', 'effective', 'retired'];

// ─── Seed data ────────────────────────────────────────────────────────────────

function makeContent(title: string) {
  return {
    json: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Purpose' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'This policy establishes standards and procedures to ensure compliance with applicable regulations and organizational requirements.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Scope' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'This policy applies to all staff, contractors, and volunteers who access or handle protected information or perform regulated activities on behalf of the organization.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Policy Statement' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'The organization is committed to maintaining the highest standards of compliance. All team members are expected to adhere to the requirements outlined in this policy.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '4. Procedures' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Detailed procedures for implementing this policy are outlined below. Department leads are responsible for ensuring their teams understand and follow these procedures.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '5. Violations' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Violations of this policy may result in disciplinary action up to and including termination, and may be reported to applicable regulatory authorities.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '6. Review' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'This policy will be reviewed annually or when significant regulatory changes occur.' }] },
      ],
    },
    html: `<h1>${title}</h1><h2>1. Purpose</h2><p>This policy establishes standards and procedures to ensure compliance with applicable regulations and organizational requirements.</p><h2>2. Scope</h2><p>This policy applies to all staff, contractors, and volunteers who access or handle protected information or perform regulated activities on behalf of the organization.</p><h2>3. Policy Statement</h2><p>The organization is committed to maintaining the highest standards of compliance.</p><h2>4. Procedures</h2><p>Detailed procedures for implementing this policy are outlined below.</p><h2>5. Violations</h2><p>Violations of this policy may result in disciplinary action up to and including termination.</p><h2>6. Review</h2><p>This policy will be reviewed annually or when significant regulatory changes occur.</p>`,
  };
}

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

const SEEDS = [
  { code: 'POL-HIPAA-001', title: 'HIPAA Privacy & Security Policy',      category: 'HIPAA',      program: ['IOP', 'Residential'], status: 'effective' as PolicyStatus, review_cadence_months: 12 },
  { code: 'POL-HIPAA-002', title: 'Breach Notification Procedures',        category: 'HIPAA',      program: ['IOP', 'Residential'], status: 'effective' as PolicyStatus, review_cadence_months: 12 },
  { code: 'POL-SAF-001',   title: 'Emergency Evacuation & Fire Safety',    category: 'Safety',     program: ['Residential'],        status: 'effective' as PolicyStatus, review_cadence_months: 12 },
  { code: 'POL-SAF-002',   title: 'Medication Storage & Administration',   category: 'Safety',     program: ['IOP', 'Residential'], status: 'in_review' as PolicyStatus, review_cadence_months: 12 },
  { code: 'POL-CLN-001',   title: 'Treatment Planning Standards',          category: 'Clinical',   program: ['IOP', 'Residential'], status: 'effective' as PolicyStatus, review_cadence_months: 12 },
  { code: 'POL-CLN-002',   title: 'Telehealth Service Delivery',           category: 'Clinical',   program: ['IOP'],                status: 'draft'     as PolicyStatus, review_cadence_months: 12 },
  { code: 'POL-HR-001',    title: 'Staff Credentialing & Training',        category: 'HR',         program: ['IOP', 'Residential'], status: 'effective' as PolicyStatus, review_cadence_months: 12 },
  { code: 'POL-OPS-001',   title: 'Client Grievance Resolution',           category: 'Operations', program: ['IOP', 'Residential'], status: 'effective' as PolicyStatus, review_cadence_months: 12 },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface NewPolicyForm {
  title: string;
  code: string;
  category: string;
  program: string[];
  department: string;
  review_cadence_months: number;
}

const EMPTY_FORM: NewPolicyForm = {
  title: '',
  code: '',
  category: 'HIPAA',
  program: [],
  department: '',
  review_cadence_months: 12,
};

export default function VaultPage() {
  const router = useRouter();
  const [policies, setPolicies]       = useState<Policy[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState<NewPolicyForm>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [orgId, setOrgId]             = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);

  // Auto-suggest code from category + existing count
  useEffect(() => {
    if (!form.category) return;
    const prefix = `POL-${CAT_CODE[form.category] ?? form.category.toUpperCase().slice(0, 4)}-`;
    const existing = policies.filter((p) => p.code.startsWith(prefix));
    const next = String(existing.length + 1).padStart(3, '0');
    setForm((f) => ({ ...f, code: `${prefix}${next}` }));
  }, [form.category, policies]);

  const loadPolicies = useCallback(async (oid: string) => {
    const supabase = createClient();
    const { data, error: qErr } = await supabase
      .from('policies')
      .select('*, owner:profiles!owner_id(id, full_name, email)')
      .eq('org_id', oid)
      .order('created_at', { ascending: false });

    if (qErr) {
      setError(qErr.message);
      return [];
    }
    return (data ?? []) as Policy[];
  }, []);

  const seedPolicies = useCallback(
    async (oid: string, uid: string) => {
      const supabase = createClient();
      for (const seed of SEEDS) {
        const { data: pol } = await supabase
          .from('policies')
          .insert({
            org_id: oid,
            title: seed.title,
            code: seed.code,
            category: seed.category,
            program: seed.program,
            status: seed.status,
            review_cadence_months: seed.review_cadence_months,
            next_review_date: addMonths(seed.review_cadence_months),
          })
          .select('id')
          .single();

        if (!pol) continue;

        const c = makeContent(seed.title);
        const { data: ver } = await supabase
          .from('policy_versions')
          .insert({
            policy_id: pol.id,
            version_number: 1,
            content: c.json,
            content_html: c.html,
            change_summary: 'Initial version',
            created_by: uid,
          })
          .select('id')
          .single();

        if (!ver) continue;
        await supabase.from('policies').update({ current_version_id: ver.id }).eq('id', pol.id);
      }
    },
    []
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      setUserId(user.id);

      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!membership) {
        setError('No organization found. Please contact your administrator.');
        setLoading(false);
        return;
      }

      setOrgId(membership.org_id);
      let pols = await loadPolicies(membership.org_id);

      if (pols.length === 0) {
        await seedPolicies(membership.org_id, user.id);
        pols = await loadPolicies(membership.org_id);
      }

      setPolicies(pols);
      setLoading(false);
    };

    init();
  }, [router, loadPolicies, seedPolicies]);

  async function handleCreatePolicy() {
    if (!form.title || !form.code || !orgId || !userId) return;
    setSaving(true);

    const supabase = createClient();
    const { data: pol, error: polErr } = await supabase
      .from('policies')
      .insert({
        org_id: orgId,
        title: form.title,
        code: form.code,
        category: form.category,
        program: form.program,
        department: form.department || null,
        status: 'draft',
        review_cadence_months: form.review_cadence_months,
        next_review_date: addMonths(form.review_cadence_months),
      })
      .select('id')
      .single();

    if (polErr || !pol) {
      setError(polErr?.message ?? 'Failed to create policy');
      setSaving(false);
      return;
    }

    const c = makeContent(form.title);
    const { data: ver } = await supabase
      .from('policy_versions')
      .insert({
        policy_id: pol.id,
        version_number: 1,
        content: c.json,
        content_html: c.html,
        change_summary: 'Initial draft',
        created_by: userId,
      })
      .select('id')
      .single();

    if (ver) {
      await supabase.from('policies').update({ current_version_id: ver.id }).eq('id', pol.id);
    }

    setShowModal(false);
    setForm(EMPTY_FORM);
    setSaving(false);

    const refreshed = await loadPolicies(orgId);
    setPolicies(refreshed);

    router.push(`/vault/${pol.id}`);
  }

  // Filtered view
  const filtered = policies.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterProgram && !p.program.includes(filterProgram)) return false;
    return true;
  });

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    border: '1px solid #D4D4D4',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#262626',
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 700, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
            Knowledge Vault
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
            {loading ? 'Loading…' : `${policies.length} ${policies.length === 1 ? 'policy' : 'policies'}`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '9px 18px',
            background: '#2A8BA8',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + New Policy
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#B91C1C', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Search + filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search by title or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: '260px' }}
        />
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={inputStyle}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} style={inputStyle}>
          <option value="">All Programs</option>
          {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_STYLES[s]?.label ?? s}</option>)}
        </select>
        {(search || filterCat || filterStatus || filterProgram) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterCat(''); setFilterStatus(''); setFilterProgram(''); }}
            style={{ ...inputStyle, background: '#F5F5F5', color: '#737373', cursor: 'pointer', border: '1px solid #E8E8E8' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>
            Loading policies…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>
            {policies.length === 0 ? 'No policies yet. Click "+ New Policy" to create one.' : 'No policies match your filters.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E8E8E8' }}>
                {['Code', 'Policy Title', 'Category', 'Programs', 'Status', 'Owner', 'Next Review'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#737373', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((pol, i) => {
                const ss = STATUS_STYLES[pol.status] ?? STATUS_STYLES.draft;
                const cc = CAT_COLORS[pol.category] ?? { bg: '#F5F5F5', color: '#525252' };
                const ownerName = (pol as Policy & { owner?: { full_name?: string } }).owner?.full_name ?? '—';
                const reviewDate = pol.next_review_date
                  ? new Date(pol.next_review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—';
                const isPastDue = pol.next_review_date ? new Date(pol.next_review_date) < new Date() : false;

                return (
                  <tr
                    key={pol.id}
                    onClick={() => router.push(`/vault/${pol.id}`)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F5F5F5' : 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#525252', whiteSpace: 'nowrap' }}>
                      {pol.code}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#171717', maxWidth: '280px' }}>
                      {pol.title}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: cc.bg, color: cc.color }}>
                        {pol.category}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {pol.program.map((p) => (
                          <span key={p} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: '#F5F5F5', color: '#525252' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color }}>
                        {ss.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#525252' }}>
                      {ownerName}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: isPastDue ? '#DC2626' : '#525252', fontWeight: isPastDue ? 600 : 400 }}>
                      {reviewDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Policy Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '18px', fontWeight: 700, color: '#171717' }}>
                New Policy
              </h2>
              <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#A3A3A3', lineHeight: 1 }}>
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#404040', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Policy Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. HIPAA Privacy & Security Policy"
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Category */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#404040', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#404040', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="POL-HIPAA-001"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Programs */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#404040', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Programs
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {PROGRAMS.map((p) => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', color: '#262626' }}>
                      <input
                        type="checkbox"
                        checked={form.program.includes(p)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.program, p]
                            : form.program.filter((x) => x !== p);
                          setForm({ ...form, program: next });
                        }}
                        style={{ accentColor: '#2A8BA8', width: '14px', height: '14px' }}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Department */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#404040', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g. Clinical"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Review cadence */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#404040', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Review Cadence
                  </label>
                  <select
                    value={form.review_cadence_months}
                    onChange={(e) => setForm({ ...form, review_cadence_months: Number(e.target.value) })}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value={6}>Every 6 months</option>
                    <option value={12}>Every 12 months</option>
                    <option value={24}>Every 24 months</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E8E8E8', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#F5F5F5', color: '#525252', border: '1px solid #E8E8E8', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!form.title || !form.code || saving}
                onClick={handleCreatePolicy}
                style={{ padding: '8px 18px', background: !form.title || !form.code || saving ? '#A3A3A3' : '#2A8BA8', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: !form.title || !form.code || saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {saving ? 'Creating…' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
