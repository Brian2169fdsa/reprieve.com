import React from 'react';

export async function buildQMSummaryPDF(period: string, orgName: string, data: {
  meeting: { executive_summary?: string; audit_readiness_score?: number; meeting_date?: string } | null;
  findings: { title: string; severity: string; standard?: string }[];
  capas: { title: string; status: string; due_date?: string }[];
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
    bodyText: { fontSize: 11, lineHeight: 1.6, color: '#404040' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #F5F5F5' },
    label: { fontSize: 10, color: '#525252', flex: 3 },
    value: { fontSize: 10, color: '#171717', flex: 1, textAlign: 'right' },
    scoreBox: { padding: 20, backgroundColor: '#F0F9FC', borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    scoreNum: { fontSize: 48, fontFamily: 'Helvetica-Bold', color: '#2A8BA8' },
    scoreLbl: { fontSize: 12, color: '#525252', marginTop: 4 },
    footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#A3A3A3' },
  });

  const periodLabel = new Date(period + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const score = data.meeting?.audit_readiness_score ?? data.score;
  const openCapas = data.capas.filter((c) => c.status !== 'closed');

  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.orgName }, orgName.toUpperCase()),
        React.createElement(Text, { style: styles.title }, 'QM Executive Summary'),
        React.createElement(Text, { style: styles.subtitle }, `Period: ${periodLabel}  ·  Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
      ),
      React.createElement(View, { style: styles.scoreBox },
        React.createElement(Text, { style: styles.scoreNum }, score !== null && score !== undefined ? `${score.toFixed(0)}%` : 'N/A'),
        React.createElement(Text, { style: styles.scoreLbl }, 'Audit Readiness Score')
      ),
      data.meeting?.executive_summary ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Executive Summary'),
        React.createElement(Text, { style: styles.bodyText }, data.meeting.executive_summary)
      ) : null,
      data.findings.length > 0 ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, `Key Findings (${data.findings.length})`),
        ...data.findings.slice(0, 15).map((f, i) =>
          React.createElement(View, { style: styles.row, key: i },
            React.createElement(Text, { style: styles.label }, f.title),
            React.createElement(Text, { style: styles.value }, `${f.severity}${f.standard ? ` · ${f.standard}` : ''}`)
          )
        )
      ) : null,
      openCapas.length > 0 ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, `Open CAPAs (${openCapas.length})`),
        ...openCapas.slice(0, 15).map((c, i) =>
          React.createElement(View, { style: styles.row, key: i },
            React.createElement(Text, { style: styles.label }, c.title),
            React.createElement(Text, { style: styles.value }, `${c.status}${c.due_date ? ` · due ${new Date(c.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`)
          )
        )
      ) : null,
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, null, `REPrieve.ai — ${orgName}`),
        React.createElement(Text, null, `Board Confidential — ${periodLabel}`)
      )
    )
  );

  return pdf(doc).toBlob();
}
