"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Sparkles,
  Megaphone,
} from "lucide-react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area } from "recharts"
import { ExternalLinksStats } from "./external-links-stats"
import { InternalDownloadsStats } from "./internal-downloads-stats"

type StatsResponse = {
  period: number
  generated_at: string
  detailed: {
    totalViews: number
    totalStreamingViews: number
    totalClicks: number
    totalAdClicks: number
    uniqueVisitors: number
    avgViewsPerDay: number
    viewsByType: { type: string; count: number }[]
  }
  viewsByDay: {
    date: string
    count: number
    streamingCount: number
    downloadCount: number
    formattedDate: string
  }[]
  topMedia: {
    tmdb_id: number | null
    media_type: string
    ww_id?: string
    title: string
    poster: string | null
    views: number
  }[]
  topMediaDownload: {
    tmdb_id: number | null
    media_type: string
    ww_id?: string
    title: string
    poster: string | null
    downloads: number
  }[]
  topReferers: { referrer: string; count: number }[]
  online: {
    online5min: number
    online15min: number
    online1hour: number
    online24h: number
    activePages: { ww_id: string; count: number; media_type: string; title: string; poster: string | null }[]
    recentVisitors: {
      ip_hash: string
      viewed_at: string
      ww_id: string
      media_type: string
      title: string
      poster: string | null
    }[]
  }
  external?: any
  internal?: any
}

