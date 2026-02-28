// Supabase Edge Function: qm-orchestrator
// Triggered 5 business days before each org's QM meeting.
// Assembles the monthly QM packet and calculates audit readiness scores.
//
// pg_cron setup (runs on the 23rd of each month to prep for the next period):
//   SELECT cron.schedule('qm-orchestrator-monthly', '0 7 23 * *',
//     $$SELECT net.http_post(url := 'https://<ref>.supabase.co/functions/v1/qm-orchestrator',
//     headers := '{"Authorization": "Bearer <key>", "Content-Type": "application/json"}'::jsonb,
//     body := '{}'::jsonb)$$);

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ai = new Anthropic({ apiKey: anthropicKey });
  const { data: orgs } = await admin.from('organizations').select('id, name');
  const results: { org_id: string; status: string; error?: string }[] = [];

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yr, mo] = period.split('-').map(Number);
  const lastDay = new Date(yr, mo, 0).getDate();

  for (const org of orgs ?? []) {
    const startTime = Date.now();
    const { data: run } = await admin
      .from('ai_agent_runs')
      .insert({ org_id: org.id, agent: 'qm_orchestrator', trigger_type: 'scheduled', status: 'running', input_summary: `QM packet assembly for ${period}` })
      .select('id').single();

    try {
      const periodStart = `${period}-01`;
      const periodEnd = `${period}-${lastDay}`;

      const [{ data: checkpoints }, { data: findings }, { data: capas }, { data: policies }] =
        await Promise.all([
          admin.from('checkpoints').select('id, status, control:controls(title, standard)').eq('org_id', org.id).gte('due_date', periodStart).lte('due_date', periodEnd),
          admin.from('findings').select('severity, title').eq('org_id', org.id).limit(10),
          admin.from('capas').select('status, title, due_date').eq('org_id', org.id).neq('status', 'closed').limit(10),
          admin.from('policies').select('status, next_review_date').eq('org_id', org.id),
        ]);

      const totalCP = (checkpoints ?? []).length;
      const passedCP = (checkpoints ?? []).filter((c: { status: string }) => c.status === 'passed').length;
      const failedCP = (checkpoints ?? []).filter((c: { status: string }) => c.status === 'failed' || c.status === 'overdue').length;

      // Evidence score
      const passedIds = (checkpoints ?? []).filter((c: { status: string }) => c.status === 'passed').map((c: { id: string }) => c.id);
      let evidenceCount = 0;
      if (passedIds.length > 0) {
        const { data: ev } = await admin.from('evidence').select('checkpoint_id').in('checkpoint_id', passedIds);
        evidenceCount = new Set((ev ?? []).map((e: { checkpoint_id: string | null }) => e.checkpoint_id)).size;
      }

      const effectivePolicies = (policies ?? []).filter((p: { status: string }) => p.status === 'effective').length;
      const overdueReview = (policies ?? []).filter((p: { next_review_date: string | null }) => p.next_review_date && new Date(p.next_review_date) < now).length;

      const checkpointScore = totalCP > 0 ? Math.round((passedCP / totalCP) * 100) : 0;
      const evidenceScore = passedIds.length > 0 ? Math.round((evidenceCount / passedIds.length) * 100) : 0;
      const policyScore = (policies ?? []).length > 0 ? Math.round(((effectivePolicies - overdueReview) / (policies ?? []).length) * 100) : 0;
      const overallScore = Math.round(checkpointScore * 0.35 + evidenceScore * 0.25 + Math.max(0, policyScore) * 0.25 + 85 * 0.15);

      // Save score
      await admin.from('audit_readiness_scores').upsert({
        org_id: org.id, period, overall_score: overallScore,
        checkpoint_score: checkpointScore, evidence_score: evidenceScore,
        policy_score: Math.max(0, policyScore), capa_score: 85,
        calculated_at: now.toISOString(),
      }, { onConflict: 'org_id,period' });

      const prompt = `You are the QM Orchestrator AI for ${org.name}.
Period: ${period} | Audit Readiness: ${overallScore}%
Checkpoints: ${passedCP}/${totalCP} passed, ${failedCP} failed
Evidence coverage: ${evidenceScore}%
Open findings: ${(findings ?? []).length}
Active CAPAs: ${(capas ?? []).length}

Generate a QM packet summary. Return ONLY valid JSON:
{
  "summary": "3-4 sentence executive summary for leadership",
  "suggestions": [{"entity_type": "qm_meeting", "suggestion_type": "review", "title": "...", "description": "...", "confidence": 0.85}]
}`;

      const response = await ai.messages.create({
        model: 'claude-sonnet-4-6', max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').match(/\{[\s\S]*\}/);
      let suggestions: unknown[] = [];
      let summary = `QM packet for ${period}. Audit readiness: ${overallScore}%. ${passedCP}/${totalCP} checkpoints passed.`;

      if (match) {
        try { const p = JSON.parse(match[0]); suggestions = p.suggestions ?? []; summary = p.summary ?? summary; }
        catch { /* keep defaults */ }
      }

      // Create/update QM meeting record
      const { data: existing } = await admin.from('qm_meetings').select('id').eq('org_id', org.id).eq('period', period).maybeSingle();
      if (existing) {
        await admin.from('qm_meetings').update({
          executive_summary: summary, audit_readiness_score: overallScore, status: 'ready', updated_at: now.toISOString(),
        }).eq('id', existing.id);
      } else {
        await admin.from('qm_meetings').insert({
          org_id: org.id, period, status: 'ready', executive_summary: summary,
          audit_readiness_score: overallScore,
          agenda: ['Review audit readiness score', 'Checkpoint completion review', 'Findings review', 'CAPA status update', 'Action items'],
        });
      }

      if (suggestions.length > 0) {
        await admin.from('ai_suggestions').insert(suggestions.map((s: unknown) => ({
          org_id: org.id, agent_run_id: run?.id, agent: 'qm_orchestrator',
          ...(s as Record<string, unknown>), status: 'pending',
        })));
      }

      await admin.from('ai_agent_runs').update({
        status: 'completed', output_summary: summary,
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        duration_ms: Date.now() - startTime, completed_at: now.toISOString(),
      }).eq('id', run?.id);

      results.push({ org_id: org.id, status: 'completed' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      await admin.from('ai_agent_runs').update({
        status: 'failed', error_message: errorMsg,
        duration_ms: Date.now() - startTime, completed_at: now.toISOString(),
      }).eq('id', run?.id);
      results.push({ org_id: org.id, status: 'failed', error: errorMsg });
    }
  }

  return new Response(JSON.stringify({ period, results }), { headers: { 'Content-Type': 'application/json' } });
});
