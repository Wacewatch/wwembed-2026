/**
 * Server-Sent Events stream of the "Online Users" stats.
 *
 * Pushes the live counters every 10 s instead of letting the admin client
 * re-poll /api/admin/stats (a heavy 30-aggregation endpoint).
 *
 * Event payload shape matches the `online` object returned by
 * /api/admin/stats so the existing `OnlineUsersModule` can switch transports
 * with no UI change.
 */
import { NextRequest } from "next/server"
import { getPool } from "@/lib/pg/db"
import { requireAdmin } from "@/lib/pg/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PUSH_INTERVAL_MS = 10_000
const ACTIVE_PAGES_LIMIT = 25
const RECENT_VISITORS_LIMIT = 25

async function buildSnapshot() {
  const pool = getPool()
  const now = Date.now()
  const fiveMinAgo = new Date(now - 5 * 60_000).toISOString()
  const fifteenMinAgo = new Date(now - 15 * 60_000).toISOString()
  const oneHourAgo = new Date(now - 3_600_000).toISOString()
  const twentyFourHoursAgo = new Date(now - 86_400_000).toISOString()

  // Temps réel (fenêtres < 1 jour) → tables brutes obligatoires (les caggs
  // s'arrêtent à now()-1h et ne descendent pas sous le jour). Rapide grâce
  // aux index (viewed_at DESC) + chunk exclusion TimescaleDB.
  const [windowCounts, activePagesRes, recentVisitorsRes] = await Promise.all([
    // 4 fenêtres en un seul scan via FILTER.
    pool.query(
      `SELECT
         count(*) FILTER (WHERE viewed_at >= $1)::int AS u5,
         count(*) FILTER (WHERE viewed_at >= $2)::int AS u15,
         count(*) FILTER (WHERE viewed_at >= $3)::int AS u1h,
         count(*) FILTER (WHERE viewed_at >= $4)::int AS u24
       FROM embed_views
       WHERE viewed_at >= $4`,
      [fiveMinAgo, fifteenMinAgo, oneHourAgo, twentyFourHoursAgo]
    ),
    pool.query(
      `SELECT ww_id,
              count(*)::int AS count,
              (array_agg(media_type ORDER BY viewed_at DESC))[1] AS media_type,
              (array_agg(tmdb_id    ORDER BY viewed_at DESC))[1] AS tmdb_id
       FROM embed_views
       WHERE viewed_at >= $1
       GROUP BY ww_id
       ORDER BY count DESC
       LIMIT $2`,
      [fifteenMinAgo, ACTIVE_PAGES_LIMIT]
    ),
    pool.query(
      `SELECT ip_hash, viewed_at, ww_id, media_type, tmdb_id
       FROM embed_views
       WHERE viewed_at >= $1
       ORDER BY viewed_at DESC
       LIMIT $2`,
      [oneHourAgo, RECENT_VISITORS_LIMIT]
    ),
  ])

  const wc = windowCounts.rows[0] || {}

  return {
    online5min: wc.u5 || 0,
    online15min: wc.u15 || 0,
    online1hour: wc.u1h || 0,
    online24h: wc.u24 || 0,
    activePages: (activePagesRes.rows as any[]).map((p) => ({
      ww_id: p.ww_id,
      count: p.count,
      media_type: p.media_type,
      tmdb_id: p.tmdb_id,
    })),
    recentVisitors: (recentVisitorsRes.rows as any[]).map((v) => ({
      ip_hash: v.ip_hash ? v.ip_hash.substring(0, 8) + "…" : "Anonyme",
      viewed_at: v.viewed_at,
      ww_id: v.ww_id,
      media_type: v.media_type,
      tmdb_id: v.tmdb_id,
    })),
    generated_at: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          closed = true
        }
      }

      const push = async () => {
        if (closed) return
        try {
          const snap = await buildSnapshot()
          safeEnqueue(`event: online\ndata: ${JSON.stringify(snap)}\n\n`)
        } catch (err: any) {
          safeEnqueue(`event: error\ndata: ${JSON.stringify({ message: err?.message || "snap_failed" })}\n\n`)
        }
      }

      // Initial snapshot immediately.
      await push()

      const interval = setInterval(push, PUSH_INTERVAL_MS)
      // Heartbeat every 25s so proxies (nginx, Cloudflare) keep the connection alive.
      const heartbeat = setInterval(() => safeEnqueue(`: ping ${Date.now()}\n\n`), 25_000)

      const cleanup = () => {
        closed = true
        clearInterval(interval)
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      req.signal.addEventListener("abort", cleanup)
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx response buffering
    },
  })
}
