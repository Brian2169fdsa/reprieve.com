// Supabase Edge Function: compliance-monitor
// Triggered by pg_cron on the 1st of each month at 00:00 UTC.
// Runs the Compliance Monitor agent for all active organizations.
//
// pg_cron setup (run in Supabase SQL Editor):
//   SELECT cron.schedule(
//     'compliance-monitor-monthly',
//     '0 0 1 * *',
//     $$SELECT net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/compliance-monitor',
//       headers := '{"Authorization": "Bearer <service-role-key>", "Content-Type": "application/json"}'::jsonb,
//       body := '{}'::jsonb
//     )$$
//   );

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

Deno.serve(async (req) => {
  // Validate authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ai = new Anthropic({ apiKey: anthropicKey });

  // Get all active organizations
  const { data: orgs, error: orgsError } = await admin
    .from('organizations')
    .select('id, name');

  if (orgsError) {
    return new Response(JSON.stringify({ error: orgsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const period = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const results: { org_id: string; status: string; error?: string }[] = [];

  for (const org of orgs ?? []) {
    const startTime = Date.now();

    // Create agent run record
    const { data: run } = await admin
      .from('ai_agent_runs')
      .insert({
        org_id: org.id,
        agent: 'compliance_monitor',
        trigger_type: 'scheduled',
        status: 'running',
        input_summary: `Monthly compliance analysis for ${period}`,
      })
      .select('id')
      .single();

    try {
      // Fetch checkpoints for this period
      const { data: checkpoints } = await admin
        .from('checkpoints')
        .select('id, status, due_date, assignee_name, control:controls(code, title, standard)')
        .eq('org_id', org.id)
        .eq('period', period);

      const now = new Date();
      const overdue = (checkpoints ?? []).filter(
        (c) => c.status === 'pending' && new Date(c.due_date) < now
      );
      const passed = (checkpoints ?? []).filter((c) => c.status === 'passed');
      const failed = (checkpoints ?? []).filter((c) => c.status === 'failed');

      // Check evidence coverage
      const passedIds = passed.map((c) => c.id);
      let evidenceCoverage: Record<string, number> = {};
      if (passedIds.length > 0) {
        const { data: evidence } = await admin
          .from('evidence')
          .select('checkpoint_id')
          .in('checkpoint_id', passedIds);
        (evidence ?? []).forEach((e: { checkpoint_id: string | null }) => {
          if (e.checkpoint_id)
            evidenceCoverage[e.checkpoint_id] = (evidenceCoverage[e.checkpoint_id] || 0) + 1;
        });
      }
      const passedNoEvidence = passed.filter((c) => !evidenceCoverage[c.id]);

      const prompt = `You are the Compliance Monitor AI for ${org.name} (a behavioral health organization).
Period: ${period}
Checkpoints: ${(checkpoints ?? []).length} total, ${passed.length} passed, ${failed.length} failed, ${overdue.length} overdue
Passed without evidence: ${passedNoEvidence.length}

Overdue checkpoints:
${overdue.slice(0, 8).map((c: Record<string, unknown>) => `- ${(c.control as Record<string, string>)?.code}: ${(c.control as Record<string, string>)?.title} (due ${c.due_date as string}, ${c.assignee_name as string ?? 'unassigned'})`).join('\n') || 'None'}

Generate 3-5 actionable compliance suggestions. Return ONLY valid JSON:
{
  "summary": "2-3 sentence summary",
  "suggestions": [{"entity_type": "checkpoint", "suggestion_type": "flag", "title": "...", "description": "...", "confidence": 0.85}]
}`;

      const response = await ai.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').match(/\{[\s\S]*\}/);
      let suggestions: unknown[] = [];
      let summary = `Analyzed ${(checkpoints ?? []).length} checkpoints. ${overdue.length} overdue.`;

      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          suggestions = parsed.suggestions ?? [];
          summary = parsed.summary ?? summary;
        } catch { /* keep defaults */ }
      }

      // Write suggestions
      if (suggestions.length > 0) {
        await admin.from('ai_suggestions').insert(
          suggestions.map((s: unknown) => ({
            org_id: org.id,
            agent_run_id: run?.id,
            agent: 'compliance_monitor',
            ...(s as Record<string, unknown>),
            status: 'pending',
          }))
        );
      }

      // Complete run
      await admin.from('ai_agent_runs').update({
        status: 'completed',
        output_summary: summary,
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      }).eq('id', run?.id);

      results.push({ org_id: org.id, status: 'completed' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      await admin.from('ai_agent_runs').update({
        status: 'failed',
        error_message: errorMsg,
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      }).eq('id', run?.id);

      results.push({ org_id: org.id, status: 'failed', error: errorMsg });
    }
  }

  return new Response(JSON.stringify({ period, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
