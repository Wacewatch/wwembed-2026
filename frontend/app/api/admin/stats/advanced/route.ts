/**
 * GET /api/admin/stats/advanced
 *
 * Advanced analytics for the admin dashboard:
 *   • Comparatif: current period vs previous period (delta %) for views,
 *     clicks, ad clicks, unique visitors.
 *   • Heatmap 24×7: total views by (day of week, hour of day) — UTC.
 *   • Geoloc: top countries derived from ip_prefix via ip-api (cached).
 *   • Funnel: impressions → load → source click → external click.
 *   • Bandwidth proxy: top consuming contents (views × file_size when known).
 *
 * Heavy endpoint — admin-only. Cached for 60s in the Response cache header
 * so the admin UI can poll freely.
 */
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"
import { requireAdmin } from "@/lib/mongo/auth"
import { countryForIp } from "@/lib/geo"
import { triggerLinkCheckBackground } from "@/lib/link-checker-runner"
import { fetchTmdbCached } from "@/lib/tmdb-cache"

function dayBucket(field: string) {
  return {
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
  }
}

// Build a heatmap expression: for ISO strings we can pull HH from substring;
// for Date we use $dayOfWeek/$hour.
function hourField(field: string) {
  return {
    $cond: [
      { $eq: [{ $type: field }, "string"] },
      { $toInt: { $substrCP: [field, 11, 2] } },
      { $cond: [{ $eq: [{ $type: field }, "date"] }, { $hour: field }, 0] },
    ],
  }
}
function dowField(field: string) {
  // Returns 1..7, 1 = Sunday in Mongo. We'll re-map client-side.
  return {
    $cond: [
      { $eq: [{ $type: field }, "string"] },
      // $dayOfWeek requires a Date — convert the ISO string first.
      { $dayOfWeek: { $toDate: field } },
      { $cond: [{ $eq: [{ $type: field }, "date"] }, { $dayOfWeek: field }, 1] },
    ],
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Take the opportunity to kick a background link-health scan. This keeps
  // the link_status collection fresh without needing any external cron.
  triggerLinkCheckBackground()

  const period = parseInt(req.nextUrl.searchParams.get("period") || "7", 10) || 7
  const now = Date.now()
  const start = new Date(now - period * 86_400_000).toISOString()
  const prevStart = new Date(now - 2 * period * 86_400_000).toISOString()
  const prevEnd = start

  const db = await getDb()
  const aggOpts = { allowDiskUse: true, maxTimeMS: 20_000 }

  // ───── Comparatif period vs prev period
  const [
    viewsCur,
    viewsPrev,
    clicksCur,
    clicksPrev,
    adClicksCur,
    adClicksPrev,
    uniqueCur,
    uniquePrev,
  ] = await Promise.all([
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: start } }),
    db.collection("embed_views").countDocuments({ viewed_at: { $gte: prevStart, $lt: prevEnd } }),
    db.collection("link_clicks").countDocuments({ clicked_at: { $gte: start } }),
    db.collection("link_clicks").countDocuments({ clicked_at: { $gte: prevStart, $lt: prevEnd } }),
    db.collection("ad_clicks").countDocuments({ clicked_at: { $gte: start } }),
    db.collection("ad_clicks").countDocuments({ clicked_at: { $gte: prevStart, $lt: prevEnd } }),
    db
      .collection("embed_views")
      .aggregate(
        [
          { $match: { viewed_at: { $gte: start } } },
          { $group: { _id: { i: "$ip_hash", u: "$user_agent" } } },
          { $count: "n" },
        ],
        aggOpts
      )
      .toArray(),
    db
      .collection("embed_views")
      .aggregate(
        [
          { $match: { viewed_at: { $gte: prevStart, $lt: prevEnd } } },
          { $group: { _id: { i: "$ip_hash", u: "$user_agent" } } },
          { $count: "n" },
        ],
        aggOpts
      )
      .toArray(),
  ])

  const pctDelta = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0

  const uniqueCurN = (uniqueCur as any[])[0]?.n || 0
  const uniquePrevN = (uniquePrev as any[])[0]?.n || 0

  // ───── Heatmap 7d (force a smaller period for cost)
  const heatmapStart = new Date(now - 7 * 86_400_000).toISOString()
  const heatmapAgg = await db
    .collection("embed_views")
    .aggregate(
      [
        { $match: { viewed_at: { $gte: heatmapStart } } },
        {
          $group: {
            _id: { dow: dowField("$viewed_at"), hour: hourField("$viewed_at") },
            n: { $sum: 1 },
          },
        },
      ],
      aggOpts
    )
    .toArray()
  // Build dense 7×24 grid; index [dow0=Sun..dow6=Sat][hour0..23]
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  for (const row of heatmapAgg as any[]) {
    const dow = (row._id?.dow || 1) - 1 // 1-based → 0-based
    const hr = row._id?.hour ?? 0
    if (dow >= 0 && dow < 7 && hr >= 0 && hr < 24) heatmap[dow][hr] = row.n
  }

  // ───── Top countries via ip_prefix (limited to 200 most active prefixes)
  const topPrefixes = await db
    .collection("embed_views")
    .aggregate(
      [
        { $match: { viewed_at: { $gte: start }, ip_prefix: { $exists: true, $ne: null } } },
        { $group: { _id: "$ip_prefix", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 200 },
      ],
      aggOpts
    )
    .toArray()
  const countryCounts = new Map<string, number>()
  await Promise.all(
    (topPrefixes as any[]).map(async (row) => {
      // Reconstruct a routable IP for geo (use .1 for IPv4 /24)
      const probe = row._id?.includes(":") ? row._id.replace(/::$/, "::1") : row._id?.replace(/\.0$/, ".1")
      if (!probe) return
      const c = await countryForIp(probe)
      if (c) countryCounts.set(c, (countryCounts.get(c) || 0) + row.n)
    })
  )
  const top_countries = Array.from(countryCounts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // ───── Funnel: embed view (impression) → click on source link
  const distinctSessionsCur = uniqueCurN
  const funnel = {
    impressions: viewsCur,
    unique_sessions: distinctSessionsCur,
    source_clicks: clicksCur,
    ad_clicks: adClicksCur,
    view_to_click_pct: viewsCur > 0 ? Math.round((clicksCur / viewsCur) * 10000) / 100 : 0,
    view_to_ad_pct: viewsCur > 0 ? Math.round((adClicksCur / viewsCur) * 10000) / 100 : 0,
  }

  // ───── Bandwidth proxy: top consuming contents over period
  // Sum views per ww_id, then enrich with average file_size from download_links.
  const topByViews = await db
    .collection("embed_views")
    .aggregate(
      [
        { $match: { viewed_at: { $gte: start } } },
        {
          $group: {
            _id: "$ww_id",
            views: { $sum: 1 },
            media_type: { $first: "$media_type" },
            tmdb_id: { $first: "$tmdb_id" },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 25 },
      ],
      aggOpts
    )
    .toArray()
  const sizeByWw = new Map<string, number>()
  if (topByViews.length) {
    const sizeAgg = await db
      .collection("download_links")
      .aggregate([
        { $match: { ww_id: { $in: (topByViews as any[]).map((c) => c._id) } } },
        {
          $group: {
            _id: "$ww_id",
            avg_bytes: { $avg: { $convert: { input: "$file_size_bytes", to: "long", onError: null, onNull: null } } },
          },
        },
      ])
      .toArray()
    for (const row of sizeAgg as any[]) {
      if (row._id && row.avg_bytes) sizeByWw.set(row._id, row.avg_bytes)
    }
  }
  const top_bandwidth = await Promise.all(
    (topByViews as any[]).slice(0, 15).map(async (c) => {
      let title = `${c._id}`
      let poster: string | null = null
      if (c.media_type && c.tmdb_id && (c.media_type === "movie" || c.media_type === "tv")) {
        const tm = await fetchTmdbCached(c.media_type, c.tmdb_id)
        title = tm.title
        poster = tm.poster
      }
      const bytes = sizeByWw.get(c._id) || null
      return {
        ww_id: c._id,
        title,
        poster,
        media_type: c.media_type,
        views: c.views,
        avg_bytes: bytes,
        estimated_bandwidth_bytes: bytes ? Math.round(bytes * c.views) : null,
      }
    })
  )

  return NextResponse.json(
    {
      period_days: period,
      comparative: {
        views: { current: viewsCur, previous: viewsPrev, delta_pct: pctDelta(viewsCur, viewsPrev) },
        clicks: { current: clicksCur, previous: clicksPrev, delta_pct: pctDelta(clicksCur, clicksPrev) },
        ad_clicks: { current: adClicksCur, previous: adClicksPrev, delta_pct: pctDelta(adClicksCur, adClicksPrev) },
        unique: { current: uniqueCurN, previous: uniquePrevN, delta_pct: pctDelta(uniqueCurN, uniquePrevN) },
      },
      heatmap_7d: heatmap,
      top_countries,
      funnel,
      top_bandwidth,
      generated_at: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "private, max-age=60" },
    }
  )
}
