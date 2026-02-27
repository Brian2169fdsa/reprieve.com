"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Header from "@/components/layout/header"
import Sidebar from "@/components/layout/sidebar"
import RightAside from "@/components/layout/right-aside"
import { createClient } from "@/lib/supabase/client"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isDashboard = pathname === "/dashboard"
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
        return
      }

      setAuthChecked(true)
    }

    checkAuth()
  }, [pathname, router])

  // Show nothing while checking auth to prevent flash of content
  if (!authChecked) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "100vh", backgroundColor: "#FAFAFA" }}
      >
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
            style={{ color: "#2A8BA8" }}
          />
          <p className="mt-3 text-sm" style={{ color: "#737373" }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: "24px", backgroundColor: "#FFFFFF" }}
        >
          {children}
        </main>
        {isDashboard && <RightAside />}
      </div>
    </div>
  )
}
