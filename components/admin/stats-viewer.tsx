"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  Play,
  Download,
  Tv,
  Film,
  Loader2,
  Clock,
  Calendar,
  Globe,
  Activity,
  UserCheck,
} from "lucide-react"
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid, // Import CartesianGrid
  Legend, // Import Legend
} from "recharts"
import { ExternalLinksStats } from "./external-links-stats"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs" // Import Tabs

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
  users5min: number
  users15min: number
  uniqueVisitors1h: number
  uniqueVisitors24h: number
  activePages: {
    ww_id: string
    count: number
    title: string
    poster: string | null
    media_type?: string
    isLiveTV?: boolean
    isDigital?: boolean
    digitalType?: string
  }[]
  recentViews: {
    ip_hash: string | null
    viewed_at: string
    ww_id: string
    media_type: string | null
    title: string
    poster: string | null
    isLiveTV?: boolean
    isDigital?: boolean
    digitalType?: string
  }[]
}

// Interface for the aggregated stats to be used in the component
interface AggregatedStats {
  totalViews: number
  totalClicks: number
  streamingClicks: number
  downloadClicks: number
  adClicks: number
  uniqueVisitors: number
  avgViewsPerDay: number
  chartData: {
    date: string
    fullDate: string
    total: number
    streaming: number
    download: number
  }[]
  mediaTypeData: { name: string; value: number }[]
  topMedia: TopMedia[]
  referrerData: TopReferrer[]
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92"

export function StatsViewer() {
  const [period, setPeriod] = useState("7")
  const [stats, setStats] = useState<AggregatedStats | null>(null) // Use the new aggregated interface
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState("")
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null)
  const [onlineLoading, setOnlineLoading] = useState(true)

