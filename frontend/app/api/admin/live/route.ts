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
import { getPool } from "@/lib/pg/db"
import { requireAdmin } from "@/lib/pg/auth"
import { fetchTmdbCached } from "@/lib/tmdb-cache"
import { getRedis } from "@/lib/redis"

const redis = getRedis()

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

  const pool = getPool()

  // Temps réel (fenêtres courtes) → tables brutes. 4 counts via FILTER (un scan),
  // + activePages (top 20 sur 15min) + recentVisitors (50 derniers sur 1h).
  const [windowCounts, activePagesRes, recentVisitorsRes] = await Promise.all([
    pool.query(
      `SELECT
         count(*) FILTER (WHERE viewed_at >= $1)::int AS u5,
         count(*) FILTER (WHERE viewed_at >= $2)::int AS u15,
         count(*) FILTER (WHERE viewed_at >= $3)::int AS u1h,
         count(*) FILTER (WHERE viewed_at >= $4)::int AS u24
       FROM embed_views WHERE viewed_at >= $4`,
      [fiveMinAgo, fifteenMinAgo, oneHourAgo, twentyFourHoursAgo]
    ),
    pool.query(
      `SELECT ww_id,
              count(*)::int AS count,
              (array_agg(media_type ORDER BY viewed_at DESC))[1] AS media_type,
              (array_agg(tmdb_id    ORDER BY viewed_at DESC))[1] AS tmdb_id
       FROM embed_views WHERE viewed_at >= $1
       GROUP BY ww_id ORDER BY count DESC LIMIT 20`,
      [fifteenMinAgo]
    ),
    pool.query(
      `SELECT ip_hash, viewed_at, ww_id, media_type, tmdb_id
       FROM embed_views WHERE viewed_at >= $1
       ORDER BY viewed_at DESC LIMIT 50`,
      [oneHourAgo]
    ),
  ])

  const wc = windowCounts.rows[0] || {}
  const online5min = wc.u5 || 0
  const online15min = wc.u15 || 0
  const online1hour = wc.u1h || 0
  const online24h = wc.u24 || 0
  const activePagesRaw = activePagesRes.rows
  const recentVisitorsRaw = recentVisitorsRes.rows

  // Collect IDs that need TMDB/channel/digital enrichment
  const channelIds = new Set<string>()
  const digitalIds = new Set<string>()
  const collectDigitalIds = (ww: string | undefined | null) => {
    if (ww && /^ww-(ebook|music|soft|game)-/.test(ww)) digitalIds.add(ww)
  }

  for (const p of activePagesRaw as any[]) {
    if (p.ww_id?.startsWith?.("ww-live-")) channelIds.add(p.ww_id.slice("ww-live-".length))
    collectDigitalIds(p.ww_id)
  }
  for (const v of recentVisitorsRaw as any[]) {
    if (v.ww_id?.startsWith?.("ww-live-")) channelIds.add(v.ww_id.slice("ww-live-".length))
    collectDigitalIds(v.ww_id)
  }

  // Resolve live TV channels.
  // live_tv_channels n'a pas de legacy_uuid (migration → id). Le cid extrait
  // du ww_id (ww-live-<cid>) est soit un uuid (= id), soit un ObjectId 24-hex.
  const oidToUuid = (oidHex: string): string => {
    const h = oidHex.padEnd(32, "0")
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
  }
  const channelMap = new Map<string, any>()
  if (channelIds.size > 0) {
    const rawIds = Array.from(channelIds)
    const uuids: string[] = []
    for (const cid of rawIds) {
      if (/^[0-9a-f-]{36}$/i.test(cid)) uuids.push(cid.toLowerCase())
      else if (/^[a-f0-9]{24}$/i.test(cid)) uuids.push(oidToUuid(cid.toLowerCase()))
    }
    if (uuids.length) {
      const r = await pool.query(
        `SELECT id, channel_name, channel_logo
         FROM live_tv_channels WHERE id = ANY($1::uuid[])`,
        [uuids]
      )
      for (const c of r.rows as any[]) {
        const entry = { title: c.channel_name, poster: c.channel_logo }
        if (c.id) channelMap.set(String(c.id), entry)
      }
      for (const cid of rawIds) {
        const derived = /^[a-f0-9]{24}$/i.test(cid) ? oidToUuid(cid.toLowerCase()) : cid.toLowerCase()
        const e = channelMap.get(derived)
        if (e) channelMap.set(cid, e)
      }
    }
  }

  // Resolve digital content (par ww_id).
  const digitalMap = new Map<string, any>()
  if (digitalIds.size > 0) {
    const r = await pool.query(
      `SELECT ww_id, title, cover_url, content_type
       FROM digital_content WHERE ww_id = ANY($1::text[])`,
      [Array.from(digitalIds)]
    )
    for (const d of r.rows as any[])
      digitalMap.set(d.ww_id, {
        title: d.title,
        poster: d.cover_url,
        content_type: d.content_type,
      })
  }

  // Enrich active pages
  const activePages = await Promise.all(
    (activePagesRaw as any[]).map(async (p) => {
      const wwId = p.ww_id
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
