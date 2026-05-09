"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Download, TrendingUp, Server, Film, Tv, Book } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts"

const COLORS = ["oklch(0.78 0.16 195)", "oklch(0.7 0.18 280)", "oklch(0.74 0.2 50)", "oklch(0.65 0.24 25)", "oklch(0.7 0.2 145)", "oklch(0.74 0.18 30)", "oklch(0.7 0.2 320)", "oklch(0.75 0.16 230)"]

interface ExternalData {
  totalClicks: number
  totalClicksAllTime: number
  byDay: { date: string; count: number }[]
  byProvider: { provider: string; count: number }[]
  byHost: { host: string; count: number }[]
  byQuality: { quality: string; count: number }[]
  byMediaType: { type: string; count: number }[]
  topMedia: any[]
}

export function ExternalLinksStats({
  period,
  setPeriod,
  data,
}: {
  period: string
  setPeriod: (p: string) => void
  data: ExternalData
}) {
  const dayChart = data.byDay.map((d) => ({
    ...d,
    formattedDate: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Liens externes (3rd-party)
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

      {/* Top totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Tile icon={Download} label="Clics période" value={data.totalClicks} accent="oklch(0.65 0.22 295)" />
        <Tile icon={TrendingUp} label="Clics all-time" value={data.totalClicksAllTime} accent="oklch(0.7 0.18 220)" />
        <Tile icon={Server} label="Sources distinctes" value={data.byProvider.length} accent="oklch(0.7 0.2 145)" />
        <Tile icon={Globe} label="Hôtes distincts" value={data.byHost.length} accent="oklch(0.74 0.2 50)" />
      </div>

      {/* Day chart */}
      <Card className="glass-strong border-white/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Clics externes / jour
            </span>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {data.totalClicks.toLocaleString()} clics
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="formattedDate" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(20,30,50,0.85)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    backdropFilter: "blur(8px)",
                  }}
                />
                <Bar dataKey="count" fill="oklch(0.78 0.16 195)" radius={[6, 6, 0, 0]} name="Clics" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie + breakdowns */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="glass-strong border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" /> Top providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byProvider.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byProvider}
                        dataKey="count"
                        nameKey="provider"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {data.byProvider.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(20,30,50,0.85)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                  {data.byProvider.map((p, i) => {
                    const max = data.byProvider[0]?.count || 1
                    return (
                      <li key={p.provider + i} className="flex items-center gap-2 text-sm">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="flex-1 truncate">{p.provider}</span>
                        <span className="text-muted-foreground tabular-nums text-xs">
                          {((p.count / max) * 100).toFixed(0)}%
                        </span>
                        <span className="font-bold tabular-nums w-10 text-right">{p.count}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-strong border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Top hôtes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
              {data.byHost.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée</p>
              ) : (
                data.byHost.map((h, i) => {
                  const max = data.byHost[0]?.count || 1
                  return (
                    <div key={h.host + i} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-6 text-right tabular-nums text-xs">{i + 1}.</span>
                      <span className="flex-1 truncate" title={h.host}>
                        {h.host}
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                          style={{ width: `${(h.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-primary font-bold tabular-nums w-12 text-right">{h.count.toLocaleString()}</span>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type + Quality */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="glass-strong border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" /> Par type de média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {data.byMediaType.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center col-span-2">Aucune donnée</p>
              ) : (
                data.byMediaType.map((t) => (
                  <div key={t.type} className="glass-subtle rounded-xl p-4 text-center border border-white/5">
                    {t.type === "movie" && <Film className="w-6 h-6 mx-auto mb-2 text-blue-400" />}
                    {t.type === "tv" && <Tv className="w-6 h-6 mx-auto mb-2 text-purple-400" />}
                    {!["movie", "tv"].includes(t.type) && <Book className="w-6 h-6 mx-auto mb-2 text-amber-400" />}
                    <p className="text-2xl font-black tabular-nums">{t.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t.type === "movie" ? "Films" : t.type === "tv" ? "Séries" : t.type}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Par qualité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {data.byQuality.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center col-span-3">Aucune donnée</p>
              ) : (
                data.byQuality.map((q, i) => (
                  <div key={q.quality + i} className="glass-subtle rounded-xl p-3 text-center border border-white/5">
                    <p className="text-xl font-black tabular-nums">{q.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{q.quality}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top media for external clicks */}
      <Card className="glass-strong border-white/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Download className="w-4 h-4 text-orange-400" /> Top médias (clics externes)
            </span>
            <Badge variant="outline" className="border-orange-400/30 text-orange-400">
              {data.topMedia.reduce((s: number, m: any) => s + (m.downloads || 0), 0).toLocaleString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
            {data.topMedia.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center col-span-2">Aucune donnée</p>
            ) : (
              data.topMedia.map((m: any, i: number) => (
                <a
                  key={`${m.ww_id || m.tmdb_id}-${i}`}
                  href={m.ww_id ? `/embed/${m.ww_id}/stats` : "#"}
                  target={m.ww_id ? "_blank" : undefined}
                  rel="noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <span className="text-muted-foreground w-6 text-right tabular-nums text-xs">{i + 1}.</span>
                  {m.poster ? (
                    <img src={m.poster} alt={m.title} className="w-9 h-12 object-cover rounded" loading="lazy" />
                  ) : (
                    <div className="w-9 h-12 bg-white/5 rounded grid place-items-center">
                      <Film className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{m.media_type}</p>
                  </div>
                  <span className="text-orange-400 font-bold tabular-nums">{(m.downloads || 0).toLocaleString()}</span>
                </a>
              ))
            )}
          </div>
        </CardContent>
      </Card>
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