  // Dummy data for topMediaDownload and topReferrers to avoid undeclared variable errors
  const [topMediaDownload, setTopMediaDownload] = useState<TopMediaDownload[]>([])
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])

  useEffect(() => {
    loadStats()
    loadOnlineStats()
    const interval = setInterval(loadOnlineStats, 30000)
    return () => clearInterval(interval)
  }, [period])

  const loadOnlineStats = useCallback(async () => {
    setOnlineLoading(true)
    const supabase = createClient()

    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    try {
      // Count for 5 minutes
      const { count: count5min } = await supabase
        .from("embed_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", fiveMinAgo)

      // Count for 15 minutes
      const { count: count15min } = await supabase
        .from("embed_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", fifteenMinAgo)

      // Count for 1 hour
      const { count: count1hour } = await supabase
        .from("embed_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", oneHourAgo)

      // Count for 24 hours
      const { count: count24h } = await supabase
        .from("embed_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", twentyFourHoursAgo)

      // For unique IPs, we need a different approach - use a limited sample for estimation
      // or accept that we can't get exact unique counts without fetching all data
      // We'll use the count as an approximation since most views are unique

      // Fetch only the data needed for active pages (limited to 15 min, max 5000 rows)
      const { data: views15min } = await supabase
        .from("embed_views")
        .select("ww_id, tmdb_id, media_type")
        .gte("viewed_at", fifteenMinAgo)
        .limit(5000)

      // Get most active pages in last 15 min
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
          // Check if it's a live TV channel
          if (page.ww_id?.startsWith("ww-live-")) {
            const channelId = page.ww_id.replace("ww-live-", "")
            const { data: channel } = await supabase
              .from("live_tv_channels")
              .select("name, logo_url")
              .eq("id", channelId)
              .single()

            return {
              ...page,
              title: channel?.name || `Channel ${channelId}`,
              poster: channel?.logo_url || null,
              isLiveTV: true,
            }
          }

          // Check if it's digital content
          if (
            page.ww_id?.startsWith("ww-ebook-") ||
            page.ww_id?.startsWith("ww-music-") ||
            page.ww_id?.startsWith("ww-software-") ||
            page.ww_id?.startsWith("ww-soft-") ||
            page.ww_id?.startsWith("ww-game-")
          ) {
            const { data: digitalContent } = await supabase
              .from("digital_content")
              .select("title, cover_url, type")
              .eq("ww_id", page.ww_id)
              .single()

            return {
              ...page,
              title: digitalContent?.title || page.ww_id,
              poster: digitalContent?.cover_url || null,
              isDigital: true,
              digitalType: digitalContent?.type,
            }
          }

          // Try to get TMDB info for movies/TV
          if (page.tmdb_id && page.media_type) {
            try {
              const res = await fetch(`/api/tmdb/${page.media_type}/${page.tmdb_id}`)
              if (res.ok) {
                const data = await res.json()
                return {
                  ...page,
                  title: data.title || data.name || page.ww_id,
                  poster: data.poster || null,
                }
              }
            } catch (e) {
              // Ignore fetch errors
            }
          }

          return { ...page, title: page.ww_id, poster: null }
        }),
      )

      // Fetch recent views for timeline (limited)
      const { data: recentViewsList } = await supabase
        .from("embed_views")
        .select("ww_id, media_type, tmdb_id, viewed_at, ip_hash")
        .order("viewed_at", { ascending: false })
        .limit(50)

      const recentViewsWithTitles = await Promise.all(
        (recentViewsList || []).slice(0, 20).map(async (view: any) => {
          // Check if it's a live TV channel
          if (view.ww_id?.startsWith("ww-live-")) {
            const channelId = view.ww_id.replace("ww-live-", "")
            const { data: channel } = await supabase
              .from("live_tv_channels")
              .select("name, logo_url")
              .eq("id", channelId)
              .single()

            return {
              ...view,
              title: channel?.name || `Channel ${channelId}`,
              poster: channel?.logo_url || null,
              isLiveTV: true,
            }
          }

          // Check if it's digital content
          if (
            view.ww_id?.startsWith("ww-ebook-") ||
            view.ww_id?.startsWith("ww-music-") ||
            view.ww_id?.startsWith("ww-software-") ||
            view.ww_id?.startsWith("ww-soft-") ||
            view.ww_id?.startsWith("ww-game-")
          ) {
            const { data: digitalContent } = await supabase
              .from("digital_content")
              .select("title, cover_url, type")
              .eq("ww_id", view.ww_id)
              .single()

            return {
              ...view,
              title: digitalContent?.title || view.ww_id,
              poster: digitalContent?.cover_url || null,
              isDigital: true,
              digitalType: digitalContent?.type,
            }
          }

          // Try to get TMDB info
          if (view.tmdb_id && view.media_type) {
            try {
              const res = await fetch(`/api/tmdb/${view.media_type}/${view.tmdb_id}`)
              if (res.ok) {
                const data = await res.json()
                return {
                  ...view,
                  title: data.title || data.name || view.ww_id,
                  poster: data.poster || null,
                }
              }
            } catch (e) {
              // Ignore fetch errors
            }
          }

          return { ...view, title: view.ww_id, poster: null }
        }),
      )

      setOnlineStats({
        users5min: count5min || 0,
        users15min: count15min || 0,
        uniqueVisitors1h: count1hour || 0,
        uniqueVisitors24h: count24h || 0,
        activePages: activePagesWithTitles,
        recentViews: recentViewsWithTitles,
      })
    } catch (error) {
      console.error("[v0] Error loading online stats:", error)
    }

    setOnlineLoading(false)
  }, [])

  const loadStats = async () => {
    setLoading(true)
    setLoadingProgress("Chargement des statistiques...")
    const supabase = createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number.parseInt(period))
    const startDateStr = startDate.toISOString()

    try {
      // Get total views count
      const { count: totalViews } = await supabase
        .from("embed_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", startDateStr)

      // Get total clicks count
      const { count: totalClicks } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .gte("clicked_at", startDateStr)

      // Get streaming clicks count
      const { count: streamingClicks } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_type", "streaming")
        .gte("clicked_at", startDateStr)

      // Get download clicks count
      const { count: downloadClicks } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_type", "download")
        .gte("clicked_at", startDateStr)

      // Get ad clicks count
      const { count: adClicks } = await supabase
        .from("ad_clicks")
        .select("*", { count: "exact", head: true })
        .gte("clicked_at", startDateStr)

      // We fetch a limited sample and count unique IPs, then estimate
      const { data: uniqueIpSample } = await supabase
        .from("embed_views")
        .select("ip_hash")
        .gte("viewed_at", startDateStr)
        .limit(10000)

      const uniqueIps = new Set(uniqueIpSample?.map((v: any) => v.ip_hash).filter(Boolean))
      const uniqueVisitors = uniqueIps.size

      const periodDays = Number.parseInt(period)
      const avgViewsPerDay = totalViews ? Math.round(totalViews / periodDays) : 0

      // Fetch top media for downloads
      const { data: topMediaDownloadData } = await supabase
        .from("link_clicks")
        .select("link_type, media_type, tmdb_id, ww_id")
        .eq("link_type", "download")
        .gte("clicked_at", startDateStr)
        .limit(5000) // Limit to avoid performance issues

      const downloadCounts: Record<string, number> = {}
      const mediaInfoPromises: Promise<any>[] = []

      topMediaDownloadData?.forEach((click: any) => {
        if (click.ww_id) {
          downloadCounts[click.ww_id] = (downloadCounts[click.ww_id] || 0) + 1
          // Fetch media info only if not already fetched
          if (!mediaInfoPromises.some((p) => p.then((info) => info.ww_id === click.ww_id))) {
            mediaInfoPromises.push(
              (async () => {
                let title = click.ww_id
                let poster = null
                let media_type = click.media_type || "unknown"

                // Try to get TMDB info
                if (click.tmdb_id && click.media_type && ["movie", "tv"].includes(click.media_type)) {
                  try {
                    const res = await fetch(`/api/tmdb/${click.media_type}/${click.tmdb_id}`)
                    if (res.ok) {
                      const data = await res.json()
                      title = data.title || data.name || title
                      poster = data.poster || null
                    }
                  } catch (e) {
                    /* ignore */
                  }
                } else if (
                  click.ww_id?.startsWith("ww-ebook") ||
                  click.ww_id?.startsWith("ww-music") ||
                  click.ww_id?.startsWith("ww-software") ||
                  click.ww_id?.startsWith("ww-soft") ||
                  click.ww_id?.startsWith("ww-game")
                ) {
                  // Digital content
                  try {
                    const { data: digitalContent } = await supabase
                      .from("digital_content")
                      .select("title, cover_url, type")
                      .eq("ww_id", click.ww_id)
                      .single()
                    if (digitalContent) {
                      title = digitalContent.title || title
                      poster = digitalContent.cover_url || null
                      media_type = "digital"
                    }
                  } catch (e) {
                    /* ignore */
                  }
                }
                return { tmdb_id: click.tmdb_id, ww_id: click.ww_id, media_type: media_type, title, poster }
              })(),
            )
          }
        }
      })

      const mediaInfos = await Promise.all(mediaInfoPromises)

      const topMediaDownloads: TopMediaDownload[] = Object.entries(downloadCounts)
        .map(([ww_id, downloads]) => {
          const info = mediaInfos.find((mi) => mi.ww_id === ww_id)
          return {
            tmdb_id: info?.tmdb_id || null,
            ww_id: ww_id,
            media_type: info?.media_type || "unknown",
            title: info?.title,
            poster: info?.poster,
            downloads: downloads,
          }
        })
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 10)

      setTopMediaDownload(topMediaDownloads)

      // Fetch top referrers
      const { data: referrerData } = await supabase
        .from("embed_views")
        .select("referrer")
        .gte("viewed_at", startDateStr)
        .limit(5000)

      const referrerCounts: Record<string, number> = {}
      referrerData?.forEach((view: any) => {
        const referrer = view.referrer || "Direct / Unknown"
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1
      })

      const sortedReferrers = Object.entries(referrerCounts)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setTopReferrers(sortedReferrers)

      setLoadingProgress("Chargement des graphiques...")

      const { data: recentViews } = await supabase
        .from("embed_views")
        .select("viewed_at, media_type, embed_type, ww_id") // Added ww_id for potential future use or debugging
        .gte("viewed_at", startDateStr)
        .order("viewed_at", { ascending: false })
        .limit(2000)

      const { data: recentClicks } = await supabase
        .from("link_clicks")
        .select("clicked_at, link_type, media_type, ww_id") // Added ww_id
        .gte("clicked_at", startDateStr)
        .order("clicked_at", { ascending: false })
        .limit(2000)

      // Build viewsPerDay from limited data (approximation for charts)
      const viewsPerDay: Record<string, { total: number; streaming: number; download: number }> = {}

      // Generate all dates in the period
      const today = new Date()
      for (let i = Number.parseInt(period) - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateKey = d.toISOString().split("T")[0]
        viewsPerDay[dateKey] = { total: 0, streaming: 0, download: 0 }
      }

      recentViews?.forEach((view: any) => {
        const date = new Date(view.viewed_at).toISOString().split("T")[0]
        if (viewsPerDay[date]) {
          viewsPerDay[date].total++
          // Updated embed_type checks based on common usage
          if (view.embed_type === "streaming") {
            viewsPerDay[date].streaming++
          } else if (view.embed_type === "download") {
            viewsPerDay[date].download++
          }
        }
      })

      recentClicks?.forEach((click: any) => {
        const date = new Date(click.clicked_at).toISOString().split("T")[0]
        if (viewsPerDay[date]) {
          if (click.link_type === "streaming") {
            viewsPerDay[date].streaming++
          } else if (click.link_type === "download") {
            viewsPerDay[date].download++
          }
        }
      })

      // Count by media type from recent views
      const mediaTypeCounts: Record<string, number> = {}
      recentViews?.forEach((view: any) => {
        const mt = view.media_type || "unknown"
        mediaTypeCounts[mt] = (mediaTypeCounts[mt] || 0) + 1
      })

      // Build top media from recent views (approximate)
      const mediaCounts: Record<string, number> = {}
      recentViews?.forEach((view: any) => {
        if (view.ww_id) {
          mediaCounts[view.ww_id] = (mediaCounts[view.ww_id] || 0) + 1
        }
      })

      const chartData = Object.entries(viewsPerDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          fullDate: date,
          total: data.total,
          streaming: data.streaming,
          download: data.download,
        }))

      const mediaTypeData = Object.entries(mediaTypeCounts)
        .map(([type, count]) => ({
          name: type === "movie" ? "Films" : type === "tv" ? "Séries" : type === "live" ? "TV Live" : type,
          value: count,
        }))
        .sort((a, b) => b.value - a.count)
        .slice(0, 5)

      setStats({
        totalViews: totalViews || 0,
        totalClicks: totalClicks || 0,
        streamingClicks: streamingClicks || 0,
        downloadClicks: downloadClicks || 0,
        adClicks: adClicks || 0,
        uniqueVisitors: uniqueVisitors,
        avgViewsPerDay: avgViewsPerDay,
        chartData,
        mediaTypeData,
        topMedia: [],
        referrerData: [],
      })

      setLoadingProgress("")
    } catch (error) {
      console.error("[v0] Error loading stats:", error)
      setLoadingProgress("Erreur de chargement")
    }

    setLoading(false)
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

  const chartTotal = stats?.chartData.reduce((sum, day) => sum + day.total, 0) ?? 0
  const referrersTotal = stats?.referrerData.reduce((sum, ref) => sum + ref.count, 0) ?? 0
  const mediaTotal = stats?.topMedia.reduce((sum, m) => sum + m.views, 0) ?? 0
  const downloadTotal = topMediaDownload.reduce((sum, m) => sum + m.downloads, 0) ?? 0

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistiques Générales
          </TabsTrigger>
          <TabsTrigger value="external" className="gap-2">
            <Globe className="h-4 w-4" />
            Liens Externes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Keep all existing content here - online stats, period selector, cards, charts, etc. */}
          {/* ... existing code for general stats ... */}
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

          {stats && ( // Use stats instead of detailedStats
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Eye className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold text-primary">{stats.totalViews.toLocaleString()}</p>
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
                      <p className="text-2xl font-bold text-blue-500">{stats.totalClicks.toLocaleString()}</p>
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
                      <p className="text-2xl font-bold text-purple-500">{stats.adClicks.toLocaleString()}</p>
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
                      <p className="text-2xl font-bold text-green-500">{stats.uniqueVisitors.toLocaleString()}</p>
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
                      <p className="text-2xl font-bold text-orange-500">{stats.avgViewsPerDay.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Moy. vues/jour</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {stats && ( // Use stats instead of detailedStats
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Film className="w-5 h-5 text-primary" />
                  Repartition par type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {/* Updated to use stats.mediaTypeData */}
                  {stats.mediaTypeData.map((item) => (
                    <div key={item.name} className="text-center p-4 bg-muted/50 rounded-lg">
                      {item.name === "Films" && <Film className="w-8 h-8 mx-auto mb-2 text-blue-500" />}
                      {item.name === "Séries" && <Tv className="w-8 h-8 mx-auto mb-2 text-purple-500" />}
                      {item.name === "TV Live" && <Play className="w-8 h-8 mx-auto mb-2 text-red-500" />}
                      {/* Add an icon for "Streaming" if needed, but it's not directly in mediaTypeData */}
                      <p className="text-xl font-bold text-foreground">{item.value.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{item.name}</p>
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
              {stats?.chartData && stats.chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        interval={stats.chartData.length > 14 ? Math.floor(stats.chartData.length / 10) : 0}
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
                        formatter={(value: number, name: string) => {
                          // Adjust formatter based on the data keys
                          if (name === "total") return [`${value.toLocaleString()} vues`, "Vues"]
                          if (name === "streaming") return [`${value.toLocaleString()} streamings`, "Streaming"]
                          if (name === "download")
                            return [`${value.toLocaleString()} téléchargements`, "Téléchargements"]
                          return [value.toLocaleString(), name]
                        }}
                      />
                      <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} name="Vues" />
                      <Bar dataKey="streaming" fill="#fde047" radius={[4, 4, 0, 0]} name="Streaming" />
                      <Bar dataKey="download" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Downloads" />
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
            {/* Top Media (Views) - This section is commented out as topMedia is now empty */}
            {/* <Card className="bg-card border-border">
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
                  {stats?.topMedia.length > 0 ? (
                    stats.topMedia.map((media, i) => (
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
            </Card> */}

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
                  {/* This section remains as topReferrers is not updated in the changes */}
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-muted-foreground">5 dernières min</span>
                    </div>
                    <p className="text-3xl font-bold text-green-500">{onlineStats.users5min}</p>
                    <p className="text-xs text-muted-foreground mt-1">utilisateurs actifs</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">15 dernières min</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-500">{onlineStats.users15min}</p>
                    <p className="text-xs text-muted-foreground mt-1">utilisateurs actifs</p>
                  </div>
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <UserCheck className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Dernière heure</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-500">{onlineStats.uniqueVisitors1h}</p>
                    <p className="text-xs text-muted-foreground mt-1">visiteurs uniques</p>
                  </div>
                  <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-muted-foreground">24 dernières heures</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-500">{onlineStats.uniqueVisitors24h}</p>
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
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {onlineStats.activePages.length > 0 ? (
                        onlineStats.activePages.map((page, i) => (
                          <div key={page.ww_id} className="flex items-center gap-3 p-2 bg-background/50 rounded-lg">
                            <span className="text-muted-foreground w-5 text-right font-medium text-sm">{i + 1}.</span>
                            {page.poster ? (
                              <img
                                src={
                                  page.poster.startsWith("http")
                                    ? page.poster
                                    : `https://image.tmdb.org/t/p/w92${page.poster}`
                                }
                                alt={page.title}
                                className="w-8 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-8 h-12 bg-muted rounded flex items-center justify-center">
                                {page.media_type === "live" || page.ww_id?.includes("live") ? (
                                  <Tv className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <Film className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate text-sm">{page.title || page.ww_id}</p>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  page.media_type === "movie"
                                    ? "text-blue-400 border-blue-400/50"
                                    : page.media_type === "tv"
                                      ? "text-purple-400 border-purple-400/50"
                                      : "text-red-400 border-red-400/50"
                                }`}
                              >
                                {page.media_type === "movie" ? "Film" : page.media_type === "tv" ? "Série" : "TV Live"}
                              </Badge>
                            </div>
                            <Badge variant="secondary" className="text-primary font-bold">
                              {page.count}
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
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {onlineStats.recentViews.length > 0 ? (
                        onlineStats.recentViews.map((visitor, i) => (
                          <div
                            key={`${visitor.ip_hash}-${i}`}
                            className="flex items-center gap-3 p-2 bg-background/50 rounded-lg"
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            {visitor.poster ? (
                              <img
                                src={
                                  visitor.poster.startsWith("http")
                                    ? visitor.poster
                                    : `https://image.tmdb.org/t/p/w92${visitor.poster}`
                                }
                                alt={visitor.title}
                                className="w-8 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-8 h-12 bg-muted rounded flex items-center justify-center">
                                {visitor.media_type === "live" || visitor.ww_id?.includes("live") ? (
                                  <Tv className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <Film className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate text-sm">
                                {visitor.title || visitor.ww_id}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono text-xs">{visitor.ip_hash}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    visitor.media_type === "movie"
                                      ? "text-blue-400 border-blue-400/50"
                                      : visitor.media_type === "tv"
                                        ? "text-purple-400 border-purple-400/50"
                                        : "text-red-400 border-red-400/50"
                                  }`}
                                >
                                  {visitor.media_type === "movie"
                                    ? "Film"
                                    : visitor.media_type === "tv"
                                      ? "Série"
                                      : "TV Live"}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(visitor.viewed_at).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
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
        </TabsContent>

        <TabsContent value="external">
          <ExternalLinksStats />
        </TabsContent>
      </Tabs>
    </div>
  )
}
