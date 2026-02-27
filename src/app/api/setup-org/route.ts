import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: Request) {
  try {
    const { orgName } = await request.json();

    if (!orgName?.trim()) {
      return NextResponse.json({ error: 'Organization name is required.' }, { status: 400 });
    }

    // Verify the caller is authenticated
    const userClient = await createClient();
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    // Use admin client to bypass RLS (handles both email-confirmed and unconfirmed users)
    const admin = createAdminClient();

    // Check they don't already have an org
    const { data: existing } = await admin
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You are already a member of an organization.' }, { status: 409 });
    }

    // Ensure a profile exists (may not if the trigger hasn't fired yet)
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      await admin.from('profiles').insert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email ?? 'User',
        email: user.email ?? '',
      });
    }

    // Create org
    const slug = slugify(orgName.trim()) || `org-${Date.now()}`;
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name: orgName.trim(), slug })
      .select('id, name, slug')
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: orgError?.message ?? 'Failed to create organization.' },
        { status: 500 }
      );
    }

    // Create admin membership
    const { error: memberError } = await admin.from('org_members').insert({
      org_id: org.id,
      user_id: user.id,
      role: 'admin',
    });

    if (memberError) {
      // Roll back org creation to keep DB clean
      await admin.from('organizations').delete().eq('id', org.id);
      return NextResponse.json(
        { error: memberError.message ?? 'Failed to create membership.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ org });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error.' },
      { status: 500 }
    );
  }
}
