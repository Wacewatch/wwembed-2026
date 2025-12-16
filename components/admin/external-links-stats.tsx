"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Download, TrendingUp, Server, Film, Tv, Book, Loader2 } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts"

interface ExternalClickStats {
  totalClicks: number
  clicksByProvider: { provider: string; count: number }[]
  clicksByHost: { host: string; count: number }[]
  clicksByQuality: { quality: string; count: number }[]
  clicksByMediaType: { type: string; count: number }[]
  clicksByDay: { date: string; count: number }[]
  topMedia: { wwId: string; title: string; poster?: string; mediaType: string; clicks: number }[]
}

const COLORS = ["#0d9488", "#8b5cf6", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#ec4899", "#6366f1"]

export function ExternalLinksStats() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("7")
  const [stats, setStats] = useState<ExternalClickStats | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  useEffect(() => {
    loadStats()
  }, [period])

  const loadStats = async () => {
    setLoading(true)
    setDebugInfo("")
    const supabase = createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number.parseInt(period))
    const startDateStr = startDate.toISOString()

    try {
      const { data: allClicks, count: totalAllClicks } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact" })
        .gte("clicked_at", startDateStr)
        .limit(10)

      console.log("[v0] All link_clicks sample:", allClicks)
      console.log("[v0] Total link_clicks count:", totalAllClicks)

      const { data: externalByFlag, count: countByFlag } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact" })
        .eq("is_external", true)
        .gte("clicked_at", startDateStr)
        .limit(10)

      console.log("[v0] External clicks (is_external=true):", countByFlag, externalByFlag)

      const { data: externalByType, count: countByType } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact" })
        .eq("link_type", "external")
        .gte("clicked_at", startDateStr)
        .limit(10)

      console.log("[v0] External clicks (link_type=external):", countByType, externalByType)

      let externalClicks: any[] = []
      let totalExternal = 0

      if ((countByFlag || 0) > 0) {
        const { data } = await supabase
          .from("link_clicks")
          .select("*")
          .eq("is_external", true)
          .gte("clicked_at", startDateStr)
          .order("clicked_at", { ascending: false })
          .limit(5000)
        externalClicks = data || []
        totalExternal = countByFlag || 0
      } else if ((countByType || 0) > 0) {
        const { data } = await supabase
          .from("link_clicks")
          .select("*")
          .eq("link_type", "external")
          .gte("clicked_at", startDateStr)
          .order("clicked_at", { ascending: false })
          .limit(5000)
        externalClicks = data || []
        totalExternal = countByType || 0
      }

      setDebugInfo(
        `Total clics: ${totalAllClicks || 0}, External (is_external): ${countByFlag || 0}, External (link_type): ${countByType || 0}`,
      )

      // Process clicks by provider
      const providerCount: Record<string, number> = {}
      const hostCount: Record<string, number> = {}
      const qualityCount: Record<string, number> = {}
      const mediaTypeCount: Record<string, number> = {}
      const dayCount: Record<string, number> = {}
      const mediaCount: Record<string, { wwId: string; tmdbId: number; mediaType: string; clicks: number }> = {}

      externalClicks.forEach((click: any) => {
        // Provider
        const provider = click.provider || "Inconnu"
        providerCount[provider] = (providerCount[provider] || 0) + 1

        // Host
        const host = click.host_name || "Inconnu"
        hostCount[host] = (hostCount[host] || 0) + 1

        // Quality
        const quality = click.quality || "N/A"
        qualityCount[quality] = (qualityCount[quality] || 0) + 1

        // Media type
        const mediaType = click.media_type || "unknown"
        mediaTypeCount[mediaType] = (mediaTypeCount[mediaType] || 0) + 1

        // Day
        const day = new Date(click.clicked_at).toISOString().split("T")[0]
        dayCount[day] = (dayCount[day] || 0) + 1

        // Top media
        if (click.ww_id) {
          if (!mediaCount[click.ww_id]) {
            mediaCount[click.ww_id] = {
              wwId: click.ww_id,
              tmdbId: click.tmdb_id,
              mediaType: click.media_type,
              clicks: 0,
            }
          }
          mediaCount[click.ww_id].clicks++
        }
      })

      // Generate all dates in period for chart
      const today = new Date()
      const allDates: string[] = []
      for (let i = Number.parseInt(period) - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        allDates.push(d.toISOString().split("T")[0])
      }

      const clicksByDay = allDates.map((date) => ({
        date: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        count: dayCount[date] || 0,
      }))

      const clicksByProvider = Object.entries(providerCount)
        .map(([provider, count]) => ({ provider, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const clicksByHost = Object.entries(hostCount)
        .map(([host, count]) => ({ host, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const clicksByQuality = Object.entries(qualityCount)
        .map(([quality, count]) => ({ quality, count }))
        .sort((a, b) => b.count - a.count)

      const clicksByMediaType = Object.entries(mediaTypeCount).map(([type, count]) => ({
        type: type === "movie" ? "Film" : type === "tv" ? "Série" : type === "digital" ? "Digital" : type,
        count,
      }))

      // Fetch titles for top media
      const topMediaItems = Object.values(mediaCount)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)

      const topMedia = await Promise.all(
        topMediaItems.map(async (item) => {
          let title = item.wwId
          let poster: string | undefined

          if (item.tmdbId && item.mediaType) {
            try {
              const res = await fetch(`/api/media/${item.mediaType}/${item.tmdbId}`)
              if (res.ok) {
                const data = await res.json()
                title = data.title || data.name || item.wwId
                poster = data.poster_path ? `https://image.tmdb.org/t/p/w92${data.poster_path}` : undefined
              }
            } catch (e) {
              // Ignore error
            }
          }

          return {
            wwId: item.wwId,
            title,
            poster,
            mediaType: item.mediaType,
            clicks: item.clicks,
          }
        }),
      )

      setStats({
        totalClicks: totalExternal,
        clicksByProvider,
        clicksByHost,
        clicksByQuality,
        clicksByMediaType,
        clicksByDay,
        topMedia,
      })
    } catch (error) {
      console.error("[v0] Error loading external stats:", error)
      setDebugInfo(`Erreur: ${error}`)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Statistiques Liens Externes
          </h2>
          <p className="text-sm text-muted-foreground">
            Clics sur les liens externes (Movix API) pour films, séries et digital
          </p>
          {debugInfo && <p className="text-xs text-yellow-500 mt-1">{debugInfo}</p>}
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="14">14 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
            <SelectItem value="90">90 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Total Clicks Card */}
      <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-500/20">
              <Download className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clics Externes</p>
              <p className="text-3xl font-bold text-teal-400">{stats?.totalClicks || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clicks by Day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Clics par Jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.clicksByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [value, "Clics"]} />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Clicks by Media Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Film className="h-4 w-4" />
              Par Type de Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.clicksByMediaType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ type, count }) => `${type}: ${count}`}
                >
                  {stats?.clicksByMediaType.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider & Host Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" />
              Top Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.clicksByProvider.map((item, idx) => (
                <div key={item.provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                    <span className="font-medium">{item.provider}</span>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
              {stats?.clicksByProvider.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">Aucune donnée</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Hosts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Top Hébergeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.clicksByHost.map((item, idx) => (
                <div key={item.host} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                    <span className="font-medium truncate max-w-[200px]">{item.host}</span>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
              {stats?.clicksByHost.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">Aucune donnée</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Clics par Qualité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats?.clicksByQuality.map((item) => (
              <Badge key={item.quality} variant="outline" className="text-sm py-1 px-3">
                {item.quality}: <span className="font-bold ml-1">{item.count}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Media */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Médias (Liens Externes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.topMedia.map((item, idx) => (
              <div key={item.wwId} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-4">{idx + 1}</span>
                {item.poster ? (
                  <img
                    src={item.poster || "/placeholder.svg"}
                    alt={item.title}
                    className="w-10 h-14 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-muted flex items-center justify-center">
                    {item.mediaType === "movie" ? (
                      <Film className="h-4 w-4 text-muted-foreground" />
                    ) : item.mediaType === "tv" ? (
                      <Tv className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Book className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.wwId}</p>
                </div>
                <Badge className="bg-teal-500/20 text-teal-500">{item.clicks} clics</Badge>
              </div>
            ))}
            {stats?.topMedia.length === 0 && <p className="text-sm text-muted-foreground text-center">Aucune donnée</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
