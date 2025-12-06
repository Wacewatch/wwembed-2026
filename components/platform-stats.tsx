"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Film, Tv, PlayCircle, Radio, Book, Music, Monitor, Gamepad2, Link, Download } from "lucide-react"

interface Stats {
  movies: number
  tvShows: number
  episodes: number
  liveTv: number
  ebooks: number
  music: number
  software: number
  games: number
  totalStreamingLinks: number
  totalDownloadLinks: number
}

export function PlatformStats() {
  const [stats, setStats] = useState<Stats>({
    movies: 0,
    tvShows: 0,
    episodes: 0,
    liveTv: 0,
    ebooks: 0,
    music: 0,
    software: 0,
    games: 0,
    totalStreamingLinks: 0,
    totalDownloadLinks: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const supabase = createClient()

        const [tmdbStatsRes, liveTvRes, ebooksRes, musicRes, softwareRes, gamesRes] = await Promise.all([
          fetch("/api/tmdb-stats").then((res) => res.json()),
          supabase
            .from("live_tv_channels")
            .select("id", { count: "exact", head: true })
            .eq("status", "approved")
            .eq("is_active", true),
          supabase
            .from("digital_content")
            .select("id", { count: "exact", head: true })
            .eq("content_type", "ebook")
            .eq("status", "approved"),
          supabase
            .from("digital_content")
            .select("id", { count: "exact", head: true })
            .eq("content_type", "music")
            .eq("status", "approved"),
          supabase
            .from("digital_content")
            .select("id", { count: "exact", head: true })
            .eq("content_type", "software")
            .eq("status", "approved"),
          supabase
            .from("digital_content")
            .select("id", { count: "exact", head: true })
            .eq("content_type", "game")
            .eq("status", "approved"),
        ])

        setStats({
          movies: tmdbStatsRes.movies || 0,
          tvShows: tmdbStatsRes.tvShows || 0,
          episodes: tmdbStatsRes.episodes || 0,
          liveTv: liveTvRes.count || 0,
          ebooks: ebooksRes.count || 0,
          music: musicRes.count || 0,
          software: softwareRes.count || 0,
          games: gamesRes.count || 0,
          totalStreamingLinks: tmdbStatsRes.totalStreamingLinks || 0,
          totalDownloadLinks: tmdbStatsRes.totalDownloadLinks || 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const mainStatItems = [
    {
      label: "Films",
      sublabel: "via TMDB",
      value: stats.movies,
      icon: Film,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Séries",
      sublabel: "via TMDB",
      value: stats.tvShows,
      icon: Tv,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Épisodes",
      sublabel: "via TMDB",
      value: stats.episodes,
      icon: PlayCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    { label: "Chaînes TV", value: stats.liveTv, icon: Radio, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Ebooks", value: stats.ebooks, icon: Book, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Musique", value: stats.music, icon: Music, color: "text-pink-500", bg: "bg-pink-500/10" },
    { label: "Logiciels", value: stats.software, icon: Monitor, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Jeux", value: stats.games, icon: Gamepad2, color: "text-orange-500", bg: "bg-orange-500/10" },
  ]

  const linkStatItems = [
    {
      label: "Liens Streaming",
      sublabel: "disponibles",
      value: stats.totalStreamingLinks,
      icon: Link,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Liens DDL",
      sublabel: "disponibles",
      value: stats.totalDownloadLinks,
      icon: Download,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full mx-auto mb-2" />
              <div className="h-6 bg-muted rounded w-12 mx-auto mb-1" />
              <div className="h-3 bg-muted rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full mx-auto mb-2" />
              <div className="h-6 bg-muted rounded w-12 mx-auto mb-1" />
              <div className="h-3 bg-muted rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {mainStatItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="bg-card border border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors"
            >
              <div className={`w-10 h-10 ${item.bg} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <p className={`text-xl font-bold ${item.color}`}>{item.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              {item.sublabel && <p className="text-[10px] text-muted-foreground/60">{item.sublabel}</p>}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {linkStatItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="bg-card border border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-center gap-3">
                <div className={`w-12 h-12 ${item.bg} rounded-full flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="text-left">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  {item.sublabel && <p className="text-xs text-muted-foreground/60">{item.sublabel}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
