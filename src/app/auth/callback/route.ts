import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Handle password recovery flow — Supabase sends type=recovery in the hash
  // but some flows pass it as a query param
  const type = searchParams.get('type');
  if (type === 'recovery' && !code) {
    // The token_hash flow is handled client-side via Supabase JS SDK
    // Redirect to the reset-password page which will pick up the session
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${origin}/login?error=configuration`);
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // For password recovery, redirect to reset-password page
      if (next === '/reset-password') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If there's no code or an error, redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
