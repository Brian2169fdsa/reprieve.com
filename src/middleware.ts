import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'];

// Routes that require admin role
const ADMIN_ONLY_ROUTES = ['/settings/members', '/settings/roles'];

// Routes that require admin or compliance role
const COMPLIANCE_WRITE_ROUTES = ['/vault/'];

type OrgRole = 'admin' | 'compliance' | 'clinical' | 'ops' | 'hr' | 'billing' | 'supervisor' | 'executive';

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function requiresAdminRole(pathname: string): boolean {
  return ADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function requiresComplianceRole(pathname: string): boolean {
  // /vault/[id]/edit requires admin or compliance
  if (pathname.match(/^\/vault\/[^/]+\/edit/)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, pass through without auth checks
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session — this is critical for keeping auth tokens fresh
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  // RBAC checks for authenticated users on protected routes
  if (user && !isPublicRoute(pathname)) {
    const needsAdminCheck = requiresAdminRole(pathname);
    const needsComplianceCheck = requiresComplianceRole(pathname);

    if (needsAdminCheck || needsComplianceCheck) {
      // Query org membership for current user
      const { data: member } = await supabase
        .from('org_members')
        .select('role, org_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      // No org membership — redirect to signup to complete setup
      if (!member) {
        const signupUrl = request.nextUrl.clone();
        signupUrl.pathname = '/signup';
        return NextResponse.redirect(signupUrl);
      }

      const role = member.role as OrgRole;

      // Admin-only route check
      if (needsAdminCheck && role !== 'admin') {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = '/dashboard';
        dashboardUrl.searchParams.set('error', 'insufficient_permissions');
        return NextResponse.redirect(dashboardUrl);
      }

      // Compliance write route check (admin or compliance role required)
      if (needsComplianceCheck && role !== 'admin' && role !== 'compliance') {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = '/dashboard';
        dashboardUrl.searchParams.set('error', 'insufficient_permissions');
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - Static assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
