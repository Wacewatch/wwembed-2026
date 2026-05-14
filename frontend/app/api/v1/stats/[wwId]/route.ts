import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"
import { getDb } from "@/lib/mongo/db"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS })
}

/**
 * Day bucket expression that handles BOTH ISO-string and Date BSON values
 * for `viewed_at`. Legacy migrated rows from Supabase were Date objects;
 * new rows inserted via the shim are ISO strings. The previous JS-side
 * `(v.viewed_at||"").slice(0,10)` silently failed on Date objects, which
 * is why the 30-day chart appeared flat (only "today" had any non-zero
 * bucket) — every Date row's slice produced `"Thu May 14"` and never
 * matched a `"2026-05-14"` key.
 */
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

export async function GET(_req: NextRequest, ctx: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await ctx.params
  if (!wwId) return NextResponse.json({ error: "Missing wwId" }, { status: 400, headers: CORS })

  const supabase = createAdminClient()

  // Lookup any matching record (streaming/download/live/digital) for the title
  const [{ data: streaming }, { data: download }, { data: digital }] = await Promise.all([
    supabase.from("streaming_links").select("*").eq("ww_id", wwId).maybeSingle(),
    supabase.from("download_links").select("*").eq("ww_id", wwId).maybeSingle(),
    supabase.from("digital_content").select("*").eq("ww_id", wwId).maybeSingle(),
  ])

  const liveMatch = wwId.startsWith("ww-live-") ? wwId.slice("ww-live-".length) : null
  let liveChannel: any = null
  if (liveMatch) {
    const { data } = await supabase.from("live_tv_channels").select("*").eq("id", liveMatch).maybeSingle()
    liveChannel = data
  }

  const target =
    (streaming as any) || (download as any) || (digital as any) || (liveChannel as any) || null

  let title: string =
    target?.title || target?.channel_name || (digital as any)?.title || ""
  let poster: string | null =
    target?.poster_url || target?.cover_url || target?.channel_logo || null
  let type: string = streaming
    ? "streaming"
    : download
      ? "download"
      : digital
        ? `digital:${(digital as any).content_type}`
        : liveChannel
          ? "live"
          : "unknown"

  if (!title || !poster) {
    const m = wwId.match(/^ww-(movie|tv)-(\d+)$/)
    if (m) {
      const mediaType = m[1]
      const tmdbId = parseInt(m[2], 10)
      try {
        const tm = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)
        if (tm) {
          title = title || (tm as any).title || (tm as any).name || ""
          poster = poster || ((tm as any).poster_path ? getPosterUrl((tm as any).poster_path, "w342") : null)
          if (type === "unknown") type = mediaType
        }
      } catch {
        // Ignore TMDB lookup errors
      }
    }
  }

  if (!title) title = `Contenu ${wwId}`

  // Date range = last 30 days (UTC).
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const db = await getDb()

  // Everything below runs as native Mongo aggregations so the day bucket is
  // computed server-side, correctly handling both ISO-string and Date BSON
  // values for `viewed_at` / `clicked_at`.
  const aggOpts = { allowDiskUse: true, maxTimeMS: 15000 }

  const [
    viewsByDayAgg,
    refererAgg,
    countryAgg,
    totalViews,
    totalClicks,
    todayCount,
    last7Count,
    last30Count,
    clicks30Count,
  ] = await Promise.all([
    db
      .collection("embed_views")
      .aggregate(
        [
          { $match: { ww_id: wwId, viewed_at: { $gte: since } } },
          { $group: { _id: dayBucket("$viewed_at"), n: { $sum: 1 } } },
        ],
        aggOpts
      )
      .toArray(),
    db
      .collection("embed_views")
      .aggregate(
        [
          { $match: { ww_id: wwId, viewed_at: { $gte: since } } },
          { $group: { _id: { $ifNull: ["$referrer", null] }, n: { $sum: 1 } } },
          { $sort: { n: -1 } },
        ],
        aggOpts
      )
      .toArray(),
    db
      .collection("embed_views")
      .aggregate(
        [
          { $match: { ww_id: wwId, viewed_at: { $gte: since } } },
          { $group: { _id: { $ifNull: ["$country", "??"] }, n: { $sum: 1 } } },
          { $sort: { n: -1 } },
        ],
        aggOpts
      )
      .toArray(),
    db.collection("embed_views").countDocuments({ ww_id: wwId }),
    db.collection("link_clicks").countDocuments({ ww_id: wwId }),
    db.collection("embed_views").countDocuments({
      ww_id: wwId,
      viewed_at: { $gte: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString() },
    }),
    db.collection("embed_views").countDocuments({
      ww_id: wwId,
      viewed_at: { $gte: new Date(Date.now() - 7 * 86400000).toISOString() },
    }),
    db.collection("embed_views").countDocuments({ ww_id: wwId, viewed_at: { $gte: since } }),
    db.collection("link_clicks").countDocuments({ ww_id: wwId, clicked_at: { $gte: since } }),
  ])

  // Build a dense 30-day series so the chart never has gaps.
  const series: { date: string; count: number }[] = []
  const map = new Map<string, number>()
  for (const row of viewsByDayAgg as any[]) {
    if (row._id) map.set(row._id, row.n)
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]
    series.push({ date: d, count: map.get(d) || 0 })
  }

  // Normalise referer to bare hostname so the panel doesn't show 5 lines for
  // the same site (different paths/protocols/www/trailing dots).
  const normaliseHost = (raw: any): string => {
    if (!raw) return "direct"
    let host: string
    try {
      host = new URL(String(raw)).hostname
    } catch {
      host = String(raw)
        .replace(/^[a-z][a-z0-9+.\-]*:\/\//i, "")
        .split(/[\/\?#]/)[0]
    }
    host = host.toLowerCase().replace(/:(80|443)$/, "").replace(/\.+$/, "").replace(/^www\./, "")
    return host || "direct"
  }
  const refererMerge = new Map<string, number>()
  for (const r of refererAgg as any[]) {
    const host = normaliseHost(r._id)
    refererMerge.set(host, (refererMerge.get(host) || 0) + r.n)
  }
  const referers = Array.from(refererMerge.entries())
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count)

  const countries = (countryAgg as any[])
    .map((r) => ({ country: r._id || "??", count: r.n }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json(
    {
      ww_id: wwId,
      type,
      title,
      poster,
      totals: {
        views_all_time: totalViews || 0,
        clicks_all_time: totalClicks || 0,
        views_today: todayCount,
        views_7d: last7Count,
        views_30d: last30Count,
        clicks_30d: clicks30Count,
      },
      series_30d: series,
      top_countries: countries,
      top_referers: referers,
      generated_at: new Date().toISOString(),
    },
    { headers: CORS }
  )
}
