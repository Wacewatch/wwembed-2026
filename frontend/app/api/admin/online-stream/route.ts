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
import { getDb } from "@/lib/mongo/db"
import { requireAdmin } from "@/lib/mongo/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PUSH_INTERVAL_MS = 10_000
const ACTIVE_PAGES_LIMIT = 25
const RECENT_VISITORS_LIMIT = 25

async function buildSnapshot() {
  const db = await getDb()
  const now = Date.now()
  const fiveMinAgo = new Date(now - 5 * 60_000).toISOString()
  const fifteenMinAgo = new Date(now - 15 * 60_000).toISOString()
  const oneHourAgo = new Date(now - 3_600_000).toISOString()
  const twentyFourHoursAgo = new Date(now - 86_400_000).toISOString()

  const [u5, u15, u1h, u24, activePages, recentVisitors] = await Promise.all([
    // Total views per window (matches the daily activity chart on /admin).
    // Switched from "unique ip_hash+user_agent" aggregation to a simple
    // countDocuments: counters were stuck on the same number because most
    // recent inserts share `ip_hash=null,user_agent=null` and collapsed into
    // a single bucket. Counting raw events gives the user-expected numbers.
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: fiveMinAgo } }),
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: fifteenMinAgo } }),
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: oneHourAgo } }),
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: twentyFourHoursAgo } }),
    db
      .collection("embed_views")
      .aggregate(
        [
          { $match: { viewed_at: { $gte: fifteenMinAgo } } },
          {
            $group: {
              _id: "$ww_id",
              count: { $sum: 1 },
              media_type: { $first: "$media_type" },
              tmdb_id: { $first: "$tmdb_id" },
            },
          },
          { $sort: { count: -1 } },
          { $limit: ACTIVE_PAGES_LIMIT },
        ],
        { allowDiskUse: true, maxTimeMS: 8000 }
      )
      .toArray(),
    db
      .collection("embed_views")
      .find({ viewed_at: { $gte: oneHourAgo } })
      .sort({ viewed_at: -1 })
      .limit(RECENT_VISITORS_LIMIT)
      .toArray(),
  ])

  return {
    online5min: u5 || 0,
    online15min: u15 || 0,
    online1hour: u1h || 0,
    online24h: u24 || 0,
    activePages: (activePages as any[]).map((p) => ({
      ww_id: p._id,
      count: p.count,
      media_type: p.media_type,
      tmdb_id: p.tmdb_id,
    })),
    recentVisitors: (recentVisitors as any[]).map((v) => ({
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
