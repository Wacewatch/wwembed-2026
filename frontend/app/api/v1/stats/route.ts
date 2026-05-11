/**
 * GET /api/v1/stats
 *
 * Aggregate stats for the WaveWatch admin "Téléchargements" tab.
 * NOTE: as per the WaveWatch spec, /stats is the *only* endpoint that does
 * NOT apply the implicit (is_active, status, is_valid) filter — it counts the
 * full corpus.
 *
 * Response: { total, last_24h }
 */
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"
import { requireApiKey } from "@/lib/wavewatch-api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req)
  if (denied) return denied

  try {
    const db = await getDb()
    const coll = db.collection("download_links")

    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [total, last24h] = await Promise.all([
      coll.countDocuments({}),
      coll.countDocuments({ created_at: { $gte: dayAgoIso } }),
    ])

    return NextResponse.json({ total, last_24h: last24h })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", reason: e?.message || "unknown" },
      { status: 500 }
    )
  }
}
