"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Eye, MousePointer, TrendingUp, Users, Film, Tv, Play, Globe, Calendar, BarChart3 } from "lucide-react"

interface ViewsByDay {
  date: string
  count: number
}

interface TopMedia {
  tmdb_id: number | null
  media_type: string
  views: number
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

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92"

export function StatsViewer() {
  const [period, setPeriod] = useState("7")
  const [viewsByDay, setViewsByDay] = useState<ViewsByDay[]>([])
  const [topMedia, setTopMedia] = useState<TopMedia[]>([])
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [period])

  const loadStats = async () => {
    setLoading(true)
    const supabase = createClient()
    const daysAgo = Number.parseInt(period)
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

    const { data: views } = await supabase
      .from("embed_views")
      .select("viewed_at, tmdb_id, media_type, referrer, ww_id, user_agent, embed_type")
      .gte("viewed_at", startDate)

    const { data: clicks } = await supabase.from("link_clicks").select("*").gte("clicked_at", startDate)

    const { data: adClicks } = await supabase.from("ad_clicks").select("*").gte("clicked_at", startDate)

    const byDay: Record<string, number> = {}
    const mediaCount: Record<string, { tmdb_id: number | null; media_type: string; views: number; ww_id?: string }> = {}
    const refCount: Record<string, number> = {}
    const typeCount: Record<string, number> = { movie: 0, tv: 0, live: 0 }
    const uniqueIps = new Set<string>()
    ;(views || []).forEach((v) => {
      const date = new Date(v.viewed_at).toISOString().split("T")[0]
      byDay[date] = (byDay[date] || 0) + 1

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

      if (isLive) {
        typeCount.live++
      } else if (v.media_type === "movie") {
        typeCount.movie++
      } else if (v.media_type === "tv") {
        typeCount.tv++
      }

      if (v.user_agent) {
        uniqueIps.add(v.user_agent.substring(0, 50))
      }
    })

    setViewsByDay(
      Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    )

    const topMediaList = Object.values(mediaCount)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    const topMediaWithDetails: TopMedia[] = await Promise.all(
      topMediaList.map(async (m) => {
        if (m.media_type === "live" && m.ww_id) {
          const channelId = m.ww_id.replace(/^ww-live-/i, "")
          const { data: channel } = await supabase
            .from("live_tv_channels")
            .select("channel_name, channel_logo")
            .or(`id.eq.${channelId},id.ilike.${channelId}%`)
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
                poster: data.poster_path ? TMDB_IMAGE_BASE + data.poster_path : undefined,
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

    setTopReferrers(
      Object.entries(refCount)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    )

    const totalViews = views?.length || 0
    setDetailedStats({
      totalViews,
      totalClicks: clicks?.length || 0,
      totalAdClicks: adClicks?.length || 0,
      uniqueVisitors: uniqueIps.size,
      avgViewsPerDay: totalViews / daysAgo,
      topCountries: [],
      viewsByType: [
        { type: "Films", count: typeCount.movie },
        { type: "Series", count: typeCount.tv },
        { type: "TV Live", count: typeCount.live },
      ],
      recentActivity: (views || []).slice(0, 5).map((v) => ({
        action: "Vue",
        timestamp: v.viewed_at,
        details: `${v.media_type} #${v.tmdb_id || v.ww_id}`,
      })),
    })

    setLoading(false)
  }

  const maxViews = Math.max(...viewsByDay.map((v) => v.count), 1)

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement des statistiques...</div>
  }

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
                  <p className="text-2xl font-bold text-orange-500">{detailedStats.avgViewsPerDay.toFixed(0)}</p>
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Vues par jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewsByDay.length > 0 ? (
            <div className="flex items-end gap-1 h-48">
              {viewsByDay.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground mb-1">{day.count}</span>
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t transition-all hover:from-primary/80"
                    style={{ height: `${(day.count / maxViews) * 100}%`, minHeight: "4px" }}
                    title={`${day.date}: ${day.count} vues`}
                  />
                  <span className="text-xs text-muted-foreground transform -rotate-45 origin-left whitespace-nowrap">
                    {day.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune donnee disponible</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              Top Medias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMedia.length > 0 ? (
              <div className="space-y-2">
                {topMedia.map((m, i) => (
                  <div
                    key={`${m.media_type}-${m.tmdb_id || m.ww_id}`}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6 font-bold">{i + 1}.</span>
                      {m.poster ? (
                        <img
                          src={m.poster || "/placeholder.svg"}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                          {m.media_type === "movie" ? (
                            <Film className="w-5 h-5 text-muted-foreground" />
                          ) : m.media_type === "live" ? (
                            <Play className="w-5 h-5 text-red-500" />
                          ) : (
                            <Tv className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{m.title}</p>
                        <Badge
                          variant={
                            m.media_type === "movie" ? "default" : m.media_type === "live" ? "destructive" : "secondary"
                          }
                          className="text-xs"
                        >
                          {m.media_type === "movie" ? "Film" : m.media_type === "tv" ? "Serie" : "TV Live"}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-primary font-semibold">{m.views} vues</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aucune donnee</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Top Referents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topReferrers.length > 0 ? (
              <div className="space-y-2">
                {topReferrers.map((r, i) => (
                  <div
                    key={r.referrer}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6 font-bold">{i + 1}.</span>
                      <span className="font-medium text-foreground truncate max-w-[200px]" title={r.referrer}>
                        {r.referrer}
                      </span>
                    </div>
                    <span className="text-primary font-semibold">{r.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aucune donnee</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
