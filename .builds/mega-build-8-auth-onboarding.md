Read CLAUDE.md first. Your job is to enhance the authentication system with password reset, email verification, invite acceptance, onboarding wizard, and session management.

ONLY touch these files (create if needed):
- src/app/(auth)/login/page.tsx (ENHANCE — currently 264 lines, working sign-in form)
- src/app/(auth)/signup/page.tsx (ENHANCE — currently 289 lines, creates user + org + membership)
- src/app/(auth)/forgot-password/page.tsx (CREATE — password reset request)
- src/app/(auth)/reset-password/page.tsx (CREATE — set new password)
- src/app/(auth)/accept-invite/page.tsx (CREATE — join org via invite link)
- src/app/(auth)/verify-email/page.tsx (CREATE — email verification callback)
- src/app/(auth)/layout.tsx (ENHANCE — split-panel auth layout if not already styled)
- src/app/(portal)/onboarding/page.tsx (CREATE — org setup wizard)
- src/app/api/invite/route.ts (CREATE — server-side invite endpoint)
- src/middleware.ts (ENHANCE — add onboarding redirect logic)

Current state: Login page has email/password sign-in with error handling and redirect support. Signup page creates auth user, organization, and org_members record. Middleware handles auth guards for protected routes and redirects authenticated users away from auth pages. No password reset, no invite acceptance, no onboarding flow.

## FORGOT PASSWORD (forgot-password/page.tsx) — CREATE

Match the existing auth page design (same layout, same input/label styles, same header pattern).

**Layout:**
- Header: "Reset your password" (Source Serif 4, 24px, bold)
- Subtitle: "Enter your email and we'll send a reset link"
- Email input field
- "Send Reset Link" button (blue-dark, full width)
- "Back to Sign In" link below
- On submit: call supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
- Success state: show "Check your email" message with green background, "We sent a reset link to {email}. Check your inbox and spam folder."
- Error state: show error message in red box (same pattern as login)

## RESET PASSWORD (reset-password/page.tsx) — CREATE

This page is the callback after clicking the email link.

**Layout:**
- Header: "Set new password"
- Subtitle: "Enter your new password below"
- New password input (min 8 characters)
- Confirm password input
- Password match validation (show error if mismatch)
- Password strength indicator: bar that fills as password gets stronger
  - < 8 chars: red "Weak"
  - 8-12 chars: yellow "Fair"
  - 12+ chars with mix: green "Strong"
- "Update Password" button
- On submit: call supabase.auth.updateUser({ password: newPassword })
- Success state: "Password updated successfully" with "Go to Sign In" link
- Handle the auth code exchange: Supabase sends a hash fragment with the token. Use supabase.auth.onAuthStateChange to detect the SIGNED_IN event from the reset link.

## EMAIL VERIFICATION (verify-email/page.tsx) — CREATE

Callback page for email verification links.

**Layout:**
- Show loading spinner initially: "Verifying your email..."
- Use useEffect to check supabase.auth.getSession() — the verification happens automatically via the URL hash
- Success: "Email verified!" with green checkmark icon and "Continue to Dashboard" button
- Error: "Verification failed" with "Try again" link and "Contact support" link
- Auto-redirect to /dashboard after 3 seconds on success

## ACCEPT INVITE (accept-invite/page.tsx) — CREATE

This page handles invite links. URL pattern: /accept-invite?token={token}&org={orgId}&email={email}

**Layout:**
- Header: "Join {org name}" (fetch org name from organizations table by org_id)
- "You've been invited to join {org name} on REPrieve.ai"
- If user is already logged in:
  - Show "Accept Invitation" button directly
  - On click: INSERT into org_members (org_id, user_id, role from invite), redirect to /dashboard
- If user is NOT logged in:
  - Show two options:
    1. "I already have an account" — shows email/password sign-in form, on success auto-joins org
    2. "Create an account" — shows name/email/password form, on signup auto-joins org
  - Pre-fill email from URL param if provided
- On accept:
  1. INSERT into org_members (org_id from URL, user_id from auth, role from invite data)
  2. Write to audit_log (action: 'member.accept_invite')
  3. Show success: "Welcome to {org name}!" and redirect to /dashboard

**Invite token handling:**
- Read token from URL searchParams
- Validate token: check if it's still valid (not expired, not used)
- For now, store invites as rows in a new invite tracking approach: use Supabase's built-in invite or use a simple token validation via the org_members table

## INVITE API ROUTE (api/invite/route.ts) — CREATE

Server-side API route for sending invitations.

