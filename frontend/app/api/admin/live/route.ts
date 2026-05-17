/**
 * GET /api/admin/live
 *
 * Lightweight endpoint for the "live" section of the admin dashboard.
 * Returns ONLY the data that needs to be (near) real-time:
 *   - Online users counts (5min, 15min, 1h, 24h)
 *   - Active pages (last 15min, top 20, enriched with TMDB/digital/live)
 *   - Recent visitors (last 1h, top 50, enriched)
 *
 * Cache: 15 seconds in Redis. Designed to be polled by the admin UI every
 * 15-30 seconds without saturating the server (cache hit = <10ms).
 *
 * IMPORTANT: this endpoint is intentionally SEPARATE from /api/admin/stats
 * which is much heavier (35+ aggregations) and only refreshes when the user
 * opens the admin tab. Splitting "live" and "period" data allows fast polling
 * of live metrics without rebuilding heavy period-aggregations.
 */
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"
import { requireAdmin } from "@/lib/mongo/auth"
import { fetchTmdbCached } from "@/lib/tmdb-cache"
import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379", {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
  lazyConnect: true,
})
redis.on("error", (err) => console.error("[redis live]", err.message))

async function fetchTmdb(type: string, id: number) {
  if (type !== "movie" && type !== "tv") return { title: `#${id}`, poster: null }
  return fetchTmdbCached(type as "movie" | "tv", id)
}

