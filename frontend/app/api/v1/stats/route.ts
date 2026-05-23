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
import { createAdminClient } from "@/lib/supabase/admin"
import { requireApiKey } from "@/lib/wavewatch-api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req)
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [totalRes, last24Res] = await Promise.all([
      supabase.from("download_links").select("*", { count: "exact", head: true }),
      supabase
        .from("download_links")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dayAgoIso),
    ])

    return NextResponse.json({
      total: totalRes.count ?? 0,
      last_24h: last24Res.count ?? 0,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", reason: e?.message || "unknown" },
      { status: 500 }
    )
  }
}
