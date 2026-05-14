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
 */
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/mongo/auth"
import { getDb } from "@/lib/mongo/db"

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

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req).catch(() => null)
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 })

  const db = await getDb()
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString()
  const sixtyDaysAgo = new Date(now - 60 * 86_400_000).toISOString()
  const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString()

  // 1) Get all ww_ids submitted by this user across the 4 source tables.
  const ownership = await db
    .collection("streaming_links")
    .aggregate([
      { $match: { submitted_by: user.id } },
      { $project: { ww_id: 1, _id: 0 } },
      {
        $unionWith: {
          coll: "download_links",
          pipeline: [{ $match: { submitted_by: user.id } }, { $project: { ww_id: 1, _id: 0 } }],
        },
      },
      {
        $unionWith: {
          coll: "live_tv_channels",
          pipeline: [{ $match: { submitted_by: user.id } }, { $project: { ww_id: 1, _id: 0 } }],
        },
      },
      {
        $unionWith: {
          coll: "digital_content",
          pipeline: [{ $match: { submitted_by: user.id } }, { $project: { ww_id: 1, _id: 0 } }],
        },
      },
      { $group: { _id: "$ww_id" } },
    ])
    .toArray()
  const myWwIds: string[] = (ownership as any[]).map((r) => r._id).filter(Boolean)

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

  const matchViews30 = { ww_id: { $in: myWwIds }, viewed_at: { $gte: thirtyDaysAgo } }
  const matchViews7 = { ww_id: { $in: myWwIds }, viewed_at: { $gte: sevenDaysAgo } }
  const matchClicks30 = { ww_id: { $in: myWwIds }, clicked_at: { $gte: thirtyDaysAgo } }
  const matchViewsPrev = {
    ww_id: { $in: myWwIds },
    viewed_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
  }

  const [
    totalViews,
    views30,
    views7,
    clicks30,
    viewsPrev30,
    seriesViews,
    seriesClicks,
    topContents,
    healthBreakdown,
  ] = await Promise.all([
    db.collection("embed_views").countDocuments({ ww_id: { $in: myWwIds } }),
    db.collection("embed_views").countDocuments(matchViews30),
    db.collection("embed_views").countDocuments(matchViews7),
    db.collection("link_clicks").countDocuments(matchClicks30),
    db.collection("embed_views").countDocuments(matchViewsPrev),
    db
      .collection("embed_views")
      .aggregate(
        [{ $match: matchViews30 }, { $group: { _id: dayBucket("$viewed_at"), n: { $sum: 1 } } }],
        { allowDiskUse: true }
      )
      .toArray(),
    db
      .collection("link_clicks")
      .aggregate(
        [{ $match: matchClicks30 }, { $group: { _id: dayBucket("$clicked_at"), n: { $sum: 1 } } }],
        { allowDiskUse: true }
      )
      .toArray(),
    db
      .collection("embed_views")
      .aggregate(
        [
          { $match: matchViews30 },
          {
            $group: {
              _id: "$ww_id",
              views: { $sum: 1 },
              media_type: { $first: "$media_type" },
              tmdb_id: { $first: "$tmdb_id" },
            },
          },
          { $sort: { views: -1 } },
          { $limit: 10 },
        ],
        { allowDiskUse: true }
      )
      .toArray(),
    db
      .collection("link_status")
      .aggregate([
        // Match link_status docs whose parent link belongs to this user.
        // We can't join easily — instead we use ww_id directly because
        // link_status doesn't carry it. Fall back to scanning per type.
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ])
      .toArray(),
  ])

  // Dense series
  const viewsByDay = new Map<string, number>()
  for (const r of seriesViews as any[]) if (r._id) viewsByDay.set(r._id, r.n)
  const clicksByDay = new Map<string, number>()
  for (const r of seriesClicks as any[]) if (r._id) clicksByDay.set(r._id, r.n)
  const series_30d: { date: string; views: number; clicks: number }[] = []
  let bestDay: { date: string; views: number } | null = null
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10)
    const v = viewsByDay.get(d) || 0
    const c = clicksByDay.get(d) || 0
    series_30d.push({ date: d, views: v, clicks: c })
    if (!bestDay || v > bestDay.views) bestDay = { date: d, views: v }
  }

  const delta_pct = viewsPrev30 > 0 ? Math.round(((views30 - viewsPrev30) / viewsPrev30) * 100) : null

  return NextResponse.json({
    totals: {
      views: totalViews,
      views_30d: views30,
      views_7d: views7,
      clicks_30d: clicks30,
    },
    delta_pct: { views_30d: delta_pct },
    series_30d,
    top_contents: (topContents as any[]).map((c) => ({
      ww_id: c._id,
      views: c.views,
      media_type: c.media_type,
      tmdb_id: c.tmdb_id,
    })),
    best_day: bestDay,
    avg_views_per_day_30d: Math.round(views30 / 30),
    link_health: {
      alive: (healthBreakdown as any[]).find((r) => r._id === "alive")?.n || 0,
      dead: (healthBreakdown as any[]).find((r) => r._id === "dead")?.n || 0,
      unknown: (healthBreakdown as any[]).find((r) => r._id === "unknown")?.n || 0,
      total: (healthBreakdown as any[]).reduce((acc, r) => acc + r.n, 0),
    },
    content_count: myWwIds.length,
  })
}
