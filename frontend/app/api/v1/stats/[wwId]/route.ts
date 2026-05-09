import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"

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

  // Resolve title / poster — fallback to TMDB lookup for ww-movie-{id} / ww-tv-{id}
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

  // Range = 30 jours par défaut
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: viewsRecent },
    { data: clicksRecent },
    { count: totalViews },
    { count: totalClicks },
  ] = await Promise.all([
    supabase
      .from("embed_views")
      .select("viewed_at, country, referer")
      .eq("ww_id", wwId)
      .gte("viewed_at", since)
      .order("viewed_at", { ascending: false })
      .limit(5000),
    supabase
      .from("link_clicks")
      .select("clicked_at, country")
      .eq("ww_id", wwId)
      .gte("clicked_at", since)
      .order("clicked_at", { ascending: false })
      .limit(5000),
    supabase.from("embed_views").select("*", { count: "exact", head: true }).eq("ww_id", wwId),
    supabase.from("link_clicks").select("*", { count: "exact", head: true }).eq("ww_id", wwId),
  ])

  // Aggregate by day
  const byDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    byDay[d] = 0
  }
  ;(viewsRecent || []).forEach((v: any) => {
    const d = (v.viewed_at || "").slice(0, 10)
    if (d in byDay) byDay[d] += 1
  })
  const series = Object.entries(byDay).map(([date, count]) => ({ date, count }))

  // Country breakdown
  const byCountry: Record<string, number> = {}
  ;(viewsRecent || []).forEach((v: any) => {
    const c = v.country || "??"
    byCountry[c] = (byCountry[c] || 0) + 1
  })
  const countries = Object.entries(byCountry)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Referer breakdown
  const byReferer: Record<string, number> = {}
  ;(viewsRecent || []).forEach((v: any) => {
    let host = "direct"
    if (v.referer) {
      try {
        host = new URL(v.referer).host
      } catch {
        host = v.referer.slice(0, 60)
      }
    }
    byReferer[host] = (byReferer[host] || 0) + 1
  })
  const referers = Object.entries(byReferer)
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Today / 7d / 30d totals
  const today = new Date().toISOString().slice(0, 10)
  const last7 = Object.entries(byDay)
    .filter(([d]) => {
      const diff = (new Date(today).getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)
      return diff < 7
    })
    .reduce((s, [, n]) => s + n, 0)
  const todayCount = byDay[today] || 0

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
        views_7d: last7,
        views_30d: viewsRecent?.length || 0,
        clicks_30d: clicksRecent?.length || 0,
      },
      series_30d: series,
      top_countries: countries,
      top_referers: referers,
      generated_at: new Date().toISOString(),
    },
    { headers: CORS }
  )
}
