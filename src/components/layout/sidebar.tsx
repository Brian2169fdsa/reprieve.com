"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navItems, settingsItem } from "./nav-items"

// Hardcoded badge counts for seed data
const badgeCounts: Record<string, number> = {
  approvals: 3,
  suggestions: 5,
}

export default function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  function NavLink({ item }: { item: typeof navItems[0] }) {
    const active = isActive(item.href)
    const count = item.badge ? badgeCounts[item.badge] : undefined

    return (
      <Link
        href={item.href}
        className="flex items-center justify-between px-3 py-[7px] rounded-sm transition-colors text-[13px] font-semibold mx-2 group"
        style={
          active
            ? {
                backgroundColor: "#E8F6FA",
                color: "#2A8BA8",
                borderLeft: "3px solid #3BA7C9",
                paddingLeft: "9px",
              }
            : {
                color: "#525252",
                borderLeft: "3px solid transparent",
              }
        }
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "#F5F5F5"
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = ""
          }
        }}
      >
        <span className="flex items-center gap-2.5">
          <span className="text-base leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </span>
        {count !== undefined && count > 0 && (
          <span
            className="flex items-center justify-center text-white text-[10px] font-bold rounded-full"
            style={{
              width: 18,
              height: 18,
              backgroundColor: active ? "#3BA7C9" : "#A3A3A3",
              minWidth: 18,
            }}
          >
            {count}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className="flex flex-col py-3 shrink-0 overflow-y-auto"
      style={{
        width: 200,
        backgroundColor: "white",
        borderRight: "1px solid #E8E8E8",
      }}
    >
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Separator + Settings */}
      <div className="mt-2">
        <div className="mx-3 mb-2" style={{ height: 1, backgroundColor: "#E8E8E8" }} />
        <NavLink item={settingsItem} />
      </div>
    </aside>
  )
}
