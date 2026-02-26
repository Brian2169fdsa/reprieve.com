import StatsGrid from "@/components/dashboard/stats-grid"
import UpcomingTasks from "@/components/dashboard/upcoming-tasks"
import AIActivityFeed from "@/components/dashboard/ai-activity-feed"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h1
          className="text-[22px] font-semibold leading-tight"
          style={{ fontFamily: "Source Serif 4, Georgia, serif", color: "#171717" }}
        >
          Dashboard
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#737373" }}>
          February 2026 · Cholla Behavioral Health
        </p>
      </div>

      {/* Stats grid */}
      <StatsGrid />

      {/* Two-column lower section */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <UpcomingTasks />
        <AIActivityFeed />
      </div>
    </div>
  )
}
