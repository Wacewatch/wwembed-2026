import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"
import { getPool } from "@/lib/pg/db"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS })
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await ctx.params
  if (!wwId) return NextResponse.json({ error: "Missing wwId" }, { status: 400, headers: CORS })

  const supabase = createAdminClient()

  // Lookup any matching record (streaming/download/live/digital) for the title
  const [{ data: streaming }, { data: download }, { data: digital }] = await Promise.all([
    supabase.from("streaming_links").select("*").eq("ww_id", wwId).limit(1).maybeSingle(),
    supabase.from("download_links").select("*").eq("ww_id", wwId).limit(1).maybeSingle(),
    supabase.from("digital_content").select("*").eq("ww_id", wwId).limit(1).maybeSingle(),
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
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString()
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString()
  const pool = getPool()

  // Tout passe en SQL sur les hypertables TimescaleDB. `viewed_at` / `clicked_at`
  // étant des colonnes timestamptz réelles, le bucket jour est trivial
  // (date_trunc) et le bug d'affichage "chart plat" (mix string/Date côté Mongo)
  // disparaît structurellement. referrer/country peuvent être colonne typée OU
  // dans data jsonb → on lit via to_jsonb(t)->>'champ' (robuste au schéma).
  const [
    viewsByDayRes,
    refererRes,
    countryRes,
    totalViewsRes,
    totalClicksRes,
    todayRes,
    last7Res,
    last30Res,
    clicks30Res,
  ] = await Promise.all([
    pool.query(
      `SELECT to_char(date_trunc('day', viewed_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
       FROM embed_views
       WHERE ww_id = $1 AND viewed_at >= $2
       GROUP BY day`,
      [wwId, since]
    ),
    pool.query(
      `SELECT referrer, count(*)::int AS n
       FROM embed_views
       WHERE ww_id = $1 AND viewed_at >= $2
       GROUP BY referrer
       ORDER BY n DESC`,
      [wwId, since]
    ),
    pool.query(
      `SELECT COALESCE(country, '??') AS country, count(*)::int AS n
       FROM embed_views
       WHERE ww_id = $1 AND viewed_at >= $2
       GROUP BY country
       ORDER BY n DESC`,
      [wwId, since]
    ),
    pool.query(`SELECT count(*)::int AS n FROM embed_views WHERE ww_id = $1`, [wwId]),
    pool.query(`SELECT count(*)::int AS n FROM link_clicks WHERE ww_id = $1`, [wwId]),
    pool.query(
      `SELECT count(*)::int AS n FROM embed_views WHERE ww_id = $1 AND viewed_at >= $2`,
      [wwId, todayStart]
    ),
    pool.query(
      `SELECT count(*)::int AS n FROM embed_views WHERE ww_id = $1 AND viewed_at >= $2`,
      [wwId, since7]
    ),
    pool.query(
      `SELECT count(*)::int AS n FROM embed_views WHERE ww_id = $1 AND viewed_at >= $2`,
      [wwId, since]
    ),
    pool.query(
      `SELECT count(*)::int AS n FROM link_clicks WHERE ww_id = $1 AND clicked_at >= $2`,
      [wwId, since]
    ),
  ])

  const totalViews = totalViewsRes.rows[0]?.n ?? 0
  const totalClicks = totalClicksRes.rows[0]?.n ?? 0
  const todayCount = todayRes.rows[0]?.n ?? 0
  const last7Count = last7Res.rows[0]?.n ?? 0
  const last30Count = last30Res.rows[0]?.n ?? 0
  const clicks30Count = clicks30Res.rows[0]?.n ?? 0

  // Build a dense 30-day series so the chart never has gaps.
  const series: { date: string; count: number }[] = []
  const map = new Map<string, number>()
  for (const row of viewsByDayRes.rows as any[]) {
    if (row.day) map.set(row.day, row.n)
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
  for (const r of refererRes.rows as any[]) {
    const host = normaliseHost(r.referrer)
    refererMerge.set(host, (refererMerge.get(host) || 0) + r.n)
  }
  const referers = Array.from(refererMerge.entries())
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count)

  const countries = (countryRes.rows as any[])
    .map((r) => ({ country: r.country || "??", count: r.n }))
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
