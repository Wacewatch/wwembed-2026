/**
 * Cron endpoint: rebuild the daily stats rollup.
 *
 * Call this every 15-30 min (or hourly) from your favorite cron service:
 *   curl -fsS "https://your-domain.tld/api/admin/stats-rollup?secret=$CRON_SECRET"
 *
 * It rebuilds today + yesterday by default (idempotent). Pass `?days=N` to
 * backfill more days (used once after deploy to populate history).
 */
import { NextRequest, NextResponse } from "next/server"
import { rebuildSince } from "@/lib/stats-rollup"

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  const expected = process.env.CRON_SECRET
  if (!expected || expected.length < 16) {
    return NextResponse.json({ error: "Cron endpoint disabled (CRON_SECRET missing)" }, { status: 503 })
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const days = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("days") || "2", 10)))
  try {
    const rollups = await rebuildSince(days)
    return NextResponse.json({
      ok: true,
      days_built: rollups.length,
      latest: rollups[0] || null,
    })
  } catch (e: any) {
    console.error("[stats-rollup cron] failed:", e)
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
