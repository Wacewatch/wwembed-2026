/**
 * GET /api/dashboard/my-stats
 *
 * Per-uploader analytics for the dashboard. Returns:
 *   • 30-day daily series (views + clicks)
 *   • Totals (all-time, 7d, 30d)
 *   • Top 10 contents
 *   • Best day on record
 *   • Avg views/day
 *   • Comparative vs previous period (delta %)
 *   • Link health: alive / dead / unknown across this uploader's content
 *
 * Migration Mongo → PostgreSQL. dayBucket supprimé (timestamptz natif).
 * ownership = UNION ALL filtré par submitted_by. Lecture tables brutes.
 */
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/pg/auth"
import { getPool } from "@/lib/pg/db"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req).catch(() => null)
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 })

  const pool = getPool()
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString()
  const sixtyDaysAgo = new Date(now - 60 * 86_400_000).toISOString()
  const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString()

  // 1) ww_ids de cet uploader sur les 4 tables sources.
  const ownRes = await pool.query(
    `SELECT DISTINCT ww_id FROM (
       SELECT ww_id FROM streaming_links  WHERE submitted_by::text = $1 AND ww_id IS NOT NULL
       UNION ALL SELECT ww_id FROM download_links  WHERE submitted_by::text = $1 AND ww_id IS NOT NULL
       UNION ALL SELECT ('ww-live-' || id::text) AS ww_id FROM live_tv_channels WHERE submitted_by::text = $1
       UNION ALL SELECT ww_id FROM digital_content   WHERE submitted_by::text = $1 AND ww_id IS NOT NULL
     ) s`,
    [String(user.id)]
  )
  const myWwIds: string[] = ownRes.rows.map((r: any) => r.ww_id).filter(Boolean)

  if (!myWwIds.length) {
    return NextResponse.json({
      totals: { views: 0, views_30d: 0, views_7d: 0, clicks_30d: 0 },
      delta_pct: { views_30d: 0 },
      series_30d: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(now - (29 - i) * 86_400_000).toISOString().slice(0, 10),
        views: 0,
        clicks: 0,
      })),
      top_contents: [],
      best_day: null,
      avg_views_per_day_30d: 0,
      link_health: { alive: 0, dead: 0, unknown: 0, total: 0 },
      content_count: 0,
    })
  }

  const [
    countsRes,
    seriesViewsRes,
    seriesClicksRes,
    topContentsRes,
    healthRes,
    bySourceRes,
    topMediaBySourceRes,
  ] = await Promise.all([
    // 5 counts en un seul scan chacun (views et clicks séparés).
    pool.query(
      `SELECT
         (SELECT count(*) FROM embed_views WHERE ww_id = ANY($1))::int AS total_views,
         (SELECT count(*) FROM embed_views WHERE ww_id = ANY($1) AND viewed_at >= $2)::int AS views30,
         (SELECT count(*) FROM embed_views WHERE ww_id = ANY($1) AND viewed_at >= $3)::int AS views7,
         (SELECT count(*) FROM link_clicks WHERE ww_id = ANY($1) AND clicked_at >= $2)::int AS clicks30,
         (SELECT count(*) FROM embed_views WHERE ww_id = ANY($1) AND viewed_at >= $4 AND viewed_at < $2)::int AS views_prev30`,
      [myWwIds, thirtyDaysAgo, sevenDaysAgo, sixtyDaysAgo]
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', viewed_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
       FROM embed_views WHERE ww_id = ANY($1) AND viewed_at >= $2 GROUP BY day`,
      [myWwIds, thirtyDaysAgo]
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', clicked_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
       FROM link_clicks WHERE ww_id = ANY($1) AND clicked_at >= $2 GROUP BY day`,
      [myWwIds, thirtyDaysAgo]
    ),
    pool.query(
      `SELECT ww_id,
              count(*)::int AS views,
              (array_agg(media_type ORDER BY viewed_at DESC))[1] AS media_type,
              (array_agg(tmdb_id    ORDER BY viewed_at DESC))[1] AS tmdb_id
       FROM embed_views WHERE ww_id = ANY($1) AND viewed_at >= $2
       GROUP BY ww_id ORDER BY views DESC LIMIT 10`,
      [myWwIds, thirtyDaysAgo]
    ),
    // health breakdown : link_status n'a pas de ww_id → on garde le breakdown
    // global par statut (comportement identique au Mongo d'origine qui groupait
    // sans filtre ww_id, faute de jointure facile).
    pool.query(
      `SELECT status, count(*)::int AS n FROM link_status GROUP BY status`
    ),
    pool.query(
      `SELECT COALESCE(source, 'movix') AS source, count(*)::int AS count
       FROM link_clicks
       WHERE ww_id = ANY($1) AND clicked_at >= $2 AND link_type = 'external'
       GROUP BY COALESCE(source, 'movix')
       ORDER BY count DESC`,
      [myWwIds, thirtyDaysAgo]
    ),
    // Top-3 contenus par source : ROW_NUMBER partitionné par source.
    pool.query(
      `WITH agg AS (
         SELECT COALESCE(source,'movix') AS source, ww_id, tmdb_id, media_type, count(*)::int AS clicks
         FROM link_clicks
         WHERE ww_id = ANY($1) AND clicked_at >= $2 AND link_type = 'external'
         GROUP BY COALESCE(source,'movix'), ww_id, tmdb_id, media_type
       ),
       ranked AS (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY source ORDER BY clicks DESC) AS rn FROM agg
       )
       SELECT source, ww_id, tmdb_id, media_type, clicks FROM ranked WHERE rn <= 3 ORDER BY source, clicks DESC`,
      [myWwIds, thirtyDaysAgo]
    ),
  ])

  const c = countsRes.rows[0] || {}
  const totalViews = c.total_views || 0
  const views30 = c.views30 || 0
  const views7 = c.views7 || 0
  const clicks30 = c.clicks30 || 0
  const viewsPrev30 = c.views_prev30 || 0

  // Dense series
  const viewsByDay = new Map<string, number>()
  for (const r of seriesViewsRes.rows as any[]) if (r.day) viewsByDay.set(r.day, r.n)
  const clicksByDay = new Map<string, number>()
  for (const r of seriesClicksRes.rows as any[]) if (r.day) clicksByDay.set(r.day, r.n)
  const series_30d: { date: string; views: number; clicks: number }[] = []
  let bestDay: { date: string; views: number } | null = null
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10)
    const v = viewsByDay.get(d) || 0
    const cl = clicksByDay.get(d) || 0
    series_30d.push({ date: d, views: v, clicks: cl })
    if (!bestDay || v > bestDay.views) bestDay = { date: d, views: v }
  }

  const delta_pct = viewsPrev30 > 0 ? Math.round(((views30 - viewsPrev30) / viewsPrev30) * 100) : null

  const healthRows = healthRes.rows as any[]
  const findH = (s: string) => healthRows.find((r) => r.status === s)?.n || 0

  // top_media par source (top-3) → regrouper par source en objet.
  const topMediaBySource = (topMediaBySourceRes.rows as any[]).reduce(
    (acc: Record<string, any[]>, r) => {
      const src = r.source
      if (!acc[src]) acc[src] = []
      acc[src].push({ ww_id: r.ww_id, tmdb_id: r.tmdb_id, media_type: r.media_type, clicks: r.clicks })
      return acc
    },
    { movix: [], alt: [], zt: [] } as Record<string, any[]>
  )

  return NextResponse.json({
    totals: {
      views: totalViews,
      views_30d: views30,
      views_7d: views7,
      clicks_30d: clicks30,
    },
    delta_pct: { views_30d: delta_pct },
    series_30d,
    top_contents: (topContentsRes.rows as any[]).map((r) => ({
      ww_id: r.ww_id,
      views: r.views,
      media_type: r.media_type,
      tmdb_id: r.tmdb_id,
    })),
    best_day: bestDay,
    avg_views_per_day_30d: Math.round(views30 / 30),
    link_health: {
      alive: findH("alive"),
      dead: findH("dead"),
      unknown: findH("unknown"),
      total: healthRows.reduce((acc, r) => acc + r.n, 0),
    },
    content_count: myWwIds.length,
    by_source: {
      breakdown: (bySourceRes.rows as any[]).map((r) => ({ source: r.source, count: r.count })),
      top_media: topMediaBySource,
    },
  })
}
