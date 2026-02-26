"use client"

import { usePathname } from "next/navigation"
import Header from "@/components/layout/header"
import Sidebar from "@/components/layout/sidebar"
import RightAside from "@/components/layout/right-aside"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isDashboard = pathname === "/dashboard"

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
