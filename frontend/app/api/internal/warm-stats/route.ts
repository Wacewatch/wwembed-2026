/**
 * Internal warmup endpoint — appelé par cron pour garder le cache stats chaud.
 * Pas exposé via NPMplus (filtré sur le hostname public).
 * Protégé par header X-Internal-Token (valeur INTERNAL_WARMUP_TOKEN du .env).
 *
 * Usage:
 *   curl -H "X-Internal-Token: <token>" http://wwembed2-frontend:3000/api/internal/warm-stats
 */
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-internal-token")
  const expected = process.env.INTERNAL_WARMUP_TOKEN

  if (!expected) {
    return NextResponse.json(
      { error: "INTERNAL_WARMUP_TOKEN not configured" },
      { status: 500 }
    )
  }
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const periods = [7, 14, 30, 90]
  const port = process.env.PORT || "3000"
  const baseUrl = `http://127.0.0.1:${port}`
  const results: Record<string, any> = {}

  // Séquentiel pour ne pas saturer Mongo en parallèle
  for (const period of periods) {
    const t0 = Date.now()
    try {
      const r = await fetch(`${baseUrl}/api/admin/stats?period=${period}`, {
        headers: { "x-internal-warmup": expected },
        // Pas de cache fetch côté Next
        cache: "no-store",
      })
      results[`period_${period}`] = {
        status: r.status,
        ms: Date.now() - t0,
      }
    } catch (e: any) {
      results[`period_${period}`] = {
        error: e?.message || String(e),
        ms: Date.now() - t0,
      }
    }
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString(), results })
}
