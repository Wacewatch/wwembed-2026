/**
 * GET /api/leaderboard?period=7d|30d|all
 *
 * Public ranking of uploaders by total views generated across their
 * approved content over the requested period. Returns the top 50 by
 * default (override with `?limit=N`).
 *
 * Pure aggregation — no auth required so the leaderboard widget can be
 * displayed on the home page / docs / etc.
 *
 * Migration Mongo → PostgreSQL : le pipeline $unionWith (ownership) + $group
 * (vues par ww_id) + résolution users devient une requête SQL avec CTE.
 * Lecture sur tables brutes (embed_views) : exact et rapide grâce à l'index
 * sur (viewed_at, ww_id) et au chunk exclusion TimescaleDB.
 */
import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/pg/db"

type Period = "7d" | "30d" | "all"

function sinceFor(period: Period) {
  if (period === "all") return null
  const days = period === "7d" ? 7 : 30
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get("period") || "7d") as Period
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50)
  const since = sinceFor(period)

  const pool = getPool()

  // Une seule requête :
  //  1) ownership : ww_id → uploader_id (premier submitted_by trouvé) via UNION ALL
  //     des 4 tables sources.
  //  2) views : comptage embed_views par ww_id sur la période.
  //  3) jointure ownership×views → somme par uploader (vues + nb contenus).
  //  4) jointure users pour username/role (id uuid OU legacy_uuid).
  //  5) tri par vues, limite.
  // Le filtre temporel est injecté en SQL ($2 nullable → pas de filtre si "all").
  const sql = `
    WITH ownership AS (
      SELECT ww_id, submitted_by FROM streaming_links WHERE ww_id IS NOT NULL AND submitted_by IS NOT NULL
      UNION ALL
      SELECT ww_id, submitted_by FROM download_links  WHERE ww_id IS NOT NULL AND submitted_by IS NOT NULL
      UNION ALL
      SELECT ('ww-live-' || id::text) AS ww_id, submitted_by FROM live_tv_channels WHERE submitted_by IS NOT NULL
      UNION ALL
      SELECT ww_id, submitted_by FROM digital_content   WHERE ww_id IS NOT NULL AND submitted_by IS NOT NULL
    ),
    owner_by_ww AS (
      -- un seul uploader par ww_id (le premier rencontré, comme $first en Mongo)
      SELECT DISTINCT ON (ww_id) ww_id, submitted_by::text AS uploader_id
      FROM ownership
      ORDER BY ww_id
    ),
    views AS (
      SELECT ww_id, count(*)::int AS views
      FROM embed_views
      WHERE ($2::timestamptz IS NULL OR viewed_at >= $2::timestamptz)
      GROUP BY ww_id
    ),
    by_uploader AS (
      SELECT o.uploader_id,
             sum(v.views)::int AS views,
             count(*)::int     AS contents
      FROM owner_by_ww o
      JOIN views v ON v.ww_id = o.ww_id
      GROUP BY o.uploader_id
    )
    SELECT b.uploader_id,
           b.views,
           b.contents,
           COALESCE(u.username, 'anonyme') AS username,
           COALESCE(u.role, 'uploader')    AS role
    FROM by_uploader b
    LEFT JOIN users u ON u.id::text = b.uploader_id
    ORDER BY b.views DESC
    LIMIT $1
  `

  try {
    const r = await pool.query(sql, [limit, since])
    const leaderboard = r.rows.map((row: any, i: number) => ({
      rank: i + 1,
      uploader_id: row.uploader_id,
      username: row.username || "anonyme",
      role: row.role || "uploader",
      views: row.views,
      contents: row.contents,
    }))

    // total_uploaders : nombre d'uploaders ayant au moins une vue sur la période.
    const totalRes = await pool.query(
      `WITH ownership AS (
         SELECT ww_id, submitted_by FROM streaming_links WHERE ww_id IS NOT NULL AND submitted_by IS NOT NULL
         UNION ALL SELECT ww_id, submitted_by FROM download_links  WHERE ww_id IS NOT NULL AND submitted_by IS NOT NULL
         UNION ALL SELECT ('ww-live-' || id::text) AS ww_id, submitted_by FROM live_tv_channels WHERE submitted_by IS NOT NULL
         UNION ALL SELECT ww_id, submitted_by FROM digital_content   WHERE ww_id IS NOT NULL AND submitted_by IS NOT NULL
       ),
       owner_by_ww AS (SELECT DISTINCT ON (ww_id) ww_id, submitted_by::text AS uploader_id FROM ownership ORDER BY ww_id),
       views AS (SELECT ww_id FROM embed_views WHERE ($1::timestamptz IS NULL OR viewed_at >= $1::timestamptz) GROUP BY ww_id)
       SELECT count(DISTINCT o.uploader_id)::int AS n
       FROM owner_by_ww o JOIN views v ON v.ww_id = o.ww_id`,
      [since]
    )
    const total_uploaders = totalRes.rows[0]?.n ?? leaderboard.length

    if (!leaderboard.length) return NextResponse.json({ period, leaderboard: [] })
    return NextResponse.json({ period, leaderboard, total_uploaders })
  } catch (e: any) {
    console.error("[leaderboard] error:", e?.message)
    return NextResponse.json({ period, leaderboard: [], error: e?.message }, { status: 500 })
  }
}
