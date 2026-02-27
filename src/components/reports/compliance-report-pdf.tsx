import React from 'react';

export async function buildComplianceReportPDF(period: string, orgName: string, data: {
  checkpoints: { title: string; standard: string; status: string; due_date: string; assigned_to?: string }[];
  score: number | null;
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
    stat: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    statBox: { flex: 1, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 6 },
    statNum: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#171717' },
    statLbl: { fontSize: 9, color: '#737373', marginTop: 2 },
    footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#A3A3A3' },
  });

  const periodLabel = new Date(period + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const passed = data.checkpoints.filter((c) => c.status === 'passed').length;
  const failed = data.checkpoints.filter((c) => c.status === 'failed').length;
  const overdue = data.checkpoints.filter((c) => c.status === 'overdue').length;
  const total = data.checkpoints.length;

  const byStandard: Record<string, { pass: number; fail: number; overdue: number; total: number }> = {};
  data.checkpoints.forEach((c) => {
    const std = c.standard ?? 'Other';
    if (!byStandard[std]) byStandard[std] = { pass: 0, fail: 0, overdue: 0, total: 0 };
    byStandard[std].total++;
    if (c.status === 'passed') byStandard[std].pass++;
    if (c.status === 'failed') byStandard[std].fail++;
    if (c.status === 'overdue') byStandard[std].overdue++;
  });

  const overdueItems = data.checkpoints.filter((c) => c.status === 'overdue' || c.status === 'failed');

  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.orgName }, orgName.toUpperCase()),
        React.createElement(Text, { style: styles.title }, 'Monthly Compliance Report'),
        React.createElement(Text, { style: styles.subtitle }, `Period: ${periodLabel}  ·  Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
      ),
      React.createElement(View, { style: styles.stat },
        React.createElement(View, { style: styles.statBox },
          React.createElement(Text, { style: styles.statNum }, String(total)),
          React.createElement(Text, { style: styles.statLbl }, 'Total Checkpoints')
        ),
        React.createElement(View, { style: { ...styles.statBox, backgroundColor: '#F0FDF4' } },
          React.createElement(Text, { style: { ...styles.statNum, color: '#16A34A' } }, String(passed)),
          React.createElement(Text, { style: styles.statLbl }, 'Passed')
        ),
        React.createElement(View, { style: { ...styles.statBox, backgroundColor: '#FEF2F2' } },
          React.createElement(Text, { style: { ...styles.statNum, color: '#DC2626' } }, String(failed + overdue)),
          React.createElement(Text, { style: styles.statLbl }, 'Failed / Overdue')
        ),
        React.createElement(View, { style: { ...styles.statBox, backgroundColor: '#F0F9FC' } },
          React.createElement(Text, { style: { ...styles.statNum, color: '#2A8BA8' } }, data.score !== null ? `${data.score.toFixed(0)}%` : 'N/A'),
          React.createElement(Text, { style: styles.statLbl }, 'Audit Readiness Score')
        )
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Checkpoint Results by Standard'),
        ...Object.entries(byStandard).map(([std, counts]) =>
          React.createElement(View, { style: styles.row, key: std },
            React.createElement(Text, { style: styles.label }, std),
            React.createElement(Text, { style: styles.value }, `${counts.pass} passed  ${counts.fail + counts.overdue} failed  (${counts.total} total)`)
          )
        )
      ),
      overdueItems.length > 0 ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Items Requiring Attention'),
        ...overdueItems.slice(0, 20).map((c, i) =>
          React.createElement(View, { style: styles.row, key: i },
            React.createElement(Text, { style: styles.label }, c.title),
            React.createElement(Text, { style: { ...styles.value, color: '#DC2626' } }, c.status)
          )
        )
      ) : null,
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, null, `REPrieve.ai — ${orgName}`),
        React.createElement(Text, null, `Confidential — ${periodLabel}`)
      )
    )
  );

  return pdf(doc).toBlob();
}
