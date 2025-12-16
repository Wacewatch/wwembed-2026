"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, TrendingUp, Users, Eye, MousePointer, Zap, Clock, Calendar, Monitor, Film, Tv } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getPosterUrl } from "@/lib/tmdb"
import { Loader2 } from "lucide-react" // Import Loader2

interface ViewsByDay {
  date: string
  count: number
  streamingCount: number
  downloadCount: number
  formattedDate: string
}

interface TopMedia {
  tmdb_id: number | null
  media_type: string
  views: number
  title?: string
  poster?: string
  ww_id?: string
}

interface TopMediaDownload {
  tmdb_id: number | null
  media_type: string
  downloads: number
  title?: string
  poster?: string
  ww_id?: string
}

interface TopReferrer {
  referrer: string
  count: number
}

interface DetailedStats {
  totalViews: number
  totalClicks: number
  totalAdClicks: number
  uniqueVisitors: number
  avgViewsPerDay: number
  topCountries: { country: string; count: number }[]
  viewsByType: { type: string; count: number }[]
  recentActivity: { action: string; timestamp: string; details: string }[]
  topContent: { title: string; views: number; poster?: string; media_type?: string; ww_id?: string }[]
  topReferrers: { source: string; count: number }[]
  streamingViews: number
}

interface OnlineStats {
  users5min: number
  users15min: number
  users1hour: number
  users24hours: number
  activePages: { ww_id: string; count: number; title?: string; poster?: string; media_type?: string }[]
  recentVisitors: {
    ip_hash: string
    ww_id: string
    title?: string
    poster?: string
    media_type?: string
    viewed_at: string
  }[]
}

async function getCountForPeriod(supabase: any, table: string, column: string, since: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).gte(column, since)

  if (error) {
    console.error(`[v0] Error counting ${table}:`, error)
    return 0
  }
  return count || 0
}

