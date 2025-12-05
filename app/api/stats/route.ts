import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const period = request.nextUrl.searchParams.get("period") || "7"
  const daysAgo = Number.parseInt(period)
  const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalViews },
    { count: totalClicks },
    { count: totalApiCalls },
    { data: recentViews },
    { data: topMedia },
  ] = await Promise.all([
    supabase.from("embed_views").select("*", { count: "exact", head: true }).gte("viewed_at", startDate),
    supabase.from("link_clicks").select("*", { count: "exact", head: true }).gte("clicked_at", startDate),
    supabase.from("api_usage").select("*", { count: "exact", head: true }).gte("created_at", startDate),
    supabase.from("embed_views").select("viewed_at").gte("viewed_at", startDate),
    supabase.from("embed_views").select("tmdb_id, media_type").gte("viewed_at", startDate).limit(1000),
  ])

  // Process views by day
  const viewsByDay: Record<string, number> = {}
  ;(recentViews || []).forEach((v) => {
    const date = new Date(v.viewed_at).toISOString().split("T")[0]
    viewsByDay[date] = (viewsByDay[date] || 0) + 1
  })

  // Process top media
  const mediaCount: Record<string, number> = {}
  ;(topMedia || []).forEach((m) => {
    const key = `${m.media_type}-${m.tmdb_id}`
    mediaCount[key] = (mediaCount[key] || 0) + 1
  })

  const topMediaList = Object.entries(mediaCount)
    .map(([key, count]) => {
      const [media_type, tmdb_id] = key.split("-")
      return { media_type, tmdb_id: Number.parseInt(tmdb_id), views: count }
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  return NextResponse.json({
    period: `${daysAgo} days`,
    totals: {
      views: totalViews || 0,
      clicks: totalClicks || 0,
      api_calls: totalApiCalls || 0,
    },
    views_by_day: Object.entries(viewsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    top_media: topMediaList,
  })
}
