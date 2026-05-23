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
 * Migration Mongo → PostgreSQL. Les helpers dayBucket/hourField/dowField
 * (gestion ISO-string vs Date BSON) DISPARAISSENT : viewed_at est un vrai
 * timestamptz, donc EXTRACT(DOW/HOUR FROM viewed_at) suffit. Lecture tables
 * brutes (exact + rapide). ip_prefix / file_size_bytes vivent dans data jsonb.
 */
import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/pg/db"
import { requireAdmin } from "@/lib/pg/auth"
import { countryForIp } from "@/lib/geo"
import { triggerLinkCheckBackground } from "@/lib/link-checker-runner"
import { fetchTmdbCached } from "@/lib/tmdb-cache"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Kick a background link-health scan (no external cron needed).
  triggerLinkCheckBackground()

  const period = parseInt(req.nextUrl.searchParams.get("period") || "7", 10) || 7
  const now = Date.now()
  const start = new Date(now - period * 86_400_000).toISOString()
  const prevStart = new Date(now - 2 * period * 86_400_000).toISOString()
  const prevEnd = start
  const heatmapStart = new Date(now - 7 * 86_400_000).toISOString()

  const pool = getPool()

  // ───── Comparatif period vs prev period (counts + unique visitors)
  // unique = COUNT(DISTINCT (ip_hash, user_agent)) — équivaut au $group _id:{i,u}.
  const [cmpRes, heatmapRes, prefixRes, topByViewsRes] = await Promise.all([
    pool.query(
      `SELECT
         (SELECT count(*) FROM embed_views WHERE viewed_at >= $1)::int AS views_cur,
         (SELECT count(*) FROM embed_views WHERE viewed_at >= $2 AND viewed_at < $3)::int AS views_prev,
         (SELECT count(*) FROM link_clicks WHERE clicked_at >= $1)::int AS clicks_cur,
         (SELECT count(*) FROM link_clicks WHERE clicked_at >= $2 AND clicked_at < $3)::int AS clicks_prev,
         (SELECT count(*) FROM ad_clicks   WHERE clicked_at >= $1)::int AS ad_cur,
         (SELECT count(*) FROM ad_clicks   WHERE clicked_at >= $2 AND clicked_at < $3)::int AS ad_prev,
         (SELECT count(DISTINCT (ip_hash, user_agent)) FROM embed_views WHERE viewed_at >= $1)::int AS uniq_cur,
         (SELECT count(DISTINCT (ip_hash, user_agent)) FROM embed_views WHERE viewed_at >= $2 AND viewed_at < $3)::int AS uniq_prev`,
      [start, prevStart, prevEnd]
    ),
    // Heatmap 7d : DOW (0=dimanche en Postgres, comme Mongo $dayOfWeek 1=dim → on remappe)
    pool.query(
      `SELECT EXTRACT(DOW FROM viewed_at)::int AS dow,
              EXTRACT(HOUR FROM viewed_at)::int AS hour,
              count(*)::int AS n
       FROM embed_views
       WHERE viewed_at >= $1
       GROUP BY dow, hour`,
      [heatmapStart]
    ),
    // Top ip_prefix (dans data jsonb) sur la période.
    pool.query(
      `SELECT (to_jsonb(t) ->> 'ip_prefix') AS ip_prefix, count(*)::int AS n
       FROM embed_views t
       WHERE viewed_at >= $1 AND (to_jsonb(t) ->> 'ip_prefix') IS NOT NULL
       GROUP BY ip_prefix
       ORDER BY n DESC
       LIMIT 200`,
      [start]
    ),
    // Bandwidth proxy : top contenus par vues.
    pool.query(
      `SELECT ww_id,
              count(*)::int AS views,
              (array_agg(media_type ORDER BY viewed_at DESC))[1] AS media_type,
              (array_agg(tmdb_id    ORDER BY viewed_at DESC))[1] AS tmdb_id
       FROM embed_views
       WHERE viewed_at >= $1
       GROUP BY ww_id
       ORDER BY views DESC
       LIMIT 25`,
      [start]
    ),
  ])

  const cmp = cmpRes.rows[0] || {}
  const viewsCur = cmp.views_cur || 0
  const viewsPrev = cmp.views_prev || 0
  const clicksCur = cmp.clicks_cur || 0
  const clicksPrev = cmp.clicks_prev || 0
  const adClicksCur = cmp.ad_cur || 0
  const adClicksPrev = cmp.ad_prev || 0
  const uniqueCurN = cmp.uniq_cur || 0
  const uniquePrevN = cmp.uniq_prev || 0

  const pctDelta = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0

  // Build dense 7×24 grid; index [dow0=Sun..dow6=Sat][hour0..23].
  // Postgres EXTRACT(DOW) : 0=dimanche..6=samedi → directement 0-based, pas de -1.
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  for (const row of heatmapRes.rows as any[]) {
    const dow = row.dow ?? 0
    const hr = row.hour ?? 0
    if (dow >= 0 && dow < 7 && hr >= 0 && hr < 24) heatmap[dow][hr] = row.n
  }

  // ───── Top countries via ip_prefix → countryForIp (cache Postgres geo).
  const countryCounts = new Map<string, number>()
  await Promise.all(
    (prefixRes.rows as any[]).map(async (row) => {
      const pfx: string | null = row.ip_prefix
      if (!pfx) return
      const probe = pfx.includes(":") ? pfx.replace(/::$/, "::1") : pfx.replace(/\.0$/, ".1")
      if (!probe) return
      const c = await countryForIp(probe)
      if (c) countryCounts.set(c, (countryCounts.get(c) || 0) + row.n)
    })
  )
  const top_countries = Array.from(countryCounts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // ───── Funnel
  const funnel = {
    impressions: viewsCur,
    unique_sessions: uniqueCurN,
    source_clicks: clicksCur,
    ad_clicks: adClicksCur,
    view_to_click_pct: viewsCur > 0 ? Math.round((clicksCur / viewsCur) * 10000) / 100 : 0,
    view_to_ad_pct: viewsCur > 0 ? Math.round((adClicksCur / viewsCur) * 10000) / 100 : 0,
  }

  // ───── Bandwidth proxy : enrichir avec avg file_size_bytes (data jsonb).
  const topByViews = topByViewsRes.rows as any[]
  const sizeByWw = new Map<string, number>()
  if (topByViews.length) {
    const sizeAgg = await pool.query(
      `SELECT ww_id,
              avg(NULLIF(t.data->>'file_size_bytes','')::numeric) AS avg_bytes
       FROM download_links t
       WHERE ww_id = ANY($1::text[])
       GROUP BY ww_id`,
      [topByViews.map((c) => c.ww_id)]
    )
    for (const row of sizeAgg.rows as any[]) {
      if (row.ww_id && row.avg_bytes) sizeByWw.set(row.ww_id, Number(row.avg_bytes))
    }
  }
  const top_bandwidth = await Promise.all(
    topByViews.slice(0, 15).map(async (c) => {
      let title = `${c.ww_id}`
      let poster: string | null = null
      if (c.media_type && c.tmdb_id && (c.media_type === "movie" || c.media_type === "tv")) {
        const tm = await fetchTmdbCached(c.media_type, c.tmdb_id)
        title = tm.title
        poster = tm.poster
      }
      const bytes = sizeByWw.get(c.ww_id) || null
      return {
        ww_id: c.ww_id,
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
