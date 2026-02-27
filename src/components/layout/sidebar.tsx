"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import { navSections } from "./nav-items"
import type { NavItem } from "./nav-items"
import type { OrgRole } from "@/lib/types"

export default function Sidebar() {
  const pathname = usePathname()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<OrgRole | null>(null)
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})

  const fetchBadges = useCallback(async (oid: string) => {
    const supabase = createClient()
    const [{ count: inReview }, { count: pendingSuggestions }] = await Promise.all([
      supabase
        .from("policies")
        .select("*", { count: "exact", head: true })
        .eq("org_id", oid)
        .eq("status", "in_review"),
      supabase
        .from("ai_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("org_id", oid)
        .eq("status", "pending"),
    ])
    setBadgeCounts({
      approvals: inReview ?? 0,
      suggestions: pendingSuggestions ?? 0,
    })
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()
      if (membership?.org_id) {
        setOrgId(membership.org_id)
        setUserRole(membership.role as OrgRole)
        fetchBadges(membership.org_id)
      }
    }
    init()
  }, [fetchBadges])

  useRealtime({
    table: "ai_suggestions",
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    callback: () => { if (orgId) fetchBadges(orgId) },
  })

  useRealtime({
    table: "policies",
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    callback: () => { if (orgId) fetchBadges(orgId) },
  })

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  function isVisible(item: NavItem) {
    if (!item.roles) return true
    if (!userRole) return true // show all while loading
    return item.roles.includes(userRole)
  }

  function NavLink({ item }: { item: NavItem }) {
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
      <nav className="flex flex-col flex-1">
        {navSections.map((section, sectionIdx) => {
          const visibleItems = section.items.filter(isVisible)
          if (visibleItems.length === 0) return null

          return (
            <div key={section.label}>
              {/* Separator line above each section except the first */}
              {sectionIdx > 0 && (
                <div
                  className="mx-3"
                  style={{ height: 1, backgroundColor: "#E8E8E8", marginTop: 8, marginBottom: 8 }}
                />
              )}

              {/* Section label */}
              <div
                className="px-5"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#A3A3A3",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                  marginTop: sectionIdx === 0 ? 0 : 0,
                }}
              >
                {section.label}
              </div>

              {/* Nav items */}
              <div className="flex flex-col gap-0.5">
                {visibleItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
