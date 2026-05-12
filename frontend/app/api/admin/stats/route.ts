/**
 * Single fast endpoint that returns everything the Admin > Stats tab needs.
 * Uses MongoDB aggregation pipelines instead of paginated client fetches.
 * Typical response time: ~100-300ms vs 5-15s previously.
 *
 * NOTE: per user request, NO arbitrary limits are applied anywhere in this
 * endpoint. Group-by aggregations are naturally bounded by the cardinality
 * of the grouping key (ww_id, host, etc.). For raw-document fetches we use
 * a time window filter (no $limit).
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

  try {
    return await buildStatsResponse(req)
  } catch (err: any) {
    console.error("[admin/stats] failed:", err?.stack || err)
    return NextResponse.json(
      { error: "Internal error", message: err?.message || String(err) },
      { status: 500 }
    )
  }
}

async function buildStatsResponse(req: NextRequest) {

  const period = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("period") || "7", 10)))
  const now = new Date()
  const startDate = new Date(now.getTime() - period * 86400000).toISOString()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString()
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60000).toISOString()
  const oneHourAgo = new Date(now.getTime() - 3600000).toISOString()
  const twentyFourHoursAgo = new Date(now.getTime() - 86400000).toISOString()

  // Type-safe day bucket: handles both String (ISO) and Date BSON types.
  // Migrated data from Supabase keeps ISO strings, but new inserts via some
  // code paths might store native Date objects — $substrCP would crash on
  // those, causing the whole admin/stats endpoint to 500.
  const dayBucket = (field: string) => ({
    $cond: [
      { $eq: [{ $type: field }, "string"] },
      { $substrCP: [field, 0, 10] },
      {
        $cond: [
          { $eq: [{ $type: field }, "date"] },
          { $dateToString: { date: field, format: "%Y-%m-%d" } },
          null,
        ],
      },
    ],
  })

  const db = await getDb()

  // Run main aggregations in parallel — NO $limit anywhere.
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
    // ------- Internal downloads (clicks on user-submitted internal links) -------
    internalClicksRaw,
    internalByDayRaw,
    internalTopLinksRaw,
    internalTopUploadersRaw,
    internalByQualityRaw,
    internalByMediaTypeRaw,
    internalByLinkTypeRaw,
    totalInternalClicksAllTime,
  ] = await Promise.all([
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: startDate } } },
        {
          $group: {
            _id: dayBucket("$viewed_at"),
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
        { $match: { viewed_at: { $gte: startDate } } },
        { $group: { _id: { $ifNull: ["$ip_hash", "$user_agent"] } } },
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
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: startDate } } },
        { $group: { _id: { $ifNull: ["$referrer", "Direct"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: fiveMinAgo } } },
        { $group: { _id: { $ifNull: ["$ip_hash", "$user_agent"] } } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: fifteenMinAgo } } },
        { $group: { _id: { $ifNull: ["$ip_hash", "$user_agent"] } } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: oneHourAgo } } },
        { $group: { _id: { $ifNull: ["$ip_hash", "$user_agent"] } } },
        { $count: "n" },
      ])
      .toArray(),
    db
      .collection("embed_views")
      .aggregate([
        { $match: { viewed_at: { $gte: twentyFourHoursAgo } } },
        { $group: { _id: { $ifNull: ["$ip_hash", "$user_agent"] } } },
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
      ])
      .toArray(),
    db
      .collection("embed_views")
      .find({ viewed_at: { $gte: oneHourAgo } })
      .sort({ viewed_at: -1 })
      .toArray(),
    // External clicks — count ALL link_clicks (every click on a download/streaming
    // external link counts; the Supabase `is_external` flag was inconsistent
    // historically so we treat any link_click as a 3rd-party exit click).
    db
      .collection("link_clicks")
      .countDocuments({ clicked_at: { $gte: startDate } }),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate } } },
        { $group: { _id: dayBucket("$clicked_at"), count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate } } },
        { $group: { _id: { $ifNull: ["$provider", "Inconnu"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate } } },
        { $group: { _id: { $ifNull: ["$host_name", "?"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate } } },
        { $group: { _id: { $ifNull: ["$quality", "N/A"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate } } },
        { $group: { _id: { $ifNull: ["$media_type", "?"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate } } },
        {
          $group: {
            _id: { ww_id: "$ww_id", media_type: "$media_type", tmdb_id: "$tmdb_id" },
            clicks: { $sum: 1 },
          },
        },
        { $sort: { clicks: -1 } },
      ])
      .toArray(),
    db.collection("link_clicks").countDocuments({}),
    // -------- Internal-download stats --------
    // Per request: "Internal" = clicks on links uploaded to this site (link_id
    // present and matching a download_links / digital_download_links row).
    // Group by link_id so we can show the most-clicked SPECIFIC link, then
    // join in a second pass to get title, source, quality, uploader.
    db
      .collection("link_clicks")
      .countDocuments({ clicked_at: { $gte: startDate }, link_id: { $ne: null } }),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, link_id: { $ne: null } } },
        { $group: { _id: dayBucket("$clicked_at"), count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, link_id: { $ne: null } } },
        { $group: { _id: "$link_id", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
      ])
      .toArray(),
    // Top uploaders — done via $lookup so a single aggregation gives us the
    // total clicks per submitted_by across both download_links and
    // digital_download_links.
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, link_id: { $ne: null } } },
        { $group: { _id: "$link_id", clicks: { $sum: 1 } } },
        {
          $lookup: {
            from: "download_links",
            let: { lid: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$legacy_uuid", "$$lid"] } } },
              { $project: { submitted_by: 1, _id: 0 } },
            ],
            as: "dl",
          },
        },
        {
          $lookup: {
            from: "digital_download_links",
            let: { lid: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$legacy_uuid", "$$lid"] } } },
              { $project: { submitted_by: 1, _id: 0 } },
            ],
            as: "ddl",
          },
        },
        {
          $project: {
            clicks: 1,
            uploader: {
              $ifNull: [
                { $arrayElemAt: ["$dl.submitted_by", 0] },
                { $arrayElemAt: ["$ddl.submitted_by", 0] },
              ],
            },
          },
        },
        { $match: { uploader: { $ne: null } } },
        { $group: { _id: "$uploader", clicks: { $sum: "$clicks" }, linkCount: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, link_id: { $ne: null } } },
        { $group: { _id: { $ifNull: ["$quality", "N/A"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, link_id: { $ne: null } } },
        { $group: { _id: { $ifNull: ["$media_type", "?"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate([
        { $match: { clicked_at: { $gte: startDate }, link_id: { $ne: null } } },
        { $group: { _id: { $ifNull: ["$link_type", "direct"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db.collection("link_clicks").countDocuments({ link_id: { $ne: null } }),
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
      { $group: { _id: dayBucket("$clicked_at"), count: { $sum: 1 } } },
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
  const uuidToObjectIdHex = (uuid: string): string => uuid.replace(/-/g, "").slice(0, 24).padEnd(24, "0")

  const channelMap = new Map<string, any>()
  if (channelIds.size > 0) {
    const stringIds: any[] = []
    const objectIds: any[] = []
    const legacyUuids: string[] = []
    for (const cid of channelIds) {
      stringIds.push(cid)
      if (/^[a-f0-9]{24}$/i.test(cid)) {
        try { objectIds.push(new ObjectIdLib(cid)) } catch {}
      }
      if (/^[0-9a-f-]{36}$/i.test(cid)) {
        try { objectIds.push(new ObjectIdLib(uuidToObjectIdHex(cid))) } catch {}
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

  // Digital lookups
  const digitalIds = new Set<string>()
  const collectDigitalIds = (ww: string | undefined | null) => {
    if (ww && /^ww-(ebook|music|soft|game)-/.test(ww)) digitalIds.add(ww)
  }
  for (const m of topMediaRaw as any[]) collectDigitalIds(m._id?.ww_id)
  for (const m of topDownloadRaw as any[]) collectDigitalIds(m._id?.ww_id)
  for (const p of activePagesRaw as any[]) collectDigitalIds(p._id)
  for (const v of recentVisitorsRaw as any[]) collectDigitalIds(v.ww_id)
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
    } else if (wwId && /^ww-(ebook|music|soft|game)-/.test(wwId)) {
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
        : wwId && /^ww-(ebook|music|soft|game)-/.test(wwId)
          ? "digital"
          : mediaType,
      ww_id: wwId,
      title,
      poster,
      ...(kind === "view" ? { views: item.views } : { downloads: item.downloads }),
    }
  }

  const topMedia = await Promise.all((topMediaRaw as any[]).map((m) => enrich(m, "view")))
  const topMediaDownload = await Promise.all(
    (topDownloadRaw as any[]).map((m) => enrich(m, "download"))
  )

  // Active pages enrichment
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

  // External top media enrichment
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

  // -------- Internal-download enrichment: resolve link_id → link details --------
  const internalLinkIds = (internalTopLinksRaw as any[]).map((r) => r._id).filter(Boolean)
  const internalLinks: any[] = []
  if (internalLinkIds.length > 0) {
    const [dlRows, ddlRows] = await Promise.all([
      db
        .collection("download_links")
        .find({ legacy_uuid: { $in: internalLinkIds } })
        .project({
          legacy_uuid: 1,
          ww_id: 1,
          source_name: 1,
          quality: 1,
          language: 1,
          file_size: 1,
          link_type: 1,
          media_type: 1,
          tmdb_id: 1,
          season_number: 1,
          episode_number: 1,
          submitted_by: 1,
          status: 1,
        })
        .toArray(),
      db
        .collection("digital_download_links")
        .find({ legacy_uuid: { $in: internalLinkIds } })
        .project({
          legacy_uuid: 1,
          ww_id: 1,
          source_name: 1,
          quality: 1,
          file_format: 1,
          language: 1,
          file_size: 1,
          link_type: 1,
          submitted_by: 1,
          status: 1,
          content_id: 1,
        })
        .toArray(),
    ])
    const linkMap = new Map<string, any>()
    for (const r of dlRows) {
      linkMap.set(r.legacy_uuid, { ...r, _kind: "download" })
    }
    for (const r of ddlRows) {
      if (!linkMap.has(r.legacy_uuid)) {
        linkMap.set(r.legacy_uuid, { ...r, _kind: "digital" })
      }
    }
    for (const r of internalTopLinksRaw as any[]) {
      const meta = linkMap.get(r._id)
      if (meta) internalLinks.push({ ...meta, link_id: r._id, clicks: r.clicks })
    }
  }

  // Resolve media titles for internal top links (TMDB + digital_content)
  const internalDigitalIds = new Set<string>()
  for (const l of internalLinks) {
    if (l.ww_id && /^ww-(ebook|music|soft|game)-/.test(l.ww_id)) internalDigitalIds.add(l.ww_id)
  }
  const internalDigitalMap = new Map<string, any>()
  if (internalDigitalIds.size > 0) {
    const digs = await db
      .collection("digital_content")
      .find({ ww_id: { $in: Array.from(internalDigitalIds) } })
      .project({ ww_id: 1, title: 1, cover_url: 1 })
      .toArray()
    for (const d of digs) internalDigitalMap.set(d.ww_id, { title: d.title, poster: d.cover_url })
  }

  const internalTopLinks = await Promise.all(
    internalLinks.map(async (l) => {
      let title = l.source_name || l.ww_id || "?"
      let poster: string | null = null
      if (l._kind === "digital") {
        const dg = l.ww_id ? internalDigitalMap.get(l.ww_id) : null
        title = dg?.title || title
        poster = dg?.poster || null
      } else if (l.tmdb_id && (l.media_type === "movie" || l.media_type === "tv")) {
        const tm = await fetchTmdb(l.media_type, l.tmdb_id)
        title = tm.title
        poster = tm.poster
      }
      return {
        link_id: l.link_id,
        ww_id: l.ww_id,
        kind: l._kind,
        title,
        poster,
        source_name: l.source_name,
        quality: l.quality || l.file_format || null,
        language: l.language,
        file_size: l.file_size,
        link_type: l.link_type,
        media_type: l.media_type || (l._kind === "digital" ? "digital" : null),
        season_number: l.season_number,
        episode_number: l.episode_number,
        submitted_by: l.submitted_by,
        status: l.status,
        clicks: l.clicks,
      }
    })
  )

  // Resolve uploader usernames for top uploaders
  const uploaderIds = (internalTopUploadersRaw as any[]).map((r) => r._id).filter(Boolean)
  const uploaderMap = new Map<string, { username: string; role: string }>()
  if (uploaderIds.length > 0) {
    // submitted_by stored values can be either ObjectId or original UUID string;
    // try matching via legacy_uuid (UUID) OR derived ObjectId. We also try
    // matching the `profiles` collection (uses same ids).
    const stringIds = uploaderIds.filter((v) => typeof v === "string")
    const oids: any[] = []
    for (const v of stringIds) {
      if (/^[0-9a-f-]{36}$/i.test(v)) {
        try { oids.push(new ObjectIdLib(uuidToObjectIdHex(v))) } catch {}
      } else if (/^[a-f0-9]{24}$/i.test(v)) {
        try { oids.push(new ObjectIdLib(v)) } catch {}
      }
    }
    const allIds: any[] = [...stringIds, ...oids]
    const [users, profiles] = await Promise.all([
      db
        .collection("users")
        .find({ $or: [{ _id: { $in: allIds } }, { legacy_uuid: { $in: stringIds } }] })
        .project({ username: 1, role: 1, legacy_uuid: 1 })
        .toArray(),
      db
        .collection("profiles")
        .find({ $or: [{ _id: { $in: allIds } }, { legacy_uuid: { $in: stringIds } }] })
        .project({ username: 1, role: 1, legacy_uuid: 1 })
        .toArray(),
    ])
    for (const u of users) {
      const lookupKey =
        u.legacy_uuid || (u._id?.toString ? u._id.toString() : String(u._id))
      uploaderMap.set(lookupKey, { username: u.username || "?", role: u.role || "member" })
      if (u.legacy_uuid && u._id) {
        uploaderMap.set(u._id.toString(), { username: u.username || "?", role: u.role || "member" })
      }
    }
    for (const p of profiles) {
      const lookupKey =
        p.legacy_uuid || (p._id?.toString ? p._id.toString() : String(p._id))
      if (!uploaderMap.has(lookupKey))
        uploaderMap.set(lookupKey, { username: p.username || "?", role: p.role || "member" })
    }
  }

  const internalTopUploaders = (internalTopUploadersRaw as any[]).map((r) => {
    const meta = uploaderMap.get(r._id)
    return {
      user_id: r._id,
      username: meta?.username || "Inconnu",
      role: meta?.role || "?",
      clicks: r.clicks,
      linkCount: r.linkCount,
    }
  })

  // Internal by-day fill
  const internalByDayMap = new Map<string, number>()
  for (let i = period - 1; i >= 0; i--) {
    internalByDayMap.set(new Date(now.getTime() - i * 86400000).toISOString().split("T")[0], 0)
  }
  for (const row of internalByDayRaw as any[]) {
    if (internalByDayMap.has(row._id)) internalByDayMap.set(row._id, row.count)
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
    internal: {
      totalClicks: internalClicksRaw,
      totalClicksAllTime: totalInternalClicksAllTime,
      byDay: Array.from(internalByDayMap.entries()).map(([date, count]) => ({ date, count })),
      topLinks: internalTopLinks,
      topUploaders: internalTopUploaders,
      byQuality: (internalByQualityRaw as any[]).map((r) => ({ quality: r._id, count: r.count })),
      byMediaType: (internalByMediaTypeRaw as any[]).map((r) => ({ type: r._id, count: r.count })),
      byLinkType: (internalByLinkTypeRaw as any[]).map((r) => ({ link_type: r._id, count: r.count })),
    },
  })
}
