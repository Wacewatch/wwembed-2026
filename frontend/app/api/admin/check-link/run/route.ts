/**
 * Admin endpoints for the link-health subsystem.
 *
 * GET  → returns aggregate health (alive/dead/unknown counts per collection)
 *        + last scan report + most recent dead links.
 * POST → kicks a scan in background and returns immediately.
 *        Pass `?wait=1` to block until the scan finishes (useful for
 *        manual "Run now" button feedback).
 *
 * Migration Mongo → PostgreSQL : breakdown link_status via GROUP BY,
 * liste dead via SELECT ordonné, recheck single-link via SELECT $or sur la
 * table parente. readLastScan/triggerLinkCheckBackground déjà migrés (cat.2).
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/pg/auth"
import { getPool } from "@/lib/pg/db"
import { triggerLinkCheckBackground, runLinkCheckNow, readLastScan } from "@/lib/link-checker-runner"
import { checkAndRecord, LINK_COLLECTIONS, type LinkType } from "@/lib/link-checker"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pool = getPool()
  const params = req.nextUrl.searchParams
  const onlyDead = params.get("only_dead") === "1"
  const limit = Math.min(200, parseInt(params.get("limit") || "50", 10) || 50)

  const [statusBreakdownRes, lastScan, deadListRes] = await Promise.all([
    pool.query(
      `SELECT link_type AS coll, status, count(*)::int AS n
       FROM link_status
       GROUP BY link_type, status`
    ),
    readLastScan(),
    pool.query(
      onlyDead
        ? `SELECT * FROM link_status WHERE status = 'dead'
           ORDER BY dead_since DESC NULLS LAST, last_checked_at DESC NULLS LAST LIMIT $1`
        : `SELECT * FROM link_status WHERE status IN ('dead','unknown')
           ORDER BY dead_since DESC NULLS LAST, last_checked_at DESC NULLS LAST LIMIT $1`,
      [limit]
    ),
  ])

  // Pivot breakdown → { download: {alive,dead,unknown}, ... }
  const breakdown: Record<string, Record<string, number>> = {
    download: { alive: 0, dead: 0, unknown: 0 },
    digital: { alive: 0, dead: 0, unknown: 0 },
    streaming: { alive: 0, dead: 0, unknown: 0 },
  }
  for (const row of statusBreakdownRes.rows as any[]) {
    const c = row.coll
    const s = row.status
    if (c && s && breakdown[c]) breakdown[c][s] = (breakdown[c][s] || 0) + row.n
  }

  // Les lignes Postgres n'ont pas de _id Mongo ; on expose telles quelles
  // (la colonne `id` uuid est anodine pour l'UI admin).
  const dead_links = deadListRes.rows

  return NextResponse.json({
    breakdown,
    last_scan: lastScan,
    dead_links,
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
    const pool = getPool()
    const table = LINK_COLLECTIONS[linkType]
    // link_id = download_links.id (migration legacy_uuid → id).
    // source_url/url peuvent être colonne typée ou data jsonb → to_jsonb.
    const r = await pool.query(
      `SELECT COALESCE(to_jsonb(t)->>'source_url', to_jsonb(t)->>'url',
                       t.data->>'source_url', t.data->>'url') AS url
       FROM ${table} t
       WHERE id::text = $1
       LIMIT 1`,
      [linkId]
    )
    const url = r.rows[0]?.url
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