export function StatsViewer() {
  const [period, setPeriod] = useState("7")
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const r = await fetch(`/api/admin/stats?period=${period}`, { credentials: "include", cache: "no-store" })
        if (!r.ok) throw new Error("forbidden")
        const j = await r.json()
        if (active) setData(j)
      } catch (e) {
        console.error("Stats load error:", e)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    const id = setInterval(() => load(true), 30000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [period])

  if (loading || !data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p>Chargement des statistiques...</p>
      </div>
    )
  }

  const d = data.detailed

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="glass-subtle border border-white/5 p-1.5 rounded-2xl h-auto gap-1">
          <TabsTrigger
            value="general"
            className="gap-2 px-4 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20"
          >
            <BarChart3 className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger
            value="external"
            className="gap-2 px-4 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20"
          >
            <Globe className="h-4 w-4" />
            Liens Externes
          </TabsTrigger>
          <TabsTrigger
            value="internal"
            className="gap-2 px-4 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20"
            data-testid="stats-tab-internal"
          >
            <Download className="h-4 w-4" />
            Téléchargements Internes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Header + period */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Statistiques détaillées
              <Badge variant="outline" className="ml-2 border-primary/30 text-primary">
                <Sparkles className="w-3 h-3 mr-1" /> auto-refresh 30s
              </Badge>
            </h2>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44 glass-subtle border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="14">14 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
                <SelectItem value="365">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Big summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <Tile icon={Eye} label="Vues totales" value={d.totalViews} accent="oklch(0.65 0.22 295)" />
            <Tile icon={MousePointer} label="Clics liens" value={d.totalClicks} accent="oklch(0.7 0.18 220)" />
            <Tile icon={Megaphone} label="Clics pubs" value={d.totalAdClicks} accent="oklch(0.65 0.24 350)" />
            <Tile icon={Users} label="Visiteurs uniques" value={d.uniqueVisitors} accent="oklch(0.7 0.2 145)" />
            <Tile
              icon={TrendingUp}
              label="Moy. vues/jour"
              value={Math.round(d.avgViewsPerDay)}
              accent="oklch(0.74 0.2 50)"
            />
          </div>

          {/* Type breakdown */}
          <Card className="glass-strong border-white/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" /> Répartition par type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {d.viewsByType.map((item) => (
                  <div key={item.type} className="glass-subtle rounded-xl p-4 text-center border border-white/5">
                    {item.type === "Films" && <Film className="w-7 h-7 mx-auto mb-2 text-blue-400" />}
                    {item.type === "Séries" && <Tv className="w-7 h-7 mx-auto mb-2 text-purple-400" />}
                    {item.type === "TV Live" && <Play className="w-7 h-7 mx-auto mb-2 text-red-400" />}
                    {item.type === "Streaming" && <Play className="w-7 h-7 mx-auto mb-2 text-amber-400" />}
                    <p className="text-2xl font-black tabular-nums">{item.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="glass-strong border-white/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Activité quotidienne
                </span>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {data.viewsByDay.reduce((s, d) => s + d.count, 0).toLocaleString()} vues / {period}j
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.viewsByDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grdViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.78 0.16 195)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="oklch(0.78 0.16 195)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="grdDl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.74 0.2 50)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="oklch(0.74 0.2 50)" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="#6b7280"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      interval={data.viewsByDay.length > 14 ? Math.floor(data.viewsByDay.length / 10) : 0}
                    />
                    <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(20,30,50,0.85)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        backdropFilter: "blur(8px)",
                      }}
                      labelStyle={{ color: "#9ca3af" }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="oklch(0.78 0.16 195)"
                      strokeWidth={2}
                      fill="url(#grdViews)"
                      name="Vues"
                    />
                    <Area
                      type="monotone"
                      dataKey="downloadCount"
                      stroke="oklch(0.74 0.2 50)"
                      strokeWidth={2}
                      fill="url(#grdDl)"
                      name="Clics"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Three-column: top media views / top downloads / top referers */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="glass-strong border-white/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" /> Top médias (vues)
                  </span>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {data.topMedia.reduce((s, x) => s + x.views, 0).toLocaleString()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MediaList items={data.topMedia.map((m) => ({ ...m, score: m.views }))} />
              </CardContent>
            </Card>

            <Card className="glass-strong border-white/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-orange-400" /> Top clics download
                  </span>
                  <Badge variant="outline" className="border-orange-400/30 text-orange-400">
                    {data.topMediaDownload.reduce((s, x) => s + x.downloads, 0).toLocaleString()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MediaList items={data.topMediaDownload.map((m) => ({ ...m, score: m.downloads }))} variant="download" />
              </CardContent>
            </Card>

            <Card className="glass-strong border-white/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> Top référents
                  </span>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {data.topReferers.reduce((s, r) => s + r.count, 0).toLocaleString()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
                  {data.topReferers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucune donnée</p>
                  ) : (
                    data.topReferers.map((r, i) => {
                      const max = data.topReferers[0]?.count || 1
                      return (
                        <div key={r.referrer + i} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground w-6 text-right tabular-nums text-xs">{i + 1}.</span>
                          <span className="flex-1 truncate text-foreground" title={r.referrer}>
                            {r.referrer}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                              style={{ width: `${(r.count / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-primary font-bold tabular-nums w-12 text-right">{r.count.toLocaleString()}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="external">
          <ExternalLinksStats period={period} setPeriod={setPeriod} data={data.external} />
        </TabsContent>

        <TabsContent value="internal">
          <InternalDownloadsStats period={period} setPeriod={setPeriod} data={(data as any).internal || { totalClicks: 0, totalClicksAllTime: 0, byDay: [], topLinks: [], topUploaders: [], byQuality: [], byMediaType: [], byLinkType: [] }} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Tile({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl glass border border-white/5 p-5">
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: accent }} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</p>
          <p className="text-3xl font-black mt-2 tabular-nums">{(value || 0).toLocaleString()}</p>
        </div>
        <div className="w-11 h-11 rounded-xl grid place-items-center ring-1 ring-white/10" style={{ background: accent }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

function RealTimeTile({ color, Icon, label, v, sub }: any) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
    amber: "text-amber-400 border-amber-400/30 bg-amber-400/5",
    cyan: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
    violet: "text-violet-400 border-violet-400/30 bg-violet-400/5",
  }
  return (
    <div className={`text-center p-4 rounded-xl border ${colorMap[color]}`}>
      <div className="flex items-center justify-center gap-2 mb-2 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> <span>{label}</span>
      </div>
      <p className="text-3xl font-black tabular-nums">{v.toLocaleString()}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}

function MediaList({ items, variant = "view" }: { items: any[]; variant?: "view" | "download" }) {
  return (
    <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée</p>
      ) : (
        items.map((m: any, i: number) => (
          <a
            key={`${m.ww_id || m.tmdb_id}-${i}`}
            href={m.ww_id ? `/embed/${m.ww_id}/stats` : "#"}
            target={m.ww_id ? "_blank" : undefined}
            rel="noreferrer"
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <span className="text-muted-foreground w-6 text-right tabular-nums text-xs">{i + 1}.</span>
            {m.poster ? (
              <img src={m.poster} alt={m.title} className="w-9 h-12 object-cover rounded ring-1 ring-white/5" loading="lazy" />
            ) : (
              <div className="w-9 h-12 bg-white/5 rounded grid place-items-center ring-1 ring-white/5">
                {m.media_type === "live" ? (
                  <Tv className="w-4 h-4 text-muted-foreground" />
                ) : m.media_type === "digital" ? (
                  <Download className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Film className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{m.title}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {m.media_type === "movie" ? "Film" : m.media_type === "tv" ? "Série" : m.media_type}
              </p>
            </div>
            <span className={`text-sm font-bold tabular-nums ${variant === "download" ? "text-orange-400" : "text-primary"}`}>
              {(m.score ?? 0).toLocaleString()}
            </span>
          </a>
        ))
      )}
    </div>
  )
}

function PageRow({ index, title, poster, type, count }: any) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background/40 rounded-lg">
      <span className="text-muted-foreground w-5 text-right tabular-nums text-xs">{index}.</span>
      {poster ? (
        <img src={poster} alt={title} className="w-7 h-10 object-cover rounded" loading="lazy" />
      ) : (
        <div className="w-7 h-10 bg-white/5 rounded grid place-items-center">
          {type === "live" ? <Tv className="w-3 h-3 text-muted-foreground" /> : <Film className="w-3 h-3 text-muted-foreground" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground capitalize">
          {type === "movie" ? "Film" : type === "tv" ? "Série" : type}
        </p>
      </div>
      <Badge variant="secondary" className="text-primary font-bold text-xs">
        {count}
      </Badge>
    </div>
  )
}

function VisitorRow({ title, poster, type, ip, time }: any) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background/40 rounded-lg">
      <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />
      {poster ? (
        <img src={poster} alt={title} className="w-7 h-10 object-cover rounded" loading="lazy" />
      ) : (
        <div className="w-7 h-10 bg-white/5 rounded grid place-items-center">
          {type === "live" ? <Tv className="w-3 h-3 text-muted-foreground" /> : <Film className="w-3 h-3 text-muted-foreground" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{title}</p>
        <span className="text-[10px] font-mono text-muted-foreground">{ip}</span>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {new Date(time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  )
}
