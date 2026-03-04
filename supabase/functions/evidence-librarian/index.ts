// Supabase Edge Function: evidence-librarian
// Triggered by pg_cron every Monday at 08:00 UTC.
// Scans all orgs for checkpoints missing required evidence.
//
// pg_cron setup (run in Supabase SQL Editor):
//   SELECT cron.schedule(
//     'evidence-librarian-weekly',
//     '0 8 * * 1',
//     $$SELECT net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/evidence-librarian',
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

  const { data: orgs } = await admin.from('organizations').select('id, name');
  const results: { org_id: string; status: string; error?: string }[] = [];

  const period = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  for (const org of orgs ?? []) {
    const startTime = Date.now();
    const { data: run } = await admin
      .from('ai_agent_runs')
      .insert({
        org_id: org.id,
        agent: 'evidence_librarian',
        trigger_type: 'scheduled',
        status: 'running',
        input_summary: `Weekly evidence scan for ${period}`,
      })
      .select('id')
      .single();

    try {
      // Fetch passed checkpoints
      const { data: passedCheckpoints } = await admin
        .from('checkpoints')
        .select('id, due_date, assignee_name, control:controls(code, title, standard, required_evidence)')
        .eq('org_id', org.id)
        .eq('status', 'passed')
        .order('due_date', { ascending: false })
        .limit(50);

      // Check evidence
      const passedIds = (passedCheckpoints ?? []).map((c: { id: string }) => c.id);
      const evidenceSet = new Set<string>();
      if (passedIds.length > 0) {
        const { data: evidence } = await admin
          .from('evidence')
          .select('checkpoint_id')
          .in('checkpoint_id', passedIds);
        (evidence ?? []).forEach((e: { checkpoint_id: string | null }) => {
          if (e.checkpoint_id) evidenceSet.add(e.checkpoint_id);
        });
      }

      const noEvidence = (passedCheckpoints ?? []).filter(
        (c: { id: string }) => !evidenceSet.has(c.id)
      );

      const prompt = `You are the Evidence Librarian AI for ${org.name}.
Period: ${period}
Passed checkpoints: ${(passedCheckpoints ?? []).length}
Passed with NO evidence: ${noEvidence.length}

Missing evidence items:
${noEvidence.slice(0, 8).map((c: Record<string, unknown>) => {
  const ctrl = c.control as Record<string, unknown>;
  const required = (ctrl?.required_evidence as string[]) ?? [];
  return `- ${ctrl?.code}: ${ctrl?.title} (${ctrl?.standard}) — needs: ${required.join(', ') || 'see procedure'}`;
}).join('\n') || 'None'}

Generate 2-4 evidence gap suggestions. Return ONLY valid JSON:
{
  "summary": "2-3 sentence summary of evidence coverage",
  "suggestions": [{"entity_type": "checkpoint", "suggestion_type": "flag", "title": "...", "description": "...", "confidence": 0.9}]
}`;

      const response = await ai.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').match(/\{[\s\S]*\}/);
      let suggestions: unknown[] = [];
      let summary = `Scanned ${(passedCheckpoints ?? []).length} passed checkpoints. ${noEvidence.length} missing evidence.`;

      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          suggestions = parsed.suggestions ?? [];
          summary = parsed.summary ?? summary;
        } catch { /* keep defaults */ }
      }

      if (suggestions.length > 0) {
        await admin.from('ai_suggestions').insert(
          suggestions.map((s: unknown) => ({
            org_id: org.id,
            agent_run_id: run?.id,
            agent: 'evidence_librarian',
            ...(s as Record<string, unknown>),
            status: 'pending',
          }))
        );
      }

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
    headers: { 'Content-Type': 'application/json' },
  });
});
