/**
 * Daily stats rollup.
 *
 * Each row in `stats_daily_rollup` aggregates all stats for one day:
 *   { date: "2026-05-14", views, streamingViews, downloadClicks, adClicks,
 *     uniqueVisitors, viewsByType: {movie,tv,live,ebook,music,soft,game} }
 *
 * Built by `rebuildDay(date)` (idempotent) and a single helper
 * `rebuildSince(daysBack)` that the cron endpoint calls. Admin/stats reads
 * this collection instead of scanning embed_views directly — turns a 30-day
 * stats query from ~3-10 s (full scan over millions of docs) into ~50 ms.
 */
import { getDb } from "@/lib/mongo/db"

export interface DailyRollup {
  date: string // YYYY-MM-DD UTC
  views: number
  streamingViews: number
  downloadClicks: number
  adClicks: number
  uniqueVisitors: number
  viewsByType: Record<string, number>
  generated_at: string
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function isoDay(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10)
}

/**
 * Day bucket expression that works for both ISO-string and Date BSON
 * `viewed_at` / `clicked_at` values (legacy migrated rows may be one or
 * the other).
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

export async function rebuildDay(date: string): Promise<DailyRollup> {
  const db = await getDb()
  const start = new Date(date + "T00:00:00.000Z").toISOString()
  const end = new Date(new Date(date + "T00:00:00.000Z").getTime() + 86400000).toISOString()
  const matchViews = { viewed_at: { $gte: start, $lt: end } }
  const matchClicks = { clicked_at: { $gte: start, $lt: end } }

  const [viewsTotal, streamingViews, downloadClicks, adClicks, uniqueAgg, byType] =
    await Promise.all([
      db.collection("embed_views").countDocuments(matchViews),
      db.collection("embed_views").countDocuments({ ...matchViews, embed_type: "streaming" }),
      db.collection("link_clicks").countDocuments(matchClicks),
      db.collection("ad_clicks").countDocuments(matchClicks),
      db
        .collection("embed_views")
        .aggregate(
          [
            { $match: matchViews },
            { $group: { _id: { i: "$ip_hash", u: "$user_agent" } } },
            { $count: "n" },
          ],
          { allowDiskUse: true }
        )
        .toArray(),
      db
        .collection("embed_views")
        .aggregate(
          [{ $match: matchViews }, { $group: { _id: "$media_type", n: { $sum: 1 } } }],
          { allowDiskUse: true }
        )
        .toArray(),
    ])

  const viewsByType: Record<string, number> = {}
  for (const row of byType as any[]) {
    if (row._id) viewsByType[row._id] = row.n
  }

  const rollup: DailyRollup = {
    date,
    views: viewsTotal,
    streamingViews,
    downloadClicks,
    adClicks,
    uniqueVisitors: (uniqueAgg as any[])[0]?.n || 0,
    viewsByType,
    generated_at: new Date().toISOString(),
  }

  await db
    .collection("stats_daily_rollup")
    .updateOne({ date }, { $set: rollup }, { upsert: true })

  return rollup
}

/**
 * Rebuild the last N days (default 2: today + yesterday, idempotent).
 * Use a larger value for backfill.
 */
export async function rebuildSince(daysBack: number = 2): Promise<DailyRollup[]> {
  const out: DailyRollup[] = []
  const today = new Date()
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today.getTime() - i * 86400000)
    const r = await rebuildDay(isoDay(d))
    out.push(r)
  }
  return out
}

/**
 * Read N days of rollup data (newest first). Used by admin/stats.
 */
export async function readRollups(days: number = 30): Promise<DailyRollup[]> {
  const db = await getDb()
  const start = isoDay(new Date(Date.now() - (days - 1) * 86400000))
  const rows = await db
    .collection<DailyRollup>("stats_daily_rollup")
    .find({ date: { $gte: start } })
    .sort({ date: -1 })
    .toArray()
  return rows.map((r) => ({ ...r, _id: undefined as any })) as any
}

// Re-exported helper for callers that want the day bucket expression.
export { dayBucket, isoDay }