```typescript
// POST /api/invite
// Body: { email: string, role: OrgRole, orgId: string }
// Requires authenticated user with admin role

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Verify caller is authenticated and is admin of the org
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { email, role, orgId } = body

  // 2. Verify caller is admin of this org
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('is_active', true)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })
  }

  // 3. Check if user already exists in this org
  // 4. Send invite email via Supabase (supabase.auth.admin.inviteUserByEmail or generate magic link)
  // 5. Write to audit_log
  // 6. Return success with invite details
}
```

## ONBOARDING WIZARD (onboarding/page.tsx) — CREATE

Multi-step wizard shown to new users who just signed up. Only shown once (check organizations.settings.onboarding_completed).

**Step 1 — Organization Setup:**
- "Let's set up your organization"
- Org name (pre-filled from signup)
- Programs offered (multi-select pills): IOP, Residential, Outpatient, PHP
- Primary accreditations (multi-select): AHCCCS, TJC, CARF, HIPAA
- Number of staff (range: 1-10, 11-25, 26-50, 51-100, 100+)
- "Next" button

**Step 2 — Seed Your Controls:**
- "Start with our pre-built control library"
- Show the list of 12 default controls (same as in controls/page.tsx seed data)
- Each row: checkbox (pre-checked), control code, title, standard badge
- "Select All" / "Deselect All" buttons
- User can uncheck controls they don't need
- "Next" button — inserts checked controls into controls table

**Step 3 — Invite Your Team:**
- "Invite your compliance team"
- Email input + role dropdown + "Add" button
- List of added invites showing email + role
- "Remove" button on each
- "Skip for now" link and "Send Invites & Finish" button
- On finish: send invites via /api/invite, mark onboarding complete

**Step 4 — Done:**
- "You're all set!" with checkmark
- Summary: "{X} controls loaded, {Y} invites sent"
- "Go to Dashboard" button

**Wizard Styling:**
- Centered card, max-width 600px
- Step indicator at top: 4 dots with connecting lines, active dot is blue-dark, completed dots are green
- Progress bar below dots
- Each step has a number and title
- Transition: slide left animation between steps

**Middleware addition:** In src/middleware.ts, after checking auth:
- For authenticated users hitting any portal route, check if their org has completed onboarding
- If not: redirect to /onboarding
- Skip this check for /onboarding itself and /settings routes

Implementation: Query organizations.settings->>'onboarding_completed'. If null or false, redirect. This check should be lightweight — cache the result in a cookie or session.

## LOGIN PAGE ENHANCEMENTS (login/page.tsx)

Add:
- "Forgot password?" link should navigate to /forgot-password (currently href="#")
- After successful login, check if user has any org_members records. If not, show error: "No organization found. Please contact your administrator or sign up."
- Add "Sign in with Google" button placeholder (disabled, grayed out, "Coming soon" label)

## SIGNUP PAGE ENHANCEMENTS (signup/page.tsx)

Add:
- Password strength indicator (same component as reset-password)
- Terms of service checkbox: "I agree to the Terms of Service and Privacy Policy" (required)
- After successful signup, redirect to /onboarding instead of /dashboard
- Rate limit protection: disable submit button for 30 seconds after 3 failed attempts

## AUTH LAYOUT (layout.tsx)

Ensure the auth layout has the split-panel design from the Cholla demo:
- Left panel (50%): auth form content (children)
- Right panel (50%): blue-dark background with:
  - REPrieve.ai logo/name (white text, Source Serif 4)
  - Tagline: "Compliance + Quality Management Operating System"
  - 3 feature bullets with icons: "Automated Checkpoints", "AI-Powered Analysis", "Audit-Ready Evidence"
  - Subtle desert/Arizona-themed pattern or gradient

If the layout already has this, don't change it. If it's a plain wrapper, add the split-panel.

## DESIGN SYSTEM

All auth pages must use the exact same design system:
- Input style: padding 10px 12px, 1px solid #D4D4D4 border, 6px radius, 14px font, #262626 color
- Label style: 13px, font-weight 600, #404040, margin-bottom 6px
- Primary button: full width, 11px 16px padding, #2A8BA8 bg, white text, 14px font-weight 600
- Error box: #FEF2F2 bg, 1px solid #DC2626, #DC2626 text
- Success box: #F0FDF4 bg, 1px solid #16A34A, #16A34A text
- Links: #2A8BA8, no underline, font-weight 500

DO NOT touch: dashboard, controls, vault, qm, capa, calendar, checkpoints, ai, suggestions, evidence, reports, settings/members, settings/roles, layout (header/sidebar/right-aside), or any portal files not listed above.
