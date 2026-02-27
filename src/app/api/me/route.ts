import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Verify identity from session cookie
    const userClient = await createClient();
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use admin client to bypass RLS — avoids the self-referential policy issue
    // on org_members that silently returns empty results for new members
    const admin = createAdminClient();

    const { data: membership } = await admin
      .from('org_members')
      .select('role, org_id, organizations(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    return NextResponse.json({
      userId: user.id,
      org: membership?.organizations ?? null,
      role: membership?.role ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
