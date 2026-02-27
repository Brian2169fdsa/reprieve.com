Read CLAUDE.md first. Your job is to harden the authentication flow, add missing shadcn/ui components that the app needs, create error/loading pages, and convert auth pages from inline styles to Tailwind.

ONLY touch these files:
- src/app/(auth)/login/page.tsx
- src/app/(auth)/signup/page.tsx
- src/app/(auth)/layout.tsx
- src/app/auth/callback/route.ts
- src/middleware.ts
- src/app/not-found.tsx (CREATE NEW)
- src/app/error.tsx (CREATE NEW)
- src/app/(portal)/loading.tsx (CREATE NEW)
- src/app/(auth)/forgot-password/page.tsx (CREATE NEW)
- src/app/(auth)/reset-password/page.tsx (CREATE NEW)
- src/components/ui/ (ADD MISSING COMPONENTS)
- src/app/globals.css (if needed for Tailwind customization)

Current state: Login (265 lines) and signup (290 lines) use inline styles everywhere instead of Tailwind. "Forgot password?" link goes to href="#". Auth layout (168 lines) uses inline styles and has no mobile responsiveness. Middleware (79 lines) has no RBAC checks and no org verification. The app has no 404 page, no error boundary, no loading states for route groups. Only 6 shadcn/ui components exist (avatar, badge, button, card, dropdown-menu, separator) — many pages need input, dialog, select, tabs, etc.

What to build:

AUTH HARDENING:
1. login/page.tsx: Replace ALL inline styles with Tailwind classes. Keep exact same visual design.
2. signup/page.tsx: Replace ALL inline styles with Tailwind classes. Keep exact same visual design. Add password strength indicator (show weak/medium/strong based on length + character variety).
3. (auth)/layout.tsx: Replace inline styles with Tailwind. Add mobile responsive breakpoints — on mobile, hide left brand panel and show full-width form. On tablet, reduce left panel to 35%.
4. Create forgot-password/page.tsx: Form with email input. Call supabase.auth.resetPasswordForEmail(email, {redirectTo: APP_URL/auth/callback?next=/reset-password}). Show success message "Check your email".
5. Create reset-password/page.tsx: Form with new password + confirm password. Call supabase.auth.updateUser({password}). Redirect to /login on success.
6. Update login/page.tsx: Wire "Forgot password?" link to /forgot-password route.
7. Update auth/callback/route.ts: Handle password reset callback flow (detect type=recovery in URL params).

MIDDLEWARE RBAC:
1. After auth check, query org_members for current user to get their role.
2. Define route-role matrix: /settings/members and /settings/roles require admin role. /controls (write) requires admin or compliance. /vault/edit requires admin or compliance.
3. If user has no org_member record (incomplete signup), redirect to a setup page or /signup.
4. Cache the role check result in the request to avoid repeated DB queries.

ERROR PAGES:
1. Create src/app/not-found.tsx: Styled 404 page matching Cholla design. "Page not found" message with link back to /dashboard.
2. Create src/app/error.tsx: Global error boundary. Show friendly error message with "Try again" button. Log error to console.
3. Create src/app/(portal)/loading.tsx: Loading skeleton matching the portal layout — show shimmer placeholder for header, sidebar, and main content area.

SHADCN/UI COMPONENTS:
Run these commands to add the missing components:
- npx shadcn@latest add input textarea dialog select tabs label switch progress tooltip popover checkbox
- If shadcn CLI doesn't work, manually create each component following the shadcn/ui patterns already in src/components/ui/. Use Radix UI primitives with Tailwind styling matching the existing components.
- Also install sonner for toast notifications: npm install sonner. Create a Toaster provider in the root layout.

DO NOT touch: dashboard, controls, vault, qm, capa, settings, ai, suggestions, evidence, reports, calendar, checkpoints, hooks, layout components (header/sidebar/right-aside), or any portal page files.
