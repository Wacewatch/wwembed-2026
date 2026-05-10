import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/mongo/auth"
import { startImportJob, getLatestJob, getJobById } from "@/lib/mongo/supabase-import"

function serializeJob(job: any) {
  if (!job) return null
  return {
    id: job._id?.toString?.() || job._id,
    status: job.status,
    phase: job.phase,
    started_at: job.started_at,
    finished_at: job.finished_at,
    current_table: job.current_table,
    total_rows: job.total_rows,
    tables: job.tables,
    auth_users: job.auth_users,
    error: job.error,
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const job = await startImportJob()
    return NextResponse.json({ ok: true, job: serializeJob(job) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "import failed" }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const job = id ? await getJobById(id) : await getLatestJob()
  return NextResponse.json({ job: serializeJob(job) })
}
