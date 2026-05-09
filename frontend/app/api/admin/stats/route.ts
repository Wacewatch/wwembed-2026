/**
 * Single fast endpoint that returns everything the Admin > Stats tab needs.
 * Uses MongoDB aggregation pipelines instead of paginated client fetches.
 * Typical response time: ~100-300ms vs 5-15s previously.
 */
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"
import { requireAdmin } from "@/lib/mongo/auth"

const TMDB_KEY = process.env.TMDB_API_KEY || ""
const TMDB_IMG = "https://image.tmdb.org/t/p/w92"

// In-memory TMDB cache (per server instance)
const tmdbCache = new Map<string, { title: string; poster: string | null; t: number }>()
const TMDB_TTL = 6 * 60 * 60 * 1000 // 6h

async function fetchTmdb(type: string, id: number) {
  const key = `${type}/${id}`
  const cached = tmdbCache.get(key)
  if (cached && Date.now() - cached.t < TMDB_TTL) return cached
  if (type !== "movie" && type !== "tv") {
    const v = { title: `#${id}`, poster: null, t: Date.now() }
    tmdbCache.set(key, v)
    return v
  }
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=fr-FR`, {
      next: { revalidate: 21600 },
    })
    if (!r.ok) throw new Error("tmdb")
    const j: any = await r.json()
    const v = {
      title: j.title || j.name || `#${id}`,
      poster: j.poster_path ? `${TMDB_IMG}${j.poster_path}` : null,
      t: Date.now(),
    }
    tmdbCache.set(key, v)
    return v
  } catch {
    const v = { title: `#${id}`, poster: null, t: Date.now() }
    tmdbCache.set(key, v)
    return v
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const period = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("period") || "7", 10)))
  const now = new Date()
  const startDate = new Date(now.getTime() - period * 86400000).toISOString()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString()
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60000).toISOString()
  const oneHourAgo = new Date(now.getTime() - 3600000).toISOString()
  const twentyFourHoursAgo = new Date(now.getTime() - 86400000).toISOString()

  const db = await getDb()

  // Run main aggregations in parallel
  const [
    viewsByDay,
    totalViews,
    totalStreamingViews,
    totalLinkClicks,
    totalAdClicks,
    uniqueIpsAgg,
    viewsByType,
    topMediaRaw,
    topDownloadRaw,
    topRefererRaw,
    online5,
    online15,
    online1h,
    online24h,
    activePagesRaw,
    recentVisitorsRaw,
    externalClicksRaw,
    externalByDayRaw,
    externalProvidersRaw,
    externalHostsRaw,
    externalQualityRaw,
    externalMediaTypeRaw,
    externalTopRaw,
    totalExternalClicks,
  ] = await Promise.all([
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: startDate } } },
        {
          $group: {
            _id: { $substrCP: ["$viewed_at", 0, 10] },
            total: { $sum: 1 },
            streaming: {
              $sum: {
                $cond: [{ $or: [{ $eq: ["$embed_type", "streaming"] }] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray(),
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: startDate } }),
    db
      .collection("embed_views")
      .countDocuments({ viewed_at: { $gte: startDate }, embed_type: "streaming" }),
    db.collection("link_clicks").countDocuments({ clicked_at: { $gte: startDate } }),
    db.collection("ad_clicks").countDocuments({ clicked_at: { $gte: startDate } }),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: startDate }, ip_hash: { $ne: null } } },
        { $group: { _id: "$ip_hash" } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: startDate } } },
        { $group: { _id: "$media_type", count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: startDate } } },
        {
          $group: {
            _id: {
              ww_id: "$ww_id",
              media_type: "$media_type",
              tmdb_id: "$tmdb_id",
            },
            views: { $sum: 1 },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 50 },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate } } },
        {
          $group: {
            _id: {
              ww_id: "$ww_id",
              media_type: "$media_type",
              tmdb_id: "$tmdb_id",
            },
            downloads: { $sum: 1 },
          },
        },
        { $sort: { downloads: -1 } },
        { $limit: 50 },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: startDate } } },
        { $group: { _id: { $ifNull: ["$referrer", "Direct"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: fiveMinAgo }, ip_hash: { $ne: null } } },
        { $group: { _id: "$ip_hash" } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: fifteenMinAgo }, ip_hash: { $ne: null } } },
        { $group: { _id: "$ip_hash" } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: oneHourAgo }, ip_hash: { $ne: null } } },
        { $group: { _id: "$ip_hash" } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: twentyFourHoursAgo }, ip_hash: { $ne: null } } },
        { $group: { _id: "$ip_hash" } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
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
        { $limit: 10 },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .find({ viewed_at: { $gte: oneHourAgo } })
      .sort({ viewed_at: -1 })
      .limit(40)
      .toArray(),
    // External clicks (is_external=true)
    db
      .collection("link_clicks")
      .countDocuments({ clicked_at: { $gte: startDate }, is_external: true }),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, is_external: true } },
        { $group: { _id: { $substrCP: ["$clicked_at", 0, 10] }, count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, is_external: true } },
        { $group: { _id: { $ifNull: ["$provider", "Inconnu"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, is_external: true } },
        { $group: { _id: { $ifNull: ["$host_name", "?"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, is_external: true } },
        { $group: { _id: { $ifNull: ["$quality", "N/A"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, is_external: true } },
        { $group: { _id: { $ifNull: ["$media_type", "?"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, is_external: true } },
        {
          $group: {
            _id: { ww_id: "$ww_id", media_type: "$media_type", tmdb_id: "$tmdb_id" },
            clicks: { $sum: 1 },
          },
        },
        { $sort: { clicks: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
    db.collection("link_clicks").countDocuments({ is_external: true }),
  ])

  // Build day buckets
  const byDayMap = new Map<string, { total: number; streaming: number; download: number }>()
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().split("T")[0]
    byDayMap.set(d, { total: 0, streaming: 0, download: 0 })
  }
  for (const row of viewsByDay as any[]) {
    if (byDayMap.has(row._id)) {
      byDayMap.get(row._id)!.total = row.total
      byDayMap.get(row._id)!.streaming = row.streaming
    }
  }
  // Add downloads per day
  const linkClicksDay = await db
    .collection("link_clicks")
    .aggregate([
      { $match: { clicked_at: { $gte: startDate } } },
      { $group: { _id: { $substrCP: ["$clicked_at", 0, 10] }, count: { $sum: 1 } } },
    ])
    .toArray()
  for (const row of linkClicksDay as any[]) {
    if (byDayMap.has(row._id)) byDayMap.get(row._id)!.download = row.count
  }

  const viewsByDayFinal = Array.from(byDayMap.entries()).map(([date, v]) => ({
    date,
    count: v.total,
    streamingCount: v.streaming,
    downloadCount: v.download,
    formattedDate: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
  }))

  // Enrich top media (parallel TMDB + Live TV lookups)
  const channelIds = new Set<string>()
  for (const m of topMediaRaw as any[]) {
    if (m._id?.ww_id?.startsWith("ww-live-")) channelIds.add(m._id.ww_id.slice("ww-live-".length))
  }
  for (const m of topDownloadRaw as any[]) {
    if (m._id?.ww_id?.startsWith("ww-live-")) channelIds.add(m._id.ww_id.slice("ww-live-".length))
  }
  for (const m of activePagesRaw as any[]) {
    if (m._id?.startsWith?.("ww-live-")) channelIds.add(m._id.slice("ww-live-".length))
  }
  for (const v of recentVisitorsRaw as any[]) {
    if (v.ww_id?.startsWith?.("ww-live-")) channelIds.add(v.ww_id.slice("ww-live-".length))
  }

  const ObjectIdLib = (await import("mongodb")).ObjectId
  const channelMap = new Map<string, any>()
  if (channelIds.size > 0) {
    const ids = Array.from(channelIds).flatMap((cid) => {
      const arr: any[] = [cid]
      if (/^[a-f0-9]{24}$/i.test(cid)) {
        try {
          arr.push(new ObjectIdLib(cid))
        } catch {}
      }
      return arr
    })
    const channels = await db
      .collection("live_tv_channels")
      .find({ $or: [{ _id: { $in: ids } }, { id: { $in: ids } }] })
      .project({ channel_name: 1, channel_logo: 1 })
      .toArray()
    for (const c of channels)
      channelMap.set(c._id?.toString(), { title: c.channel_name, poster: c.channel_logo })
  }

  // Digital lookups
  const digitalIds = new Set<string>()
  for (const m of topDownloadRaw as any[]) {
    if (m._id?.ww_id && /^ww-(ebook|music|software|game)-/.test(m._id.ww_id)) {
      digitalIds.add(m._id.ww_id)
    }
  }
  const digitalMap = new Map<string, any>()
  if (digitalIds.size > 0) {
    const digitals = await db
      .collection("digital_content")
      .find({ ww_id: { $in: Array.from(digitalIds) } })
      .project({ ww_id: 1, title: 1, cover_url: 1 })
      .toArray()
    for (const d of digitals) digitalMap.set(d.ww_id, { title: d.title, poster: d.cover_url })
  }

  const enrich = async (item: any, kind: "view" | "download") => {
    const wwId: string = item._id?.ww_id
    const mediaType: string = item._id?.media_type
    const tmdbId: number | null = item._id?.tmdb_id
    let title = wwId || "?"
    let poster: string | null = null

    if (wwId?.startsWith?.("ww-live-")) {
      const cid = wwId.slice("ww-live-".length)
      const ch = channelMap.get(cid) || channelMap.get(cid)
      title = ch?.title || "Chaîne TV"
      poster = ch?.poster || null
    } else if (wwId && /^ww-(ebook|music|software|game)-/.test(wwId)) {
      const dg = digitalMap.get(wwId)
      title = dg?.title || "Contenu Digital"
      poster = dg?.poster || null
    } else if (tmdbId && (mediaType === "movie" || mediaType === "tv")) {
      const tm = await fetchTmdb(mediaType, tmdbId)
      title = tm.title
      poster = tm.poster
    }

    return {
      tmdb_id: tmdbId,
      media_type: wwId?.startsWith?.("ww-live-")
        ? "live"
        : wwId && /^ww-(ebook|music|software|game)-/.test(wwId)
          ? "digital"
          : mediaType,
      ww_id: wwId,
      title,
      poster,
      ...(kind === "view" ? { views: item.views } : { downloads: item.downloads }),
    }
  }

  const topMedia = await Promise.all((topMediaRaw as any[]).slice(0, 30).map((m) => enrich(m, "view")))
  const topMediaDownload = await Promise.all(
    (topDownloadRaw as any[]).slice(0, 30).map((m) => enrich(m, "download"))
  )

  // Active pages enrichment (similar but flatter)
  const activePages = await Promise.all(
    (activePagesRaw as any[]).map(async (p) => {
      const wwId = p._id
      let title = wwId
      let poster: string | null = null
      if (wwId?.startsWith?.("ww-live-")) {
        const ch = channelMap.get(wwId.slice("ww-live-".length))
        title = ch?.title || wwId
        poster = ch?.poster || null
      } else if (p.tmdb_id && (p.media_type === "movie" || p.media_type === "tv")) {
        const tm = await fetchTmdb(p.media_type, p.tmdb_id)
        title = tm.title
        poster = tm.poster
      }
      return { ww_id: wwId, count: p.count, media_type: p.media_type, title, poster }
    })
  )

  const recentVisitorsSeen = new Set<string>()
  const recentVisitors = await Promise.all(
    (recentVisitorsRaw as any[])
      .filter((v) => {
        const k = v.ww_id || v.viewed_at
        if (recentVisitorsSeen.has(k)) return false
        recentVisitorsSeen.add(k)
        return true
      })
      .slice(0, 12)
      .map(async (v) => {
        let title = v.ww_id || "N/A"
        let poster: string | null = null
        if (v.ww_id?.startsWith?.("ww-live-")) {
          const ch = channelMap.get(v.ww_id.slice("ww-live-".length))
          title = ch?.title || v.ww_id
          poster = ch?.poster || null
        } else if (v.tmdb_id && (v.media_type === "movie" || v.media_type === "tv")) {
          const tm = await fetchTmdb(v.media_type, v.tmdb_id)
          title = tm.title
          poster = tm.poster
        }
        return {
          ip_hash: v.ip_hash ? v.ip_hash.substring(0, 8) + "…" : "Anonyme",
          viewed_at: v.viewed_at,
          ww_id: v.ww_id || "N/A",
          media_type: v.media_type || "?",
          title,
          poster,
        }
      })
  )

  // Format top referers
  const topReferers = (topRefererRaw as any[]).map((r) => {
    let host = "Direct"
    if (r._id && r._id !== "Direct") {
      try {
        host = new URL(r._id).origin
      } catch {
        host = r._id
      }
    }
    return { referrer: host, count: r.count }
  })

  // External top media enrichment (lightweight)
  const externalTop = await Promise.all(
    (externalTopRaw as any[]).map((m) => enrich({ _id: m._id, downloads: m.clicks }, "download"))
  )

  // External by-day fill
  const externalByDayMap = new Map<string, number>()
  for (let i = period - 1; i >= 0; i--) {
    externalByDayMap.set(new Date(now.getTime() - i * 86400000).toISOString().split("T")[0], 0)
  }
  for (const row of externalByDayRaw as any[]) {
    if (externalByDayMap.has(row._id)) externalByDayMap.set(row._id, row.count)
  }

  return NextResponse.json({
    period,
    generated_at: new Date().toISOString(),
    detailed: {
      totalViews,
      totalStreamingViews,
      totalClicks: totalLinkClicks,
      totalAdClicks,
      uniqueVisitors: (uniqueIpsAgg as any[])[0]?.n || 0,
      avgViewsPerDay: period > 0 ? totalViews / period : 0,
      viewsByType: [
        { type: "Films", count: (viewsByType as any[]).find((x) => x._id === "movie")?.count || 0 },
        { type: "Séries", count: (viewsByType as any[]).find((x) => x._id === "tv")?.count || 0 },
        {
          type: "TV Live",
          count:
            (viewsByType as any[]).find((x) => x._id === "live")?.count ||
            0 + ((viewsByType as any[]).find((x) => x._id === "live_tv")?.count || 0),
        },
        { type: "Streaming", count: totalStreamingViews },
      ],
    },
    viewsByDay: viewsByDayFinal,
    topMedia,
    topMediaDownload,
    topReferers,
    online: {
      online5min: (online5 as any[])[0]?.n || 0,
      online15min: (online15 as any[])[0]?.n || 0,
      online1hour: (online1h as any[])[0]?.n || 0,
      online24h: (online24h as any[])[0]?.n || 0,
      activePages,
      recentVisitors,
    },
    external: {
      totalClicks: externalClicksRaw,
      totalClicksAllTime: totalExternalClicks,
      byDay: Array.from(externalByDayMap.entries()).map(([date, count]) => ({ date, count })),
      byProvider: (externalProvidersRaw as any[]).map((r) => ({ provider: r._id, count: r.count })),
      byHost: (externalHostsRaw as any[]).map((r) => ({ host: r._id, count: r.count })),
      byQuality: (externalQualityRaw as any[]).map((r) => ({ quality: r._id, count: r.count })),
      byMediaType: (externalMediaTypeRaw as any[]).map((r) => ({ type: r._id, count: r.count })),
      topMedia: externalTop,
    },
  })
}
