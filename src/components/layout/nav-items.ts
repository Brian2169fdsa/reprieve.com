export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: "approvals" | "suggestions"
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Calendar", href: "/calendar", icon: "📅" },
  { label: "Controls", href: "/controls", icon: "🛡" },
  { label: "Evidence", href: "/evidence", icon: "📎" },
  { label: "Knowledge Vault", href: "/vault", icon: "📖" },
  { label: "Approvals", href: "/approvals", icon: "✅", badge: "approvals" },
  { label: "QM Workbench", href: "/qm", icon: "📊" },
  { label: "CAPAs", href: "/capa", icon: "🔄" },
  { label: "AI Activity", href: "/ai", icon: "🤖" },
  { label: "Suggestions", href: "/suggestions", icon: "💡", badge: "suggestions" },
  { label: "Reports", href: "/reports", icon: "📄" },
]

export const settingsItem: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: "⚙",
}
