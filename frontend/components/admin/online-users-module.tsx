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
    // Initial full load (with TMDB-enriched lists).
    loadOnlineStats()
    // Slower poll for the heavier enriched payload (titles, posters).
    const poll = setInterval(loadOnlineStats, 60_000)

    // SSE stream: live counters every 10 s. Falls back gracefully to the
    // polled values if the stream errors out.
    let es: EventSource | null = null
    try {
      es = new EventSource("/api/admin/online-stream", { withCredentials: true })
      es.addEventListener("online", (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data)
          setOnlineStats((prev) =>
            prev
              ? {
                  ...prev,
                  usersOnline5min: data.online5min ?? prev.usersOnline5min,
                  usersOnline15min: data.online15min ?? prev.usersOnline15min,
                  usersOnline1hour: data.online1hour ?? prev.usersOnline1hour,
                  usersOnline24h: data.online24h ?? prev.usersOnline24h,
                }
              : prev
          )
        } catch {
          /* ignore malformed event */
        }
      })
      es.onerror = () => {
        // Browser auto-reconnects with exponential backoff. Nothing to do.
      }
    } catch {
      // EventSource not available (very old browser) — falls back to poll.
    }

    return () => {
      clearInterval(poll)
      es?.close()
    }
  }, [])

  const loadOnlineStats = async () => {
    try {
      // Use the unified server-side stats endpoint — it already enriches
      // digital (ebook/music/soft/game), live channels and TMDB titles.
      const res = await fetch("/api/admin/stats", { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      const o = data?.online || {}
      setOnlineStats({
        usersOnline5min: o.online5min || 0,
        usersOnline15min: o.online15min || 0,
        usersOnline1hour: o.online1hour || 0,
        usersOnline24h: o.online24h || 0,
        activePages: (o.activePages || []).map((p: any) => ({
          ww_id: p.ww_id,
          count: p.count,
          title: p.title || p.ww_id,
          poster: p.poster || null,
          media_type: p.media_type,
        })),
        recentVisitors: (o.recentVisitors || []).map((v: any) => ({
          ip_hash: v.ip_hash || "Anonyme",
          viewed_at: v.viewed_at,
          ww_id: v.ww_id,
          media_type: v.media_type || "N/A",
          title: v.title || v.ww_id,
          poster: v.poster || null,
        })),
      })
    } catch (error) {
      console.error("Error loading online stats:", error)
    }
  }

  if (!onlineStats) {
    return null
  }

  return (
    <Card className="admin-card border-0">
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
                              : page.media_type === "ebook"
                                ? "text-amber-400 border-amber-400/50"
                                : page.media_type === "music"
                                  ? "text-pink-400 border-pink-400/50"
                                  : page.media_type === "soft" || page.media_type === "software"
                                    ? "text-cyan-400 border-cyan-400/50"
                                    : page.media_type === "game"
                                      ? "text-emerald-400 border-emerald-400/50"
                                      : page.media_type === "live"
                                        ? "text-red-400 border-red-400/50"
                                        : "text-muted-foreground border-muted"
                        }`}
                      >
                        {page.media_type === "movie"
                          ? "Film"
                          : page.media_type === "tv"
                            ? "Série"
                            : page.media_type === "live"
                              ? "TV Live"
                              : page.media_type === "ebook"
                                ? "Ebook"
                                : page.media_type === "music"
                                  ? "Musique"
                                  : page.media_type === "soft" || page.media_type === "software"
                                    ? "Logiciel"
                                    : page.media_type === "game"
                                      ? "Jeu"
                                      : page.media_type || "?"}
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