export async function GET(req: NextRequest) {
  // Bypass auth for internal warmup (same pattern as /api/admin/stats)
  const internalWarmup = req.headers.get("x-internal-warmup")
  const isWarmup =
    internalWarmup !== null &&
    process.env.INTERNAL_WARMUP_TOKEN !== undefined &&
    internalWarmup === process.env.INTERNAL_WARMUP_TOKEN

  if (!isWarmup) {
    try {
      await requireAdmin(req)
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const CACHE_KEY = "admin:live"
  const TTL_SECONDS = 15

  try {
    // 1) Try cache first
    try {
      const cached = await redis.get(CACHE_KEY)
      if (cached) {
        return NextResponse.json(JSON.parse(cached))
      }
    } catch (e) {
      // Redis down, continue without cache
    }

    // 2) Build fresh response
    const data = await buildLiveResponse()

    // 3) Cache for 15s
    try {
      await redis.setex(CACHE_KEY, TTL_SECONDS, JSON.stringify(data))
    } catch (e) {
      // Redis down, ignore
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error("[admin/live] failed:", err?.stack || err)
    return NextResponse.json(
      { error: "Internal error", message: err?.message || String(err) },
      { status: 500 }
    )
  }
}

async function buildLiveResponse() {
  const now = new Date()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString()
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60000).toISOString()
  const oneHourAgo = new Date(now.getTime() - 3600000).toISOString()
  const twentyFourHoursAgo = new Date(now.getTime() - 86400000).toISOString()

  const db = await getDb()

  const AGG_OPTS = { allowDiskUse: true, maxTimeMS: 8000 }

  // Run all 6 queries in parallel — they are all light:
  //   - 4 countDocuments (indexed, very fast: <50ms each)
  //   - 1 aggregate for activePages on last 15min (small window)
  //   - 1 aggregate for recentVisitors on last 1h ($limit: 50 keeps RAM bounded)
  const [
    online5min,
    online15min,
    online1hour,
    online24h,
    activePagesRaw,
    recentVisitorsRaw,
  ] = await Promise.all([
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: fiveMinAgo } }),
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: fifteenMinAgo } }),
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: oneHourAgo } }),
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: twentyFourHoursAgo } }),
    // Active pages: ww_id grouped by view count over last 15min, top 20
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
          { $limit: 20 },
        ],
        AGG_OPTS
      )
      .toArray(),
    // Recent visitors: last 50 events of the past hour (already sorted via index)
    db
      .collection("embed_views")
      .aggregate(
        [
          { $match: { viewed_at: { $gte: oneHourAgo } } },
          { $sort: { viewed_at: -1 } },
          { $limit: 50 },
        ],
        AGG_OPTS
      )
      .toArray(),
  ])

  // Collect IDs that need TMDB/channel/digital enrichment
  const channelIds = new Set<string>()
  const digitalIds = new Set<string>()
  const collectDigitalIds = (ww: string | undefined | null) => {
    if (ww && /^ww-(ebook|music|soft|game)-/.test(ww)) digitalIds.add(ww)
  }

  for (const p of activePagesRaw as any[]) {
    if (p._id?.startsWith?.("ww-live-")) channelIds.add(p._id.slice("ww-live-".length))
    collectDigitalIds(p._id)
  }
  for (const v of recentVisitorsRaw as any[]) {
    if (v.ww_id?.startsWith?.("ww-live-")) channelIds.add(v.ww_id.slice("ww-live-".length))
    collectDigitalIds(v.ww_id)
  }

  // Resolve live TV channels
  const ObjectIdLib = (await import("mongodb")).ObjectId
  const uuidToObjectIdHex = (uuid: string): string =>
    uuid.replace(/-/g, "").slice(0, 24).padEnd(24, "0")

  const channelMap = new Map<string, any>()
  if (channelIds.size > 0) {
    const stringIds: any[] = []
    const objectIds: any[] = []
    const legacyUuids: string[] = []
    for (const cid of channelIds) {
      stringIds.push(cid)
      if (/^[a-f0-9]{24}$/i.test(cid)) {
        try {
          objectIds.push(new ObjectIdLib(cid))
        } catch {}
      }
      if (/^[0-9a-f-]{36}$/i.test(cid)) {
        try {
          objectIds.push(new ObjectIdLib(uuidToObjectIdHex(cid)))
        } catch {}
        legacyUuids.push(cid)
      }
    }
    const allIds = [...stringIds, ...objectIds]
    const channels = await db
      .collection("live_tv_channels")
      .find({
        $or: [
          { _id: { $in: allIds } },
          { id: { $in: stringIds } },
          { legacy_uuid: { $in: legacyUuids } },
        ],
      })
      .project({ channel_name: 1, channel_logo: 1, legacy_uuid: 1 })
      .toArray()
    for (const c of channels) {
      const entry = { title: c.channel_name, poster: c.channel_logo }
      channelMap.set(c._id?.toString(), entry)
      if (c.legacy_uuid) channelMap.set(c.legacy_uuid, entry)
    }
  }

  // Resolve digital content
  const digitalMap = new Map<string, any>()
  if (digitalIds.size > 0) {
    const digitals = await db
      .collection("digital_content")
      .find({ ww_id: { $in: Array.from(digitalIds) } })
      .project({ ww_id: 1, title: 1, cover_url: 1, content_type: 1 })
      .toArray()
    for (const d of digitals)
      digitalMap.set(d.ww_id, {
        title: d.title,
        poster: d.cover_url,
        content_type: d.content_type,
      })
  }

  // Enrich active pages
  const activePages = await Promise.all(
    (activePagesRaw as any[]).map(async (p) => {
      const wwId = p._id
      let title = wwId
      let poster: string | null = null
      let mediaType: string = p.media_type
      if (wwId?.startsWith?.("ww-live-")) {
        const ch = channelMap.get(wwId.slice("ww-live-".length))
        title = ch?.title || wwId
        poster = ch?.poster || null
        mediaType = "live"
      } else if (wwId && /^ww-(ebook|music|soft|game)-/.test(wwId)) {
        const dg = digitalMap.get(wwId)
        title = dg?.title || "Contenu Digital"
        poster = dg?.poster || null
        mediaType = dg?.content_type || "digital"
      } else if (p.tmdb_id && (p.media_type === "movie" || p.media_type === "tv")) {
        const tm = await fetchTmdb(p.media_type, p.tmdb_id)
        title = tm.title
        poster = tm.poster
      }
      return { ww_id: wwId, count: p.count, media_type: mediaType, title, poster }
    })
  )

  // Enrich recent visitors (deduplicated by ww_id|viewed_at)
  const recentVisitorsSeen = new Set<string>()
  const recentVisitors = await Promise.all(
    (recentVisitorsRaw as any[])
      .filter((v) => {
        const k = v.ww_id || v.viewed_at
        if (recentVisitorsSeen.has(k)) return false
        recentVisitorsSeen.add(k)
        return true
      })
      .map(async (v) => {
        let title = v.ww_id || "N/A"
        let poster: string | null = null
        let mediaType = v.media_type || "?"
        if (v.ww_id?.startsWith?.("ww-live-")) {
          const ch = channelMap.get(v.ww_id.slice("ww-live-".length))
          title = ch?.title || v.ww_id
          poster = ch?.poster || null
          mediaType = "live"
        } else if (v.ww_id && /^ww-(ebook|music|soft|game)-/.test(v.ww_id)) {
          const dg = digitalMap.get(v.ww_id)
          title = dg?.title || "Contenu Digital"
          poster = dg?.poster || null
          mediaType = dg?.content_type || "digital"
        } else if (v.tmdb_id && (v.media_type === "movie" || v.media_type === "tv")) {
          const tm = await fetchTmdb(v.media_type, v.tmdb_id)
          title = tm.title
          poster = tm.poster
        }
        return {
          ip_hash: v.ip_hash ? v.ip_hash.substring(0, 8) + "…" : "Anonyme",
          viewed_at: v.viewed_at,
          ww_id: v.ww_id || "N/A",
          media_type: mediaType,
          title,
          poster,
        }
      })
  )

  return {
    online5min,
    online15min,
    online1hour,
    online24h,
    activePages,
    recentVisitors,
    cached_at: Date.now(),
  }
}
