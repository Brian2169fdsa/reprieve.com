import React from 'react';

export async function buildAuditBinderPDF(period: string, orgName: string, data: {
  evidence: { file_name: string; file_type?: string; file_size_bytes?: number; tags: Record<string, unknown>; created_at: string; uploader?: string }[];
  checkpoints: { title: string; standard: string; status: string; attestation?: string }[];
}) {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer');

  const styles = StyleSheet.create({
    page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', color: '#262626' },
    header: { marginBottom: 24, borderBottom: '2 solid #3BA7C9', paddingBottom: 12 },
    orgName: { fontSize: 9, color: '#737373', marginBottom: 4 },
    title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#171717', marginBottom: 2 },
    subtitle: { fontSize: 11, color: '#525252' },
    section: { marginTop: 20 },
    sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#171717', marginBottom: 8, borderBottom: '1 solid #E8E8E8', paddingBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #F5F5F5' },
    label: { fontSize: 10, color: '#525252', flex: 3 },
    value: { fontSize: 10, color: '#171717', flex: 1, textAlign: 'right' },
    noteBox: { padding: 12, backgroundColor: '#FFFBEB', borderRadius: 6, marginTop: 20 },
    noteText: { fontSize: 10, color: '#92400E' },
    missingSection: { marginTop: 20 },
    missingTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#DC2626', marginBottom: 8, borderBottom: '1 solid #FEE2E2', paddingBottom: 4 },
    missingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #FEF2F2' },
    missingLabel: { fontSize: 10, color: '#DC2626', flex: 3 },
    footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#A3A3A3' },
  });

  const periodLabel = new Date(period + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Group evidence by standard
  const byStandard: Record<string, typeof data.evidence> = {};
  data.evidence.forEach((e) => {
    const std = (e.tags?.standard as string) ?? 'Uncategorized';
    if (!byStandard[std]) byStandard[std] = [];
    byStandard[std].push(e);
  });

  // Find checkpoints missing evidence
  const checkpointsWithEvidence = new Set(data.evidence.map((e) => (e.tags?.checkpoint_id as string)).filter(Boolean));
  const missingEvidence = data.checkpoints.filter((c) => c.status === 'passed' && !checkpointsWithEvidence.has(c.title));

  // Calculate per-standard completeness
  const standardCoverage: Record<string, { total: number; withEvidence: number }> = {};
  data.checkpoints.forEach((c) => {
    const std = c.standard ?? 'Other';
    if (!standardCoverage[std]) standardCoverage[std] = { total: 0, withEvidence: 0 };
    standardCoverage[std].total++;
  });
  data.evidence.forEach((e) => {
    const std = (e.tags?.standard as string) ?? 'Uncategorized';
    if (standardCoverage[std]) standardCoverage[std].withEvidence++;
  });

  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.orgName }, orgName.toUpperCase()),
        React.createElement(Text, { style: styles.title }, 'Audit Binder — Evidence Index'),
        React.createElement(Text, { style: styles.subtitle }, `Period: ${periodLabel}  ·  Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
      ),
      // Summary
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Summary'),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Total evidence files'),
          React.createElement(Text, { style: styles.value }, String(data.evidence.length))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Checkpoints with attestation'),
          React.createElement(Text, { style: styles.value }, String(data.checkpoints.filter((c) => c.attestation).length))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Standards covered'),
          React.createElement(Text, { style: styles.value }, String(Object.keys(byStandard).length))
        )
      ),
      // Evidence by standard
      ...Object.entries(byStandard).map(([std, files]) =>
        React.createElement(View, { style: styles.section, key: std },
          React.createElement(Text, { style: styles.sectionTitle }, `${std} (${files.length} files)`),
          ...files.slice(0, 30).map((f, i) =>
            React.createElement(View, { style: styles.row, key: i },
              React.createElement(Text, { style: styles.label }, f.file_name),
              React.createElement(Text, { style: styles.value },
                `${f.file_type ?? '—'}  ${f.file_size_bytes ? `${(f.file_size_bytes / 1024).toFixed(0)} KB` : ''}`
              )
            )
          )
        )
      ),
      // Missing evidence
      missingEvidence.length > 0 ? React.createElement(View, { style: styles.missingSection },
        React.createElement(Text, { style: styles.missingTitle }, `Missing Evidence (${missingEvidence.length} items)`),
        ...missingEvidence.slice(0, 20).map((c, i) =>
          React.createElement(View, { style: styles.missingRow, key: i },
            React.createElement(Text, { style: styles.missingLabel }, c.title),
            React.createElement(Text, { style: { ...styles.value, color: '#DC2626' } }, c.standard)
          )
        )
      ) : null,
      // Compliance completeness
      Object.keys(standardCoverage).length > 0 ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Compliance Completeness by Standard'),
        ...Object.entries(standardCoverage).map(([std, cov]) =>
          React.createElement(View, { style: styles.row, key: std },
            React.createElement(Text, { style: styles.label }, std),
            React.createElement(Text, { style: styles.value },
              cov.total > 0 ? `${Math.round((cov.withEvidence / cov.total) * 100)}%` : 'N/A'
            )
          )
        )
      ) : null,
      React.createElement(View, { style: styles.noteBox },
        React.createElement(Text, { style: styles.noteText }, 'Note: This index lists evidence files stored in the REPrieve.ai system. Actual files are available for download from the Evidence Library.')
      ),
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, null, `REPrieve.ai — ${orgName}`),
        React.createElement(Text, null, `Audit Binder — ${periodLabel}`)
      )
    )
  );

  return pdf(doc).toBlob();
}
