// Supabase Edge Function: policy-guardian
// Triggered by pg_cron every Monday at 09:00 UTC.
// Reviews all org policies for review deadlines and potential conflicts.
//
// pg_cron setup:
//   SELECT cron.schedule('policy-guardian-weekly', '0 9 * * 1',
//     $$SELECT net.http_post(url := 'https://<ref>.supabase.co/functions/v1/policy-guardian',
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

  for (const org of orgs ?? []) {
    const startTime = Date.now();
    const { data: run } = await admin
      .from('ai_agent_runs')
      .insert({ org_id: org.id, agent: 'policy_guardian', trigger_type: 'scheduled', status: 'running', input_summary: 'Weekly policy review scan' })
      .select('id').single();

    try {
      const { data: policies } = await admin
        .from('policies')
        .select('id, title, code, category, status, next_review_date')
        .eq('org_id', org.id)
        .in('status', ['effective', 'in_review', 'approved', 'draft']);

      const overdue = (policies ?? []).filter((p: { next_review_date: string | null }) =>
        p.next_review_date && new Date(p.next_review_date) < now
      );
      const dueSoon = (policies ?? []).filter((p: { next_review_date: string | null }) => {
        if (!p.next_review_date) return false;
        const d = new Date(p.next_review_date);
        return d >= now && d <= new Date(now.getTime() + 30 * 86400000);
      });
      const noDate = (policies ?? []).filter((p: { next_review_date: string | null }) => !p.next_review_date);

      const prompt = `You are the Policy Guardian AI for ${org.name}.
Today: ${now.toISOString().split('T')[0]}
Total policies: ${(policies ?? []).length}
Overdue review: ${overdue.length}
Due within 30 days: ${dueSoon.length}
No review date set: ${noDate.length}

Overdue:
${overdue.slice(0, 6).map((p: Record<string, string>) => `- ${p.code}: ${p.title} (${p.category}) was due ${p.next_review_date}`).join('\n') || 'None'}

Due soon:
${dueSoon.slice(0, 4).map((p: Record<string, string>) => `- ${p.code}: ${p.title} due ${p.next_review_date}`).join('\n') || 'None'}

Generate 2-4 policy suggestions. Return ONLY valid JSON:
{
  "summary": "2-3 sentence summary",
  "suggestions": [{"entity_type": "policy", "suggestion_type": "review", "title": "...", "description": "...", "confidence": 0.8}]
}`;

      const response = await ai.messages.create({
        model: 'claude-sonnet-4-6', max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').match(/\{[\s\S]*\}/);
      let suggestions: unknown[] = [];
      let summary = `Reviewed ${(policies ?? []).length} policies. ${overdue.length} overdue, ${dueSoon.length} due soon.`;

      if (match) {
        try { const p = JSON.parse(match[0]); suggestions = p.suggestions ?? []; summary = p.summary ?? summary; }
        catch { /* keep defaults */ }
      }

      if (suggestions.length > 0) {
        await admin.from('ai_suggestions').insert(suggestions.map((s: unknown) => ({
          org_id: org.id, agent_run_id: run?.id, agent: 'policy_guardian',
          ...(s as Record<string, unknown>), status: 'pending',
        })));
      }

      await admin.from('ai_agent_runs').update({
        status: 'completed', output_summary: summary,
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        duration_ms: Date.now() - startTime, completed_at: new Date().toISOString(),
      }).eq('id', run?.id);

      results.push({ org_id: org.id, status: 'completed' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      await admin.from('ai_agent_runs').update({
        status: 'failed', error_message: errorMsg,
        duration_ms: Date.now() - startTime, completed_at: new Date().toISOString(),
      }).eq('id', run?.id);
      results.push({ org_id: org.id, status: 'failed', error: errorMsg });
    }
  }

  return new Response(JSON.stringify({ results }), { headers: { 'Content-Type': 'application/json' } });
});
