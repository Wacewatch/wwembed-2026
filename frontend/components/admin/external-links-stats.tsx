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
  LineChart,
  Line,
  Legend,
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
  bySource: { source: string; count: number }[]
  byDayBySource?: { date: string; formattedDate: string; movix: number; alt: number; zt: number }[]
  topMediaBySource?: Record<string, any[]>
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

      {/* Breakdown by source (movix / alt / zt) */}
      <Card className="glass-strong border-white/5" data-testid="ext-by-source-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Clics par source externe
            <Badge variant="outline" className="ml-auto border-primary/30 text-primary">
              {(data.bySource || []).reduce((s, x) => s + x.count, 0).toLocaleString()} clics
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SourceBreakdown rows={data.bySource || []} />
        </CardContent>
      </Card>

      {/* Time series per source — line chart */}
      {data.byDayBySource && data.byDayBySource.length > 0 && (
        <Card className="glass-strong border-white/5" data-testid="ext-time-series-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Évolution des clics par source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.byDayBySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: "#fff", fontWeight: 700 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="movix" stroke="#a855f7" strokeWidth={2.5} dot={false} name="Movix" />
                <Line type="monotone" dataKey="alt" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Alt" />
                <Line type="monotone" dataKey="zt" stroke="#14b8a6" strokeWidth={2.5} dot={false} name="ZT" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top media per source */}
      {data.topMediaBySource && (
        <Card className="glass-strong border-white/5" data-testid="ext-top-by-source-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" /> Top 5 contenus par source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopMediaBySource data={data.topMediaBySource} />
          </CardContent>
        </Card>
      )}

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

const SOURCE_META: Record<string, { label: string; sub: string; accent: string; gradient: string }> = {
  movix: {
    label: "Sources externes",
    sub: "Movix / Darkiworld",
    accent: "oklch(0.7 0.18 280)",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  alt: {
    label: "Sources Alt",
    sub: "Wawa",
    accent: "oklch(0.74 0.2 50)",
    gradient: "from-amber-500 to-orange-500",
  },
  zt: {
    label: "Sources ZT",
    sub: "Zone-Telechargement",
    accent: "oklch(0.78 0.16 195)",
    gradient: "from-teal-400 to-cyan-500",
  },
}

function SourceBreakdown({ rows }: { rows: { source: string; count: number }[] }) {
  const ORDER = ["movix", "alt", "zt"] as const
  const map = new Map(rows.map((r) => [r.source, r.count]))
  const total = rows.reduce((s, x) => s + x.count, 0)
  if (total === 0) {
    return <p className="text-muted-foreground text-sm py-4 text-center">Aucun clic externe sur la période</p>
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ORDER.map((src) => {
          const meta = SOURCE_META[src]
          const count = map.get(src) || 0
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div
              key={src}
              className="relative overflow-hidden rounded-xl glass-subtle border border-white/10 p-4"
              data-testid={`ext-source-${src}`}
            >
              <div
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-30"
                style={{ background: meta.accent }}
              />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{meta.label}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{meta.sub}</p>
                <p className="text-3xl font-black tabular-nums mt-3">{count.toLocaleString()}</p>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-muted-foreground">{pct.toFixed(1)}% du total</span>
                  <span className="text-primary font-semibold">
                    {pct >= 1 ? `#${[...ORDER].sort((a, b) => (map.get(b) || 0) - (map.get(a) || 0)).indexOf(src) + 1}` : "—"}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${meta.gradient}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stacked horizontal bar — visual comparison */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Répartition globale</p>
        <div className="h-4 rounded-full overflow-hidden flex bg-white/5 border border-white/5">
          {ORDER.map((src) => {
            const meta = SOURCE_META[src]
            const count = map.get(src) || 0
            const pct = total > 0 ? (count / total) * 100 : 0
            if (pct === 0) return null
            return (
              <div
                key={src}
                className={`bg-gradient-to-r ${meta.gradient} h-full`}
                style={{ width: `${pct}%` }}
                title={`${meta.label}: ${count.toLocaleString()} (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          {ORDER.map((src) => {
            const meta = SOURCE_META[src]
            const count = map.get(src) || 0
            return (
              <div key={src} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-sm bg-gradient-to-r ${meta.gradient}`} />
                <span className="text-muted-foreground">{meta.label}</span>
                <span className="font-bold tabular-nums">{count.toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TopMediaBySource({ data }: { data: Record<string, any[]> }) {
  const ORDER = ["movix", "alt", "zt"] as const
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {ORDER.map((src) => {
        const meta = SOURCE_META[src]
        const items = data[src] || []
        return (
          <div key={src} className="rounded-xl glass-subtle border border-white/10 overflow-hidden">
            <div className={`px-4 py-2.5 bg-gradient-to-r ${meta.gradient} flex items-center justify-between`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white drop-shadow">{meta.label}</p>
                <p className="text-[10px] text-white/80">{meta.sub}</p>
              </div>
              <Badge variant="outline" className="bg-white/15 border-white/30 text-white">
                {items.length}
              </Badge>
            </div>
            <div className="p-2 space-y-1.5">
              {items.length === 0 && (
                <p className="text-muted-foreground text-xs py-3 text-center">Aucune donnée sur la période</p>
              )}
              {items.map((m: any, idx: number) => (
                <div
                  key={`${src}-${m.ww_id || idx}`}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  data-testid={`top-${src}-${idx}`}
                >
                  <span className="flex-shrink-0 w-5 text-center font-black text-xs text-muted-foreground tabular-nums">
                    #{idx + 1}
                  </span>
                  {m.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.poster}
                      alt=""
                      className="w-9 h-12 object-cover rounded-sm flex-shrink-0 ring-1 ring-white/10"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-9 h-12 rounded-sm bg-white/5 flex-shrink-0 grid place-items-center text-muted-foreground">
                      {m.media_type === "tv" ? <Tv className="w-4 h-4" /> : m.media_type === "digital" ? <Book className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{m.title || m.ww_id}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{m.media_type || "—"}</p>
                  </div>
                  <span className="text-xs font-black tabular-nums text-primary">{(m.downloads || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

