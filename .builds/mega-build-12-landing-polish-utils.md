Read CLAUDE.md first. Your job is to build the marketing landing page, error boundaries, 404/error pages, loading states, utility functions, and production polish.

ONLY touch these files (create if needed):
- src/app/page.tsx (ENHANCE — currently exists as landing page, may need polish)
- src/app/not-found.tsx (CREATE — custom 404 page)
- src/app/error.tsx (CREATE — global error boundary)
- src/app/(portal)/error.tsx (CREATE — portal error boundary)
- src/app/(portal)/loading.tsx (CREATE — portal loading skeleton)
- src/app/(portal)/dashboard/loading.tsx (CREATE — dashboard loading skeleton)
- src/app/(portal)/calendar/loading.tsx (CREATE — calendar loading skeleton)
- src/app/(portal)/vault/loading.tsx (CREATE — vault loading skeleton)
- src/app/(portal)/controls/loading.tsx (CREATE — controls loading skeleton)
- src/components/ui/skeleton.tsx (CREATE — skeleton shimmer component)
- src/components/ui/empty-state.tsx (CREATE — reusable empty state component)
- src/components/ui/error-card.tsx (CREATE — reusable error display component)
- src/components/ui/loading-spinner.tsx (CREATE — reusable spinner)
- src/components/ui/confirm-dialog.tsx (CREATE — confirmation modal)
- src/components/ui/status-badge.tsx (CREATE — unified status badge component)
- src/components/ui/standard-badge.tsx (CREATE — compliance standard badge)
- src/lib/utils/date-helpers.ts (CREATE — date formatting utilities)
- src/lib/utils/permissions.ts (CREATE if not already created by build 10)
- src/lib/utils.ts (ENHANCE — add utility functions)

Current state: src/app/page.tsx exists as a landing page. No error boundaries, no loading skeletons, no 404 page, no shared UI utility components. Each page handles its own loading/error states inconsistently. Date formatting is done inline. Status badges are duplicated across pages with slight inconsistencies.

## LANDING PAGE (page.tsx) — ENHANCE

Verify the existing landing page matches this spec. If it already has all these sections, leave it alone. If sections are missing or placeholder, enhance:

**Hero Section (full viewport height):**
- Background: gradient from #2A8BA8 (top) to #1A6B85 (bottom) with subtle texture
- Center content:
  - "REPrieve.ai" logo text (Source Serif 4, 48px, white, bold)
  - Tagline: "Compliance + Quality Management Operating System" (Source Sans 3, 20px, white, weight 300)
  - Subtitle: "Built for Arizona behavioral health organizations running IOP and Residential programs" (16px, rgba(255,255,255,0.8))
  - Two CTA buttons:
    - "Start Free Trial" → /signup (white bg, blue-dark text, bold)
    - "Watch Demo" → #demo section (outlined white, white text)
- Bottom: subtle scroll-down indicator (animated chevron)

**Features Section (3 pillars):**
- "Why REPrieve.ai?" section header
- 3 feature cards in a row:
  1. "Automated Checkpoints" — shield icon, "Monthly compliance tasks auto-generated from your control library. Never miss a deadline."
  2. "AI-Powered Analysis" — brain/bot icon, "Four specialized AI agents monitor policies, flag conflicts, and prepare your QM meetings."
  3. "Audit-Ready Evidence" — folder-check icon, "Evidence organized by standard and period. One-click audit binder export."
- Card styling: white bg, subtle shadow, 10px radius, icon at top in colored circle

**How It Works Section (4 steps):**
- Numbered steps with connecting line:
  1. "Sign Up & Set Up" — "Create your org, load controls, invite your team"
  2. "Checkpoints Auto-Generate" — "Monthly tasks created from your control library"
  3. "Complete & Upload Evidence" — "Staff attest, upload proof, AI verifies"
  4. "QM Meetings, Handled" — "AI assembles packets, tracks findings, monitors CAPAs"

**Standards Section:**
- "Built for Your Standards" header
- Grid of standard badges: OIG, HIPAA, AHCCCS, TJC, CARF, Safety
- Each badge: icon + name + brief description
- "Arizona-specific compliance requirements built in"

**AI Team Section:**
- "Meet Your AI Compliance Team" header
- 4 agent cards (same style as AI page):
  - Policy Guardian, Compliance Monitor, Evidence Librarian, QM Orchestrator
  - Each: icon, name, one-line description
- Footer note: "All AI outputs are suggestions only. Every change requires human approval."

**Pricing Section (placeholder):**
- "Simple Pricing" header
- Single card: "Membership — Contact for pricing"
- "Includes: Unlimited users, All AI agents, Priority support, Custom controls"
- "Contact Us" button → mailto:sales@reprieve.ai

**Footer:**
- Logo + tagline
- Links: Features, Pricing, Contact, Privacy Policy, Terms
- "© 2026 REPrieve.ai. All rights reserved."
- "Built for Arizona behavioral health organizations"

