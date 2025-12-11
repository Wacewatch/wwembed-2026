"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Eye,
  MousePointer,
  TrendingUp,
  Users,
  Film,
  Tv,
  Play,
  Globe,
  Calendar,
  BarChart3,
  Loader2,
  Download,
  Activity,
  UserCheck,
  Clock,
} from "lucide-react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts"

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
}

interface OnlineStats {
  usersOnline5min: number
  usersOnline15min: number
  usersOnline1hour: number
  activePages: { ww_id: string; count: number; title?: string }[]
  recentVisitors: { ip_hash: string; viewed_at: string; ww_id: string; media_type: string }[]
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92"

export function StatsViewer() {
  const [period, setPeriod] = useState("7")
  const [viewsByDay, setViewsByDay] = useState<ViewsByDay[]>([])
  const [topMedia, setTopMedia] = useState<TopMedia[]>([])
  const [topMediaDownload, setTopMediaDownload] = useState<TopMediaDownload[]>([])
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState("")
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null)

  useEffect(() => {
    loadStats()
    loadOnlineStats()
    const interval = setInterval(loadOnlineStats, 30000)
    return () => clearInterval(interval)
  }, [period])

  const loadOnlineStats = async () => {
    const supabase = createClient()

    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

    try {
      // Get views from last 5 minutes
      const { data: views5min } = await supabase.from("embed_views").select("ip_hash").gte("viewed_at", fiveMinAgo)

      // Get views from last 15 minutes
      const { data: views15min } = await supabase.from("embed_views").select("ip_hash").gte("viewed_at", fifteenMinAgo)

      // Get views from last hour
      const { data: views1hour } = await supabase.from("embed_views").select("ip_hash").gte("viewed_at", oneHourAgo)

      // Get active pages (most viewed in last 15 minutes)
      const { data: recentViews } = await supabase
        .from("embed_views")
        .select("ww_id, ip_hash, viewed_at, media_type, tmdb_id")
        .gte("viewed_at", fifteenMinAgo)
        .order("viewed_at", { ascending: false })
        .limit(100)

      // Count unique IPs
      const uniqueIps5min = new Set(views5min?.map((v: any) => v.ip_hash) || []).size
      const uniqueIps15min = new Set(views15min?.map((v: any) => v.ip_hash) || []).size
      const uniqueIps1hour = new Set(views1hour?.map((v: any) => v.ip_hash) || []).size

      // Count active pages
      const pageCount: Record<string, number> = {}
      recentViews?.forEach((v: any) => {
        if (v.ww_id) {
          pageCount[v.ww_id] = (pageCount[v.ww_id] || 0) + 1
        }
      })

      const activePages = Object.entries(pageCount)
        .map(([ww_id, count]) => ({ ww_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Get recent unique visitors
      const seenIps = new Set()
      const recentVisitors =
        recentViews
          ?.filter((v: any) => {
            if (seenIps.has(v.ip_hash)) return false
            seenIps.add(v.ip_hash)
            return true
          })
          .slice(0, 10)
          .map((v: any) => ({
            ip_hash: v.ip_hash?.substring(0, 8) + "...",
            viewed_at: v.viewed_at,
            ww_id: v.ww_id || "N/A",
            media_type: v.media_type || "N/A",
          })) || []

      setOnlineStats({
        usersOnline5min: uniqueIps5min,
        usersOnline15min: uniqueIps15min,
        usersOnline1hour: uniqueIps1hour,
        activePages,
        recentVisitors,
      })
    } catch (error) {
      console.error("[v0] Error loading online stats:", error)
    }
  }

  const fetchAllRowsPaginated = async (
    supabase: any,
    table: string,
    selectFields: string,
    startDate: string,
    dateField: string,
  ) => {
    let allData: any[] = []
    let page = 0
    const pageSize = 1000 // Supabase limite à 1000 par requête
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1

      setLoadingProgress(`Chargement des données... ${allData.length} lignes`)

      const { data, error } = await supabase
        .from(table)
        .select(selectFields)
        .gte(dateField, startDate)
        .range(from, to)
        .order(dateField, { ascending: false })

      if (error) {
        console.error("[v0] Error fetching data:", error)
        hasMore = false
      } else if (!data || data.length === 0) {
        hasMore = false
      } else {
        allData = [...allData, ...data]
        // Si on a reçu moins que pageSize, c'est qu'on a tout récupéré
        if (data.length < pageSize) {
          hasMore = false
        }
        page++
      }
    }

    setLoadingProgress(`${allData.length} lignes chargées`)
    return allData
  }

  const loadStats = async () => {
    setLoading(true)
    setLoadingProgress("")
    const supabase = createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number.parseInt(period))
    const startDateStr = startDate.toISOString()

    try {
      // Fetch all embed_views with pagination
      const allViews = await fetchAllRowsPaginated(
        supabase,
        "embed_views",
        "id, viewed_at, media_type, tmdb_id, ww_id, referrer, ip_hash, embed_type",
        startDateStr,
        "viewed_at",
      )

      // Fetch all link_clicks with pagination
      const allLinkClicks = await fetchAllRowsPaginated(
        supabase,
        "link_clicks",
        "clicked_at, tmdb_id, media_type, ww_id, link_type",
        startDateStr,
        "clicked_at",
      )

      // Fetch all ad_clicks with pagination
      const allAdClicks = await fetchAllRowsPaginated(supabase, "ad_clicks", "clicked_at", startDateStr, "clicked_at")

      const viewsPerDay: Record<string, { total: number; streaming: number; download: number }> = {}

      // Generate all dates in the period
      const today = new Date()
      for (let i = Number.parseInt(period) - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateKey = d.toISOString().split("T")[0]
        viewsPerDay[dateKey] = { total: 0, streaming: 0, download: 0 }
      }

      allViews.forEach((view: any) => {
        const date = new Date(view.viewed_at).toISOString().split("T")[0]
        if (viewsPerDay[date]) {
          viewsPerDay[date].total++
          // Count streaming views separately (embed_type === 'streaming' or media accessed via streaming)
          if (view.embed_type === "streaming" || view.ww_id?.includes("streaming")) {
            viewsPerDay[date].streaming++
          }
        }
      })

      allLinkClicks.forEach((click: any) => {
        const date = new Date(click.clicked_at).toISOString().split("T")[0]
        if (viewsPerDay[date]) {
          viewsPerDay[date].download++
        }
      })

      const viewsByDayData: ViewsByDay[] = Object.entries(viewsPerDay)
        .map(([date, data]) => ({
          date,
          count: data.total,
          streamingCount: data.streaming,
          downloadCount: data.download,
          formattedDate: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setViewsByDay(viewsByDayData)

      // Process top media
      const mediaCount: Record<string, { tmdb_id: number | null; media_type: string; views: number; ww_id?: string }> =
        {}
      const refCount: Record<string, number> = {}
      const uniqueIps = new Set<string>()

      allViews.forEach((v) => {
        const isLive =
          v.media_type === "live" ||
          v.media_type === "live_tv" ||
          v.embed_type === "live" ||
          (v.ww_id && v.ww_id.toLowerCase().includes("live"))
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

        let ref = "Direct"
        if (v.referrer) {
          try {
            const url = new URL(v.referrer)
            ref = url.origin
          } catch {
            ref = v.referrer
          }
        }
        refCount[ref] = (refCount[ref] || 0) + 1

        if (v.ip_hash) {
          uniqueIps.add(v.ip_hash)
        }
      })

      const topMediaList = Object.values(mediaCount)
        .sort((a, b) => b.views - a.views)
        .slice(0, 50)

      const topMediaWithDetails: TopMedia[] = await Promise.all(
        topMediaList.map(async (m) => {
          if (m.media_type === "live" && m.ww_id) {
            const channelId = m.ww_id.replace(/^ww-live-/i, "")
            const { data: channel } = await supabase
              .from("live_tv_channels")
              .select("channel_name, channel_logo")
              .eq("id", channelId)
              .single()
            return {
              ...m,
              title: channel?.channel_name || "Chaine TV",
              poster: channel?.channel_logo || undefined,
            }
          } else if (m.tmdb_id && m.media_type && m.media_type !== "live") {
            try {
              const res = await fetch(`/api/tmdb/${m.media_type}/${m.tmdb_id}`)
              if (res.ok) {
                const data = await res.json()
                return {
                  ...m,
                  title: data.title || data.name || `#${m.tmdb_id}`,
                  poster: data.poster || undefined,
                }
              }
            } catch (e) {
              // Ignore errors
            }
          }
          return { ...m, title: m.media_type === "live" ? "Chaine TV" : `#${m.tmdb_id}` }
        }),
      )

      setTopMedia(topMediaWithDetails)

      // Process top media downloads
      const downloadCount: Record<
        string,
        { tmdb_id: number | null; media_type: string; downloads: number; ww_id?: string }
      > = {}
      allLinkClicks.forEach((click) => {
        const isDigital =
          click.ww_id &&
          (click.ww_id.startsWith("ww-ebook-") ||
            click.ww_id.startsWith("ww-music-") ||
            click.ww_id.startsWith("ww-software-") ||
            click.ww_id.startsWith("ww-game-"))
        const mediaKey = isDigital
          ? `digital-${click.ww_id}`
          : `${click.media_type || "unknown"}-${click.tmdb_id || click.ww_id}`

        if (!downloadCount[mediaKey]) {
          downloadCount[mediaKey] = {
            tmdb_id: isDigital ? null : click.tmdb_id,
            media_type: isDigital ? "digital" : click.media_type || "unknown",
            downloads: 0,
            ww_id: click.ww_id,
          }
        }
        downloadCount[mediaKey].downloads++
      })

      const topDownloadList = Object.values(downloadCount)
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 50)

      const topDownloadWithDetails: TopMediaDownload[] = await Promise.all(
        topDownloadList.map(async (m) => {
          if (m.media_type === "digital" && m.ww_id) {
            const { data: digital } = await supabase
              .from("digital_content")
              .select("title, cover_url")
              .eq("ww_id", m.ww_id)
              .single()
            return {
              ...m,
              title: digital?.title || "Contenu Digital",
              poster: digital?.cover_url || undefined,
            }
          } else if (m.tmdb_id && m.media_type) {
            // Normalize media_type for TMDB API (should be "movie" or "tv")
            const tmdbType = m.media_type === "movie" || m.media_type === "tv" ? m.media_type : null

            if (tmdbType) {
              try {
                const res = await fetch(`/api/tmdb/${tmdbType}/${m.tmdb_id}`)
                if (res.ok) {
                  const data = await res.json()
                  return {
                    ...m,
                    title: data.title || data.name || `#${m.tmdb_id}`,
                    poster: data.poster || undefined,
                  }
                }
              } catch (e) {
                console.error("[v0] TMDB fetch error:", e)
              }
            }
          }
          return { ...m, title: m.media_type === "digital" ? "Contenu Digital" : `#${m.tmdb_id || m.ww_id}` }
        }),
      )

      setTopMediaDownload(topDownloadWithDetails)

      // Process top referrers
      const topReferrersList = Object.entries(refCount)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50)

      setTopReferrers(topReferrersList)

      // Calculate detailed stats
      const totalViews = Object.values(viewsPerDay).reduce((sum, day) => sum + day.total, 0)
      const totalStreamingViews = Object.values(viewsPerDay).reduce((sum, day) => sum + day.streaming, 0)
      const totalClicks = allLinkClicks.length
      const totalAdClicks = allAdClicks.length
      const uniqueVisitors = uniqueIps.size
      const avgViewsPerDay = period > 0 ? totalViews / Number.parseInt(period) : 0

      setDetailedStats({
        totalViews,
        totalClicks,
        totalAdClicks,
        uniqueVisitors,
        avgViewsPerDay,
        topCountries: [],
        viewsByType: [
          { type: "Films", count: allViews.filter((v) => v.media_type === "movie").length },
          { type: "Series", count: allViews.filter((v) => v.media_type === "tv").length },
          {
            type: "TV Live",
            count: allViews.filter(
              (v) => v.media_type === "live" || v.media_type === "live_tv" || v.embed_type === "live",
            ).length,
          },
          { type: "Streaming", count: totalStreamingViews },
        ],
        recentActivity: allViews.slice(0, 5).map((v) => ({
          action: "Vue",
          timestamp: v.viewed_at,
          details: `${v.media_type} #${v.tmdb_id || v.ww_id}`,
        })),
      })

      setLoading(false)
      setLoadingProgress("")
    } catch (error) {
      console.error("[v0] Error loading stats:", error)
      setLoading(false)
      setLoadingProgress("")
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Statistiques Detaillees
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="14">14 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {detailedStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">{detailedStats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Vues totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MousePointer className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-500">{detailedStats.totalClicks.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Clics liens</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MousePointer className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-purple-500">{detailedStats.totalAdClicks.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Clics pubs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-500">{detailedStats.uniqueVisitors.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Visiteurs uniques</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(detailedStats.avgViewsPerDay).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Moy. vues/jour</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {detailedStats && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              Repartition par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {detailedStats.viewsByType.map((item) => (
                <div key={item.type} className="text-center p-4 bg-muted/50 rounded-lg">
                  {item.type === "Films" && <Film className="w-8 h-8 mx-auto mb-2 text-blue-500" />}
                  {item.type === "Series" && <Tv className="w-8 h-8 mx-auto mb-2 text-purple-500" />}
                  {item.type === "TV Live" && <Play className="w-8 h-8 mx-auto mb-2 text-red-500" />}
                  {item.type === "Streaming" && <Play className="w-8 h-8 mx-auto mb-2 text-yellow-500" />}
                  <p className="text-xl font-bold text-foreground">{item.count.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{item.type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Vues par jour
            </span>
            <Badge variant="outline" className="text-primary">
              Total: {chartTotal.toLocaleString()} vues
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewsByDay.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viewsByDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="formattedDate"
                    stroke="#9ca3af"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    interval={viewsByDay.length > 14 ? Math.floor(viewsByDay.length / 10) : 0}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    allowDecimals={false}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(value: number) => [`${value.toLocaleString()} vues`, "Vues"]}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Vues" />
                  <Bar dataKey="streamingCount" fill="#fde047" radius={[4, 4, 0, 0]} name="Streaming" />
                  <Bar dataKey="downloadCount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Downloads" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Aucune donnee disponible</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" />
                Top Medias (Vues)
              </span>
              <Badge variant="outline" className="text-primary">
                {mediaTotal.toLocaleString()} vues
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {topMedia.length > 0 ? (
                topMedia.map((media, i) => (
                  <div
                    key={`${media.media_type}-${media.tmdb_id || media.ww_id}-${i}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-muted-foreground w-6 text-right font-medium">{i + 1}.</span>
                    {media.poster ? (
                      <img
                        src={media.poster.startsWith("http") ? media.poster : `${TMDB_IMAGE_BASE}${media.poster}`}
                        alt={media.title}
                        className="w-10 h-14 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                        {media.media_type === "live" ? (
                          <Play className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Film className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">{media.title}</p>
                      <Badge
                        variant="outline"
                        className={
                          media.media_type === "movie"
                            ? "text-blue-500 border-blue-500/30 text-xs"
                            : media.media_type === "tv"
                              ? "text-purple-500 border-purple-500/30 text-xs"
                              : "text-red-500 border-red-500/30 text-xs"
                        }
                      >
                        {media.media_type === "movie" ? "Film" : media.media_type === "tv" ? "Série" : "TV Live"}
                      </Badge>
                    </div>
                    <span className="text-primary font-bold text-sm">{media.views.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucune donnee</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Download className="w-5 h-5 text-orange-500" />
                Top Medias (Download)
              </span>
              <Badge variant="outline" className="text-orange-500">
                {downloadTotal.toLocaleString()} clics
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {topMediaDownload.length > 0 ? (
                topMediaDownload.map((media, i) => (
                  <div
                    key={`dl-${media.media_type}-${media.tmdb_id || media.ww_id}-${i}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-muted-foreground w-6 text-right font-medium">{i + 1}.</span>
                    {media.poster ? (
                      <img
                        src={media.poster.startsWith("http") ? media.poster : `${TMDB_IMAGE_BASE}${media.poster}`}
                        alt={media.title}
                        className="w-10 h-14 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                        {media.media_type === "digital" ? (
                          <Download className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Film className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">{media.title}</p>
                      <Badge
                        variant="outline"
                        className={
                          media.media_type === "movie"
                            ? "text-blue-500 border-blue-500/30 text-xs"
                            : media.media_type === "tv"
                              ? "text-purple-500 border-purple-500/30 text-xs"
                              : media.media_type === "digital"
                                ? "text-yellow-500 border-yellow-500/30 text-xs"
                                : "text-gray-500 border-gray-500/30 text-xs"
                        }
                      >
                        {media.media_type === "movie"
                          ? "Film"
                          : media.media_type === "tv"
                            ? "Série"
                            : media.media_type === "digital"
                              ? "Digital"
                              : media.media_type}
                      </Badge>
                    </div>
                    <span className="text-orange-500 font-bold text-sm">{media.downloads.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucune donnee</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Top Referents
              </span>
              <Badge variant="outline" className="text-primary">
                {referrersTotal.toLocaleString()} vues
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {topReferrers.length > 0 ? (
                topReferrers.map((ref, i) => (
                  <div key={ref.referrer} className="flex items-center gap-3">
                    <span className="text-muted-foreground w-6 text-right font-medium">{i + 1}.</span>
                    <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <p className="flex-1 truncate text-foreground text-sm" title={ref.referrer}>
                      {ref.referrer}
                    </p>
                    <span className="text-primary font-bold text-sm">{ref.count.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucune donnee</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques en temps réel / utilisateurs en ligne */}
      {onlineStats && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                Utilisateurs en ligne
              </span>
              <Badge variant="outline" className="text-green-500 border-green-500">
                En temps réel
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-muted-foreground">5 dernières min</span>
                </div>
                <p className="text-3xl font-bold text-green-500">{onlineStats.usersOnline5min}</p>
                <p className="text-xs text-muted-foreground mt-1">utilisateurs actifs</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">15 dernières min</span>
                </div>
                <p className="text-3xl font-bold text-yellow-500">{onlineStats.usersOnline15min}</p>
                <p className="text-xs text-muted-foreground mt-1">utilisateurs actifs</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Dernière heure</span>
                </div>
                <p className="text-3xl font-bold text-blue-500">{onlineStats.usersOnline1hour}</p>
                <p className="text-xs text-muted-foreground mt-1">visiteurs uniques</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Pages actives */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Pages les plus actives (15 min)
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {onlineStats.activePages.length > 0 ? (
                    onlineStats.activePages.map((page, i) => (
                      <div key={page.ww_id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {i + 1}. {page.ww_id}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {page.count} vue{page.count > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Aucune activité récente</p>
                  )}
                </div>
              </div>

              {/* Visiteurs récents */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Visiteurs récents
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {onlineStats.recentVisitors.length > 0 ? (
                    onlineStats.recentVisitors.map((visitor, i) => (
                      <div key={`${visitor.ip_hash}-${i}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-muted-foreground font-mono text-xs">{visitor.ip_hash}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {visitor.media_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(visitor.viewed_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Aucun visiteur récent</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