async function getUniqueCountForPeriod(
  supabase: any,
  table: string,
  column: string,
  since: string,
  uniqueColumn: string,
): Promise<number> {
  // For unique counts, we need to fetch data but only the unique column
  const { data, error } = await supabase.from(table).select(uniqueColumn).gte(column, since).limit(50000)

  if (error) {
    console.error(`[v0] Error fetching unique ${table}:`, error)
    return 0
  }

  const uniqueSet = new Set(data?.map((d: any) => d[uniqueColumn]).filter(Boolean))
  return uniqueSet.size
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92"

export function StatsViewer() {
  const [period, setPeriod] = useState("7")
  const [viewsByDay, setViewsByDay] = useState<ViewsByDay[]>([])
  const [topMedia, setTopMedia] = useState<TopMedia[]>([])
  const [topMediaDownload, setTopMediaDownload] = useState<TopMediaDownload[]>([])
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null)
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState("")
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const supabase = createBrowserClient()

  const loadOnlineStats = useCallback(async () => {
    try {
      const now = new Date()
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

      const [count5min, count15min, count1hour, count24hours] = await Promise.all([
        getCountForPeriod(supabase, "embed_views", "viewed_at", fiveMinAgo),
        getCountForPeriod(supabase, "embed_views", "viewed_at", fifteenMinAgo),
        getUniqueCountForPeriod(supabase, "embed_views", "viewed_at", oneHourAgo, "ip_hash"),
        getUniqueCountForPeriod(supabase, "embed_views", "viewed_at", twentyFourHoursAgo, "ip_hash"),
      ])

      // Fetch active pages (last 15 min) with limited data
      const { data: views15min } = await supabase
        .from("embed_views")
        .select("ww_id, tmdb_id, media_type")
        .gte("viewed_at", fifteenMinAgo)
        .limit(5000)

      const pageCount: Record<string, { count: number; tmdb_id?: number; media_type?: string }> = {}
      views15min?.forEach((v: any) => {
        if (v.ww_id) {
          if (!pageCount[v.ww_id]) {
            pageCount[v.ww_id] = { count: 0, tmdb_id: v.tmdb_id, media_type: v.media_type }
          }
          pageCount[v.ww_id].count++
        }
      })

      const activePages = Object.entries(pageCount)
        .map(([ww_id, data]) => ({ ww_id, count: data.count, tmdb_id: data.tmdb_id, media_type: data.media_type }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const activePagesWithTitles = await Promise.all(
        activePages.map(async (page: any) => {
          let title = page.ww_id
          let poster = undefined

          if (page.ww_id?.includes("live")) {
            const { data: liveChannel } = await supabase
              .from("live_channels")
              .select("name, logo_url")
              .eq("ww_id", page.ww_id)
              .single()
            if (liveChannel) {
              title = liveChannel.name
              poster = liveChannel.logo_url
            }
          } else if (page.tmdb_id && page.media_type) {
            try {
              const endpoint =
                page.media_type === "movie"
                  ? `https://api.themoviedb.org/3/movie/${page.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo"}&language=fr-FR`
                  : `https://api.themoviedb.org/3/tv/${page.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo"}&language=fr-FR`
              const res = await fetch(endpoint)
              if (res.ok) {
                const data = await res.json()
                title = data.title || data.name || page.ww_id
                poster = data.poster_path ? getPosterUrl(data.poster_path, "w92") : undefined
              }
            } catch {}
          }

          return { ...page, title, poster }
        }),
      )

      // Fetch recent visitors (limited)
      const { data: recentViews } = await supabase
        .from("embed_views")
        .select("ip_hash, ww_id, tmdb_id, media_type, viewed_at")
        .order("viewed_at", { ascending: false })
        .limit(20)

      const recentVisitors = await Promise.all(
        (recentViews || []).slice(0, 10).map(async (v: any) => {
          let title = v.ww_id
          let poster = undefined

          if (v.ww_id?.includes("live")) {
            const { data: liveChannel } = await supabase
              .from("live_channels")
              .select("name, logo_url")
              .eq("ww_id", v.ww_id)
              .single()
            if (liveChannel) {
              title = liveChannel.name
              poster = liveChannel.logo_url
            }
          } else if (v.tmdb_id && v.media_type) {
            try {
              const endpoint =
                v.media_type === "movie"
                  ? `https://api.themoviedb.org/3/movie/${v.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo"}&language=fr-FR`
                  : `https://api.themoviedb.org/3/tv/${v.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo"}&language=fr-FR`
              const res = await fetch(endpoint)
              if (res.ok) {
                const data = await res.json()
                title = data.title || data.name || v.ww_id
                poster = data.poster_path ? getPosterUrl(data.poster_path, "w92") : undefined
              }
            } catch {}
          }

          return {
            ip_hash: v.ip_hash?.substring(0, 8) || "Anonyme",
            ww_id: v.ww_id,
            title,
            poster,
            media_type: v.media_type,
            viewed_at: v.viewed_at,
          }
        }),
      )

      setOnlineStats({
        users5min: count5min,
        users15min: count15min,
        users1hour: count1hour,
        users24hours: count24hours,
        activePages: activePagesWithTitles,
        recentVisitors,
      })

      setLastUpdate(new Date())
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading online stats:", error)
      setLoading(false)
    }
  }, [supabase])

  const loadDetailedStats = useCallback(async () => {
    setDetailedLoading(true)
    try {
      const now = new Date()
      const periodDays = Number.parseInt(period)
      const since = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString()

      const [totalViews, totalClicks, totalAdClicks, uniqueVisitors] = await Promise.all([
        getCountForPeriod(supabase, "embed_views", "viewed_at", since),
        getCountForPeriod(supabase, "link_clicks", "created_at", since),
        getCountForPeriod(supabase, "ad_clicks", "clicked_at", since),
        getUniqueCountForPeriod(supabase, "embed_views", "viewed_at", since, "ip_hash"),
      ])

      // Get views by type (limited sample for breakdown)
      const { data: sampleViews } = await supabase
        .from("embed_views")
        .select("media_type, embed_type, ww_id")
        .gte("viewed_at", since)
        .limit(10000)

      const movieViews = sampleViews?.filter((v: any) => v.media_type === "movie").length || 0
      const tvViews = sampleViews?.filter((v: any) => v.media_type === "tv").length || 0
      const liveViews =
        sampleViews?.filter(
          (v: any) =>
            v.media_type === "live" ||
            v.media_type === "live_tv" ||
            v.embed_type === "live" ||
            v.ww_id?.includes("live"),
        ).length || 0
      const streamingViews = sampleViews?.filter((v: any) => v.embed_type === "streaming").length || 0

      // Scale up based on total views vs sample size
      const sampleSize = sampleViews?.length || 1
      const scale = totalViews / sampleSize

      // Get top content
      const mediaCount: Record<string, { tmdb_id: number | null; media_type: string; views: number; ww_id?: string }> =
        {}
      sampleViews?.forEach((v: any) => {
        const isLive =
          v.media_type === "live" || v.media_type === "live_tv" || v.embed_type === "live" || v.ww_id?.includes("live")
        const mediaKey = isLive ? `live-${v.ww_id}` : `${v.media_type}-${v.tmdb_id}`

        if (!mediaCount[mediaKey]) {
          mediaCount[mediaKey] = {
            tmdb_id: isLive ? null : v.tmdb_id,
            media_type: isLive ? "live" : v.media_type,
            views: 0,
            ww_id: v.ww_id,
          }
        }
        mediaCount[mediaKey].views++
      })

      const topMedia = Object.values(mediaCount)
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)

      const topContent = await Promise.all(
        topMedia.map(async (item) => {
          let title = item.ww_id || "Unknown"
          let poster = undefined

          if (item.media_type === "live" && item.ww_id) {
            const { data: liveChannel } = await supabase
              .from("live_channels")
              .select("name, logo_url")
              .eq("ww_id", item.ww_id)
              .single()
            if (liveChannel) {
              title = liveChannel.name
              poster = liveChannel.logo_url
            }
          } else if (item.tmdb_id) {
            try {
              const endpoint =
                item.media_type === "movie"
                  ? `https://api.themoviedb.org/3/movie/${item.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo"}&language=fr-FR`
                  : `https://api.themoviedb.org/3/tv/${item.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo"}&language=fr-FR`
              const res = await fetch(endpoint)
              if (res.ok) {
                const data = await res.json()
                title = data.title || data.name || title
                poster = data.poster_path ? getPosterUrl(data.poster_path, "w92") : undefined
              }
            } catch {}
          }

          return {
            title,
            views: Math.round(item.views * scale),
            poster,
            media_type: item.media_type,
            ww_id: item.ww_id,
          }
        }),
      )

      const avgViewsPerDay = periodDays > 0 ? totalViews / periodDays : 0

      setDetailedStats({
        totalViews,
        totalClicks,
        totalAdClicks,
        uniqueVisitors,
        avgViewsPerDay,
        topCountries: [],
        viewsByType: [
          { type: "Films", count: Math.round(movieViews * scale) },
          { type: "Series", count: Math.round(tvViews * scale) },
          { type: "TV Live", count: Math.round(liveViews * scale) },
          { type: "Streaming", count: Math.round(streamingViews * scale) },
        ],
        recentActivity: [],
        topContent,
        topReferrers: [],
        streamingViews: Math.round(streamingViews * scale),
      })

      setDetailedLoading(false)
    } catch (error) {
      console.error("[v0] Error loading detailed stats:", error)
      setDetailedLoading(false)
    }
  }, [supabase, period])

  useEffect(() => {
    loadOnlineStats()
    const interval = setInterval(loadOnlineStats, 30000)
    return () => clearInterval(interval)
  }, [loadOnlineStats])

  useEffect(() => {
    loadDetailedStats()
  }, [loadDetailedStats])

  const getMediaTypeBadge = (mediaType?: string) => {
    switch (mediaType) {
      case "movie":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
            <Film className="h-3 w-3" /> Film
          </span>
        )
      case "tv":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
            <Tv className="h-3 w-3" /> Série
          </span>
        )
      case "live":
      case "live_tv":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
            <Monitor className="h-3 w-3" /> TV Live
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p>Chargement des statistiques...</p>
        {loadingProgress && <p className="text-sm mt-2">{loadingProgress}</p>}
      </div>
    )
  }

  const chartTotal = viewsByDay.reduce((sum, day) => sum + day.count, 0)
  const referrersTotal = topReferrers.reduce((sum, ref) => sum + ref.count, 0)
  const mediaTotal = topMedia.reduce((sum, m) => sum + m.views, 0)
  const downloadTotal = topMediaDownload.reduce((sum, m) => sum + m.downloads, 0)

  return (
    <div className="space-y-6">
      {/* Online Stats Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-yellow-500" />
            Utilisateurs en ligne
          </h3>
          <Button variant="outline" size="sm" onClick={loadOnlineStats} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            En temps réel
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-green-500/30 bg-green-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />5 dernières min
              </div>
              <div className="mt-2 text-3xl font-bold text-green-500">
                {loading ? <Skeleton className="h-9 w-16" /> : onlineStats?.users5min?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">utilisateurs actifs</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                15 dernières min
              </div>
              <div className="mt-2 text-3xl font-bold text-yellow-500">
                {loading ? <Skeleton className="h-9 w-16" /> : onlineStats?.users15min?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">utilisateurs actifs</div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-blue-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Dernière heure
              </div>
              <div className="mt-2 text-3xl font-bold text-blue-500">
                {loading ? <Skeleton className="h-9 w-16" /> : onlineStats?.users1hour?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">visiteurs uniques</div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/30 bg-orange-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                24 dernières heures
              </div>
              <div className="mt-2 text-3xl font-bold text-orange-500">
                {loading ? <Skeleton className="h-9 w-16" /> : onlineStats?.users24hours?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">visiteurs uniques</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Pages les plus actives (15 min)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="max-h-[300px] space-y-2 overflow-y-auto">
                  {onlineStats?.activePages?.map((page, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                      <span className="text-sm font-medium text-muted-foreground">{i + 1}.</span>
                      {page.poster ? (
                        <img src={page.poster || "/placeholder.svg"} alt="" className="h-10 w-8 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-8 items-center justify-center rounded bg-muted">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{page.title}</div>
                        {getMediaTypeBadge(page.media_type)}
                      </div>
                      <span className="text-sm font-bold text-primary">{page.count}</span>
                    </div>
                  ))}
                  {(!onlineStats?.activePages || onlineStats.activePages.length === 0) && (
                    <div className="py-4 text-center text-sm text-muted-foreground">Aucune activité récente</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Visiteurs récents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="max-h-[300px] space-y-2 overflow-y-auto">
                  {onlineStats?.recentVisitors?.map((visitor, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      {visitor.poster ? (
                        <img
                          src={visitor.poster || "/placeholder.svg"}
                          alt=""
                          className="h-10 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-8 items-center justify-center rounded bg-muted">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{visitor.title}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{visitor.ip_hash}</span>
                          {getMediaTypeBadge(visitor.media_type)}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(visitor.viewed_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                  {(!onlineStats?.recentVisitors || onlineStats.recentVisitors.length === 0) && (
                    <div className="py-4 text-center text-sm text-muted-foreground">Aucun visiteur récent</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Stats Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" />
            Statistiques détaillées
          </h3>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Dernières 24h</SelectItem>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadDetailedStats} disabled={detailedLoading}>
              <RefreshCw className={`h-4 w-4 ${detailedLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {detailedLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Chargement des statistiques...</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    Total Vues
                  </div>
                  <div className="mt-2 text-2xl font-bold">{detailedStats?.totalViews?.toLocaleString() || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MousePointer className="h-4 w-4" />
                    Total Clics
                  </div>
                  <div className="mt-2 text-2xl font-bold">{detailedStats?.totalClicks?.toLocaleString() || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Visiteurs Uniques
                  </div>
                  <div className="mt-2 text-2xl font-bold">{detailedStats?.uniqueVisitors?.toLocaleString() || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Clics Pubs
                  </div>
                  <div className="mt-2 text-2xl font-bold">{detailedStats?.totalAdClicks?.toLocaleString() || 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Vues par type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {detailedStats?.viewsByType?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm">{item.type}</span>
                        <span className="font-medium">{item.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top Contenus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[200px] space-y-2 overflow-y-auto">
                    {detailedStats?.topContent?.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                        <span className="text-sm font-medium text-muted-foreground">{i + 1}.</span>
                        {item.poster ? (
                          <img
                            src={item.poster || "/placeholder.svg"}
                            alt=""
                            className="h-10 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-8 items-center justify-center rounded bg-muted">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{item.title}</div>
                          {getMediaTypeBadge(item.media_type)}
                        </div>
                        <span className="text-sm font-bold text-primary">{item.views.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {lastUpdate && (
        <div className="text-right text-xs text-muted-foreground">
          Dernière mise à jour:{" "}
          {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      )}
    </div>
  )
}