## CUSTOM 404 PAGE (not-found.tsx) — CREATE

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F0F9FC',
      fontFamily: "'Source Sans 3', sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: '#2A8BA8',
          fontFamily: "'Source Serif 4', Georgia, serif",
          marginBottom: 8,
        }}>
          404
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#171717',
          fontFamily: "'Source Serif 4', Georgia, serif",
          marginBottom: 12,
        }}>
          Page not found
        </h1>
        <p style={{ fontSize: 15, color: '#737373', marginBottom: 28, lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link
            href="/dashboard"
            style={{
              padding: '10px 20px',
              backgroundColor: '#2A8BA8',
              color: '#fff',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            style={{
              padding: '10px 20px',
              backgroundColor: '#fff',
              color: '#525252',
              border: '1px solid #D4D4D4',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
```

## GLOBAL ERROR BOUNDARY (error.tsx) — CREATE

```tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FEF2F2',
      fontFamily: "'Source Sans 3', sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 600,
          color: '#171717',
          fontFamily: "'Source Serif 4', Georgia, serif",
          marginBottom: 10,
        }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: '#737373', marginBottom: 24 }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2A8BA8',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
```

## PORTAL ERROR BOUNDARY ((portal)/error.tsx) — CREATE

Same pattern but within the portal layout (sidebar/header visible). Shows error inside the main content area, not full-screen.

## LOADING SKELETONS

### Skeleton Component (ui/skeleton.tsx)
```tsx
export function Skeleton({ width, height, borderRadius = 6 }: {
  width?: string | number
  height?: string | number
  borderRadius?: number
}) {
  return (
    <div
      style={{
        width: width ?? '100%',
        height: height ?? 20,
        borderRadius,
        backgroundColor: '#E8E8E8',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

// Also export SkeletonCard, SkeletonRow, SkeletonText helpers
```

Add the pulse animation to globals.css:
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Portal Loading (portal/loading.tsx)
Generic loading skeleton matching the portal layout: skeleton cards in a grid.

### Dashboard Loading (dashboard/loading.tsx)
4 skeleton stat cards + 2-column skeleton layout matching dashboard design.

### Calendar Loading (calendar/loading.tsx)
Skeleton month grid with 35 cells.

### Vault Loading (vault/loading.tsx)
Skeleton table rows.

### Controls Loading (controls/loading.tsx)
4 skeleton stat cards + skeleton table rows.

## SHARED UI COMPONENTS

### Empty State (ui/empty-state.tsx)
```tsx
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}) {
  // Centered empty state with icon, title, description, and optional CTA button
  // Used across all list pages when query returns empty
}
```

### Error Card (ui/error-card.tsx)
```tsx
export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  // Red-tinted card with error message and optional "Try Again" button
  // Consistent error display across all pages
}
```

### Confirm Dialog (ui/confirm-dialog.tsx)
```tsx
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant, // 'danger' | 'default'
  onConfirm,
}: {...}) {
  // Modal overlay with title, description, Cancel + Confirm buttons
  // Danger variant: red confirm button
  // Used for: delete control, deactivate member, reject policy, etc.
}
```

### Status Badge (ui/status-badge.tsx)
Unified component replacing the 10+ inline badge implementations across pages:
```tsx
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  passed: { bg: '#F0FDF4', color: '#16A34A' },
  failed: { bg: '#FEF2F2', color: '#DC2626' },
  pending: { bg: '#FFFBEB', color: '#D97706' },
  overdue: { bg: '#FEF2F2', color: '#DC2626' },
  in_progress: { bg: '#E8F6FA', color: '#2A8BA8' },
  skipped: { bg: '#F5F5F5', color: '#737373' },
  draft: { bg: '#F5F5F5', color: '#737373' },
  in_review: { bg: '#FFFBEB', color: '#D97706' },
  approved: { bg: '#F0FDF4', color: '#16A34A' },
  effective: { bg: '#F0FDF4', color: '#16A34A' },
  retired: { bg: '#F5F5F5', color: '#A3A3A3' },
  open: { bg: '#FFFBEB', color: '#D97706' },
  pending_verification: { bg: '#F5F3FF', color: '#6D28D9' },
  closed: { bg: '#F0FDF4', color: '#16A34A' },
  accepted: { bg: '#F0FDF4', color: '#16A34A' },
  rejected: { bg: '#FEF2F2', color: '#DC2626' },
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: '#F5F5F5', color: '#525252' }
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 600,
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {label}
    </span>
  )
}
```

### Standard Badge (ui/standard-badge.tsx)
Same pattern for compliance standard badges (OIG, HIPAA, AHCCCS, Safety, etc.) — extracted from the duplicated STANDARD_COLORS maps in controls/page.tsx, calendar, evidence, etc.

## DATE HELPERS (lib/utils/date-helpers.ts)

```typescript
// formatRelativeTime('2026-02-25T10:00:00Z') → "2 hours ago"
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return formatDate(dateString)
}

// formatDate('2026-02-25') → "February 25, 2026"
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

// formatShortDate('2026-02-25') → "Feb 25, 2026"
export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// getCurrentPeriod() → "2026-02"
export function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// getPeriodLabel('2026-02') → "February 2026"
export function getPeriodLabel(period: string): string {
  const [year, month] = period.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

// getDaysUntil(dateString) → number (negative if past)
export function getDaysUntil(dateString: string): number {
  const target = new Date(dateString)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

// isOverdue(dueDate, status) → boolean
export function isOverdue(dueDate: string, status: string): boolean {
  if (status === 'closed' || status === 'passed' || status === 'skipped') return false
  return new Date(dueDate) < new Date()
}
```

## UTILS ENHANCEMENT (lib/utils.ts)

Add to existing utils.ts:
```typescript
// cn() — Tailwind class merge (if not already present)
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

DO NOT touch: dashboard, calendar, vault, controls page content, qm, capa, ai, suggestions, evidence, reports, settings, auth pages, layout components (header/sidebar/right-aside), hooks, agents, server actions, or any files not listed above.
