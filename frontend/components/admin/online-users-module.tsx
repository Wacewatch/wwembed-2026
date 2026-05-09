"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, UserCheck, Clock, Calendar, Play, Users, Tv, Film } from "lucide-react"

interface OnlineStats {
  usersOnline5min: number
  usersOnline15min: number
  usersOnline1hour: number
  usersOnline24h: number
  activePages: {
    ww_id: string
    count: number
    title: string
    poster: string | null
    media_type?: string
  }[]
  recentVisitors: {
    ip_hash: string
    viewed_at: string
    ww_id: string
    media_type: string
    title: string
    poster: string | null
  }[]
}

export function OnlineUsersModule() {
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null)

  useEffect(() => {
    loadOnlineStats()
    const interval = setInterval(loadOnlineStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadOnlineStats = async () => {
    try {
      const supabase = createClient()
      const now = new Date()
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

      const fetchAllViews24h = async () => {
        const pageSize = 1000
        let allData: any[] = []
        let from = 0
        let hasMore = true

        while (hasMore) {
          const { data, error } = await supabase
            .from("embed_views")
            .select("ip_hash, viewed_at, ww_id, media_type, tmdb_id")
            .gte("viewed_at", twentyFourHoursAgo)
            .order("viewed_at", { ascending: false })
            .range(from, from + pageSize - 1)

          if (error) {
            console.error("Error fetching views:", error)
            break
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data]
            from += pageSize
            hasMore = data.length === pageSize
          } else {
            hasMore = false
          }
        }

        return allData
      }

      const recentViews = await fetchAllViews24h()

      const views5min = recentViews?.filter((v: any) => new Date(v.viewed_at) >= new Date(fiveMinAgo)) || []
      const views15min = recentViews?.filter((v: any) => new Date(v.viewed_at) >= new Date(fifteenMinAgo)) || []
      const views1hour = recentViews?.filter((v: any) => new Date(v.viewed_at) >= new Date(oneHourAgo)) || []

      const uniqueIps5min =
        new Set(views5min.map((v: any) => v.ip_hash).filter((ip: any) => ip != null)).size || views5min.length

      const uniqueIps15min =
        new Set(views15min.map((v: any) => v.ip_hash).filter((ip: any) => ip != null)).size || views15min.length

      const uniqueIps1hour =
        new Set(views1hour.map((v: any) => v.ip_hash).filter((ip: any) => ip != null)).size || views1hour.length

      const uniqueIps24h =
        new Set(recentViews?.map((v: any) => v.ip_hash).filter((ip: any) => ip != null)).size ||
        recentViews?.length ||
        0

      const pageCount: Record<string, { count: number; tmdb_id?: number; media_type?: string }> = {}
      views15min.forEach((v: any) => {
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
          if (page.ww_id?.startsWith("ww-live-")) {
            const channelId = page.ww_id.replace("ww-live-", "")
            const { data: channel } = await supabase
              .from("live_tv_channels")
              .select("channel_name, channel_logo")
              .eq("id", channelId)
              .single()
            return {
              ...page,
              title: channel?.channel_name || page.ww_id,
              poster: channel?.channel_logo || null,
            }
          }

          if (page.tmdb_id && page.media_type && (page.media_type === "movie" || page.media_type === "tv")) {
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
              // Ignore
            }
          }

          return { ...page, title: page.ww_id, poster: null }
        }),
      )

      const seenKeys = new Set<string>()
      const recentVisitorsRaw =
        views1hour
          ?.sort((a: any, b: any) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())
          .filter((v: any) => {
            const uniqueKey = v.ww_id || `${v.viewed_at}`
            if (seenKeys.has(uniqueKey)) return false
            seenKeys.add(uniqueKey)
            return true
          })
          .slice(0, 10) || []

      const recentVisitors = await Promise.all(
        recentVisitorsRaw.map(async (v: any) => {
          let title = v.ww_id || "N/A"
          let poster = null

          if (v.ww_id?.startsWith("ww-live-")) {
            const channelId = v.ww_id.replace("ww-live-", "")
            const { data: channel } = await supabase
              .from("live_tv_channels")
              .select("channel_name, channel_logo")
              .eq("id", channelId)
              .single()
            title = channel?.channel_name || v.ww_id
            poster = channel?.channel_logo || null
          } else if (v.tmdb_id && v.media_type && (v.media_type === "movie" || v.media_type === "tv")) {
            try {
              const res = await fetch(`/api/tmdb/${v.media_type}/${v.tmdb_id}`)
              if (res.ok) {
                const data = await res.json()
                title = data.title || data.name || v.ww_id
                poster = data.poster || null
              }
            } catch (e) {
              // Ignore
            }
          }

          return {
            ip_hash: v.ip_hash ? v.ip_hash.substring(0, 8) + "..." : "Anonyme",
            viewed_at: v.viewed_at,
            ww_id: v.ww_id || "N/A",
            media_type: v.media_type || "N/A",
            title,
            poster,
          }
        }),
      )

      setOnlineStats({
        usersOnline5min: uniqueIps5min,
        usersOnline15min: uniqueIps15min,
        usersOnline1hour: uniqueIps1hour,
        usersOnline24h: uniqueIps24h,
        activePages: activePagesWithTitles,
        recentVisitors,
      })
    } catch (error) {
      console.error("Error loading online stats:", error)
    }
  }

  if (!onlineStats) {
    return null
  }

  return (
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
          <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">24 dernières heures</span>
            </div>
            <p className="text-3xl font-bold text-purple-500">{onlineStats.usersOnline24h}</p>
            <p className="text-xs text-muted-foreground mt-1">visiteurs uniques</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
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
                          page.poster.startsWith("http") ? page.poster : `https://image.tmdb.org/t/p/w92${page.poster}`
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

          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Visiteurs récents
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {onlineStats.recentVisitors.length > 0 ? (
                onlineStats.recentVisitors.map((visitor, i) => (
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
                      <p className="font-medium text-foreground truncate text-sm">{visitor.title || visitor.ww_id}</p>
                      <span className="text-muted-foreground font-mono text-xs">{visitor.ip_hash}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(visitor.viewed_at).toLocaleTimeString("fr-FR")}
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
  )
}
