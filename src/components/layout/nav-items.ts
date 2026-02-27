import type { OrgRole } from "@/lib/types"

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: "approvals" | "suggestions"
  roles?: OrgRole[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { label: "Calendar", href: "/calendar", icon: "📅" },
      { label: "Controls", href: "/controls", icon: "🛡", roles: ["admin", "compliance"] },
      { label: "Evidence", href: "/evidence", icon: "📎" },
    ],
  },
  {
    label: "Policy",
    items: [
      { label: "Knowledge Vault", href: "/vault", icon: "📖" },
      { label: "Approvals", href: "/approvals", icon: "✅", badge: "approvals", roles: ["admin", "compliance", "supervisor"] },
    ],
  },
  {
    label: "Quality",
    items: [
      { label: "QM Workbench", href: "/qm", icon: "📊", roles: ["admin", "compliance", "executive"] },
      { label: "CAPAs", href: "/capa", icon: "🔄" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "AI Agents", href: "/ai", icon: "🤖", roles: ["admin", "compliance"] },
      { label: "Suggestions", href: "/suggestions", icon: "💡", badge: "suggestions" },
      { label: "Reports", href: "/reports", icon: "📄" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: "⚙", roles: ["admin"] },
    ],
  },
]

// Flat list for backwards compat
export const navItems: NavItem[] = navSections.flatMap((s) => s.items)
export const settingsItem: NavItem = { label: "Settings", href: "/settings", icon: "⚙", roles: ["admin"] }
