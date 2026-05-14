/**
 * Admin endpoints for the link-health subsystem.
 *
 * GET  → returns aggregate health (alive/dead/unknown counts per collection)
 *        + last scan report + most recent dead links.
 * POST → kicks a scan in background and returns immediately.
 *        Pass `?wait=1` to block until the scan finishes (useful for
 *        manual "Run now" button feedback).
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/mongo/auth"
import { getDb } from "@/lib/mongo/db"
import { triggerLinkCheckBackground, runLinkCheckNow, readLastScan } from "@/lib/link-checker-runner"
import { checkAndRecord, LINK_COLLECTIONS, type LinkType } from "@/lib/link-checker"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getDb()
  const params = req.nextUrl.searchParams
  const onlyDead = params.get("only_dead") === "1"
  const limit = Math.min(200, parseInt(params.get("limit") || "50", 10) || 50)

  const [statusBreakdown, lastScan, deadList] = await Promise.all([
    db
      .collection("link_status")
      .aggregate([
        { $group: { _id: { coll: "$link_type", status: "$status" }, n: { $sum: 1 } } },
      ])
      .toArray(),
    readLastScan(),
    db
      .collection("link_status")
      .find(onlyDead ? { status: "dead" } : { status: { $in: ["dead", "unknown"] } })
      .sort({ dead_since: -1, last_checked_at: -1 })
      .limit(limit)
      .toArray(),
  ])

  // Pivot breakdown → { download: {alive,dead,unknown}, ... }
  const breakdown: Record<string, Record<string, number>> = {
    download: { alive: 0, dead: 0, unknown: 0 },
    digital: { alive: 0, dead: 0, unknown: 0 },
    streaming: { alive: 0, dead: 0, unknown: 0 },
  }
  for (const row of statusBreakdown as any[]) {
    const c = row._id?.coll
    const s = row._id?.status
    if (c && s && breakdown[c]) breakdown[c][s] = (breakdown[c][s] || 0) + row.n
  }

  // Cleanup _id from dead list rows.
  const sanitized = (deadList as any[]).map((d) => ({ ...d, _id: undefined }))

  return NextResponse.json({
    breakdown,
    last_scan: lastScan,
    dead_links: sanitized,
  })
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const wait = req.nextUrl.searchParams.get("wait") === "1"
  const linkId = req.nextUrl.searchParams.get("link_id")
  const linkType = req.nextUrl.searchParams.get("link_type") as LinkType | null

  // Single-link recheck mode.
  if (linkId && linkType && LINK_COLLECTIONS[linkType]) {
    const db = await getDb()
    const coll = db.collection(LINK_COLLECTIONS[linkType])
    const row: any = await coll.findOne(
      { $or: [{ legacy_uuid: linkId }, { id: linkId }] },
      { projection: { source_url: 1, url: 1 } }
    )
    const url = row?.source_url || row?.url
    if (!url) return NextResponse.json({ error: "link not found" }, { status: 404 })
    const { effective, result } = await checkAndRecord({ linkId, linkType, url })
    return NextResponse.json({ effective, result })
  }

  if (wait) {
    const report = await runLinkCheckNow()
    return NextResponse.json({ ok: true, report })
  }
  triggerLinkCheckBackground({ force: true })
  return NextResponse.json({ ok: true, background: true })
}
