/**
 * GET /api/leaderboard?period=7d|30d|all
 *
 * Public ranking of uploaders by total views generated across their
 * approved content over the requested period. Returns the top 50 by
 * default (override with `?limit=N`).
 *
 * Pure aggregation — no auth required so the leaderboard widget can be
 * displayed on the home page / docs / etc.
 */
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"

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

  const db = await getDb()

  // Build a map of ww_id → submitted_by (one query per link collection).
  // We use a single aggregation that $unionWith the three sources so the
  // ww_id → user lookup happens once.
  const ownership = await db
    .collection("streaming_links")
    .aggregate([
      { $project: { ww_id: 1, submitted_by: 1 } },
      {
        $unionWith: {
          coll: "download_links",
          pipeline: [{ $project: { ww_id: 1, submitted_by: 1 } }],
        },
      },
      {
        $unionWith: {
          coll: "live_tv_channels",
          pipeline: [{ $project: { ww_id: 1, submitted_by: 1 } }],
        },
      },
      {
        $unionWith: {
          coll: "digital_content",
          pipeline: [{ $project: { ww_id: 1, submitted_by: 1 } }],
        },
      },
      { $match: { ww_id: { $ne: null }, submitted_by: { $ne: null } } },
      { $group: { _id: "$ww_id", uploader_id: { $first: "$submitted_by" } } },
    ])
    .toArray()

  const ownerByWw = new Map<string, string>()
  for (const row of ownership as any[]) {
    if (row._id) ownerByWw.set(row._id, row.uploader_id)
  }

  if (!ownerByWw.size) {
    return NextResponse.json({ period, leaderboard: [] })
  }

  // Count embed_views per ww_id over the period.
  const match: any = { ww_id: { $in: Array.from(ownerByWw.keys()) } }
  if (since) match.viewed_at = { $gte: since }
  const viewsAgg = await db
    .collection("embed_views")
    .aggregate(
      [
        { $match: match },
        { $group: { _id: "$ww_id", views: { $sum: 1 } } },
      ],
      { allowDiskUse: true }
    )
    .toArray()

  // Sum by uploader
  const byUploader = new Map<string, { views: number; ww_ids: number }>()
  for (const row of viewsAgg as any[]) {
    const uploaderId = ownerByWw.get(row._id)
    if (!uploaderId) continue
    const cur = byUploader.get(uploaderId) || { views: 0, ww_ids: 0 }
    cur.views += row.views
    cur.ww_ids += 1
    byUploader.set(uploaderId, cur)
  }

  // Sort + resolve usernames
  const sorted = Array.from(byUploader.entries())
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, limit)

  if (!sorted.length) return NextResponse.json({ period, leaderboard: [] })

  const users = await db
    .collection("users")
    .find(
      { $or: [{ legacy_uuid: { $in: sorted.map(([id]) => id) } }, { _id: { $in: sorted.map(([id]) => id).filter((s) => /^[0-9a-f]{24}$/.test(s)).map((s) => s as any) } }] },
      { projection: { username: 1, legacy_uuid: 1, role: 1 } }
    )
    .toArray()
  const userBy = new Map<string, any>()
  for (const u of users as any[]) {
    const id = u.legacy_uuid || (u._id?.toString ? u._id.toString() : String(u._id))
    userBy.set(id, u)
  }

  const leaderboard = sorted.map(([uploaderId, stats], i) => {
    const u = userBy.get(uploaderId)
    return {
      rank: i + 1,
      uploader_id: uploaderId,
      username: u?.username || "anonyme",
      role: u?.role || "uploader",
      views: stats.views,
      contents: stats.ww_ids,
    }
  })

  return NextResponse.json({ period, leaderboard, total_uploaders: byUploader.size })
}
