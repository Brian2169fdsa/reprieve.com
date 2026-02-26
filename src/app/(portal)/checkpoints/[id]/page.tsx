"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import CheckpointModal from "@/components/checkpoints/checkpoint-modal"
import type { Checkpoint } from "@/lib/types"

type PageParams = Promise<{ id: string }>

export default function CheckpointDetailPage({ params }: { params: PageParams }) {
  const { id } = use(params)
  const router = useRouter()

  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      setLoading(true)

      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { setError("Not authenticated"); setLoading(false); return }
      setUserId(user.id)

      const { data: member, error: memberErr } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()
      if (memberErr || !member) { setError("No organization found"); setLoading(false); return }
      const oid = member.org_id as string
      setOrgId(oid)

      // Fetch checkpoint with joined control + assignee + evidence
      const { data, error: cpErr } = await supabase
        .from("checkpoints")
        .select(`
          *,
          control:controls(*),
          assignee:profiles!assigned_to(id, full_name, email),
          evidence(*)
        `)
        .eq("id", id)
        .eq("org_id", oid)
        .single()

      if (cpErr || !data) {
        setError("Checkpoint not found or access denied.")
        setLoading(false)
        return
      }

      setCheckpoint(data as Checkpoint)
      setLoading(false)
    }
    init()
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: 32, color: "#737373", fontSize: 14 }}>
        Loading checkpoint…
      </div>
    )
  }

  if (error || !checkpoint) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "#DC2626", fontSize: 14 }}>{error ?? "Checkpoint not found"}</p>
        <button
          onClick={() => router.push("/calendar")}
          style={{ marginTop: 12, fontSize: 13, color: "#3BA7C9", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          ← Back to Calendar
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Breadcrumb */}
      <button
        onClick={() => router.back()}
        style={{ fontSize: 12, color: "#3BA7C9", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 20, display: "block" }}
      >
        ← Back
      </button>

      {/* Main card */}
      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #E8E8E8",
        borderRadius: 10,
        padding: 28,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}>
        {orgId && userId && (
          <CheckpointModal
            checkpoint={checkpoint}
            orgId={orgId}
            userId={userId}
            onComplete={(updated) => setCheckpoint(updated)}
          />
        )}
      </div>
    </div>
  )
}
