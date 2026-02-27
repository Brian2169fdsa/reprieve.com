Read CLAUDE.md first. Your job is to build the notification system — a dropdown in the header, notification preferences, the notification bell badge wired to real data, toast notifications for live events, and Supabase Realtime subscriptions for live dashboard updates.

INSTALL FIRST:
```
npm install sonner
npx shadcn@latest add popover switch --yes
```

ONLY touch these files (create if needed):
- src/components/layout/header.tsx (ENHANCE — add notification dropdown)
- src/components/notifications/notification-dropdown.tsx (CREATE — notification panel)
- src/components/notifications/notification-item.tsx (CREATE — single notification row)
- src/components/notifications/notification-preferences.tsx (CREATE — notification settings)
- src/components/notifications/toast-provider.tsx (CREATE — Sonner toast wrapper)
- src/hooks/use-realtime.ts (ENHANCE — currently exists, wire up real subscriptions)
- src/hooks/use-notifications.ts (CREATE — notification data hook)
- src/app/(portal)/layout.tsx (ENHANCE — add toast provider)
- src/app/(portal)/notifications/page.tsx (CREATE — full notifications page)
- src/app/(portal)/settings/notifications/page.tsx (CREATE — notification preferences page)

Current state: header.tsx has a notification bell icon with a hardcoded badge count of 3. use-realtime.ts exists but needs real subscription wiring. No notification dropdown, no toast system, no notification preferences page.

## NOTIFICATION DROPDOWN (notification-dropdown.tsx) — CREATE

A floating panel that appears when clicking the bell icon in the header.

**Trigger:** Click on bell icon in header
**Position:** Below bell icon, right-aligned, drop-down panel
**Width:** 380px
**Max height:** 480px with scroll

**Header row:**
- "Notifications" title (14px, bold)
- Unread count badge (e.g., "3 new")
- "Mark all read" button (text button, blue)
- "Settings" gear icon → navigates to /settings/notifications

**Tab bar:**
- "All" | "Unread" tabs
- Active tab: blue underline

**Notification list (scrollable):**
Each notification item:
- Left: icon colored by type:
  - checkpoint_due: blue calendar icon
  - overdue: red alert-triangle icon
  - suggestion: purple lightbulb icon
  - approval_needed: amber check-circle icon
  - capa_due: orange refresh icon
  - system: gray info icon
- Middle:
  - Title (13px, bold if unread, regular if read)
  - Message text (12px, #737373, 2 lines max, truncated)
  - Relative time (12px, #A3A3A3) — "2 hours ago", "Yesterday", "3 days ago"
- Right: blue dot indicator if unread
- Background: unread = #F0F9FC light blue tint, read = white

**Click behavior:**
- Mark notification as read (UPDATE notifications SET is_read=true WHERE id=notification_id)
- Navigate to the relevant entity page based on entity_type + entity_id:
  - checkpoint → /checkpoints/{entity_id} or open checkpoint modal
  - policy → /vault/{entity_id}
  - capa → /capa/{entity_id}
  - suggestion → /suggestions
  - qm_meeting → /qm
- Close dropdown

**Empty state:**
"All caught up! No new notifications." with a bell icon illustration.

**Footer:**
"View all notifications" link → /notifications

**Panel Styling:**
- White bg, 1px #E8E8E8 border, 12px radius, shadow-lg
- Z-index: 50
- Click-outside-to-close behavior
- Appear with fade-in + slight translateY animation

**Data source:**
Query: notifications WHERE user_id=auth.uid() AND org_id=current_org ORDER BY created_at DESC LIMIT 20

## HEADER ENHANCEMENT (header.tsx)

- Replace hardcoded badge "3" with real count from notifications WHERE is_read=false AND user_id=auth.uid()
- Add click handler on bell icon that toggles notification-dropdown
- Badge styling: red dot if count > 0, show count number if count > 9 show "9+"
- Add subtle bell animation (wobble) when a new notification arrives via Realtime

## FULL NOTIFICATIONS PAGE (notifications/page.tsx) — CREATE

Full-page view of all notifications (for "View all notifications" link).

**Page Header:**
- "Notifications" title
- "Manage your compliance alerts and updates" subtitle
- Filter tabs: "All", "Unread", "Checkpoints", "Approvals", "AI Suggestions", "CAPAs"
- "Mark all read" button

**Notification List:**
Same item design as dropdown but full-width cards:
- Each notification as a card with more detail visible
- Show full message (not truncated)
- Show entity reference: "Related to: {entity_type} — {entity title}"
- Action buttons: "View" (blue) and "Dismiss" (gray)
- Batch actions: select multiple + "Mark as read" / "Delete selected"

**Pagination:**
25 per page, "Load more" button at bottom (or infinite scroll)

**Data query:**
notifications WHERE user_id=auth.uid() AND org_id=current_org ORDER BY created_at DESC

## USE-NOTIFICATIONS HOOK (use-notifications.ts) — CREATE

```typescript
export function useNotifications() {
  // Returns:
  // - notifications: Notification[]
  // - unreadCount: number
  // - loading: boolean
  // - markAsRead: (id: string) => Promise<void>
  // - markAllRead: () => Promise<void>
  // - deleteNotification: (id: string) => Promise<void>
  // - refetch: () => void

  // Subscribes to Supabase Realtime for live notification updates
  // When a new notification arrives: increment unreadCount, prepend to list, trigger toast
}
```

## TOAST SYSTEM (toast-provider.tsx) — CREATE

Using Sonner (already installed):

```tsx
import { Toaster, toast } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: "'Source Sans 3', sans-serif",
          fontSize: '13px',
        },
      }}
      richColors
    />
  )
}

// Helper functions for consistent toast styling:
export function toastSuccess(title: string, description?: string) {
  toast.success(title, { description })
}

export function toastError(title: string, description?: string) {
  toast.error(title, { description })
}

export function toastNotification(notification: Notification) {
  // Show a rich toast for incoming realtime notifications
  toast(notification.title, {
    description: notification.message,
    action: {
      label: 'View',
      onClick: () => { /* navigate to entity */ }
    }
  })
}
```

Add `<ToastProvider />` to the portal layout.tsx.

## REALTIME SUBSCRIPTIONS (use-realtime.ts) — ENHANCE

Wire up real Supabase Realtime subscriptions. The hook should be used in the portal layout so subscriptions are active for all portal pages.

```typescript
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function useRealtimeSubscriptions(orgId: string, userId: string) {
  useEffect(() => {
    if (!orgId || !userId) return

    const supabase = createClient()

    // 1. Subscribe to notifications table for this user
    const notificationChannel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // Trigger toast notification
        // Update notification count in header
        toastNotification(payload.new as Notification)
      })
      .subscribe()

    // 2. Subscribe to checkpoints for this org (dashboard live updates)
    const checkpointChannel = supabase
      .channel('checkpoints')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'checkpoints',
        filter: `org_id=eq.${orgId}`,
      }, (payload) => {
        // Emit custom event for dashboard to pick up
        window.dispatchEvent(new CustomEvent('checkpoint-update', { detail: payload }))
      })
      .subscribe()

    // 3. Subscribe to ai_suggestions for this org
    const suggestionsChannel = supabase
      .channel('ai_suggestions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_suggestions',
        filter: `org_id=eq.${orgId}`,
      }, (payload) => {
        // Show toast: "New AI suggestion: {title}"
        toast('New AI Suggestion', {
          description: (payload.new as Record<string, string>).title,
          action: { label: 'Review', onClick: () => window.location.href = '/suggestions' }
        })
      })
      .subscribe()

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(notificationChannel)
      supabase.removeChannel(checkpointChannel)
      supabase.removeChannel(suggestionsChannel)
    }
  }, [orgId, userId])
}
```

## NOTIFICATION PREFERENCES (settings/notifications/page.tsx) — CREATE

**Page Header:**
- "Notification Preferences" title
- "Control which notifications you receive" subtitle

**Sections (each with toggle switches):**

Section 1 — **Checkpoints:**
- "Checkpoint due reminders" — toggle (default: on)
- "Overdue alerts" — toggle (default: on)
- "Checkpoint completed by team" — toggle (default: on)

Section 2 — **Approvals:**
- "Policy approval requests" — toggle (default: on)
- "AI suggestion reviews" — toggle (default: on)

Section 3 — **Quality Management:**
- "QM meeting reminders" — toggle (default: on)
- "CAPA due date alerts" — toggle (default: on)
- "Finding notifications" — toggle (default: on)

Section 4 — **AI Agents:**
- "Agent run completions" — toggle (default: off)
- "New AI suggestions" — toggle (default: on)
- "Policy conflict alerts" — toggle (default: on)

**Save behavior:**
Store preferences in profiles or organizations.settings JSONB (add a notification_preferences key).
On toggle change: immediately save to DB (optimistic update).

**Design:**
- Each section: white card, section title (13px, bold, uppercase, #737373), separator between sections
- Toggle switches: same style as controls/page.tsx active toggles (36x20px, #3BA7C9 when on, #D4D4D4 when off)

## PORTAL LAYOUT ENHANCEMENT (layout.tsx)

Add to the portal layout:
1. `<ToastProvider />` component
2. Call `useRealtimeSubscriptions(orgId, userId)` to start listening
3. Pass orgId and userId from the existing auth context

DO NOT touch: dashboard, controls, vault, qm, capa, calendar, checkpoints, ai, suggestions, evidence, reports, settings/page.tsx, settings/members, settings/roles, auth pages, sidebar, right-aside, or any files not listed above.
