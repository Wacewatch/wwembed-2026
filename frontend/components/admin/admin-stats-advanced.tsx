"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity, Globe2, Layers, Filter } from "lucide-react"

interface Comparative {
  views: { current: number; previous: number; delta_pct: number }
  clicks: { current: number; previous: number; delta_pct: number }
  ad_clicks: { current: number; previous: number; delta_pct: number }
  unique: { current: number; previous: number; delta_pct: number }
}
interface AdvancedStats {
  period_days: number
  comparative: Comparative
  heatmap_7d: number[][] // [dow0..6 (Sun..Sat)][hour0..23]
  top_countries: { country: string; count: number }[]
  funnel: {
    impressions: number
    unique_sessions: number
    source_clicks: number
    ad_clicks: number
    view_to_click_pct: number
    view_to_ad_pct: number
  }
  top_bandwidth: {
    ww_id: string
    title: string
    poster: string | null
    media_type: string | null
    views: number
    avg_bytes: number | null
    estimated_bandwidth_bytes: number | null
  }[]
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}
function fmtBytes(b: number | null): string {
  if (!b) return "—"
  const u = ["B", "KB", "MB", "GB", "TB"]
  let v = b
  let i = 0
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)} ${u[i]}`
}
function flagFor(country: string): string {
  // ISO-2 → emoji flag (regional indicator letters offset)
  if (!country || country.length !== 2) return "🏳️"
  const A = 0x1f1e6
  return String.fromCodePoint(A + country.charCodeAt(0) - 65) + String.fromCodePoint(A + country.charCodeAt(1) - 65)
}

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

function Delta({ pct }: { pct: number }) {
  const pos = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${pos ? "text-emerald-400" : "text-red-400"}`}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? "+" : ""}{pct}%
    </span>
  )
}

export function AdminStatsAdvanced() {
  const [data, setData] = useState<AdvancedStats | null>(null)
  const [period, setPeriod] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/admin/stats/advanced?period=${period}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return
        if (j && !j.error) setData(j)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [period])

  if (loading)
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-muted-foreground">Chargement…</CardContent>
      </Card>
    )
  if (!data) return null

  // Compute heatmap max for color scaling
  let max = 0
  for (const row of data.heatmap_7d) for (const v of row) if (v > max) max = v
  const cellBg = (v: number) => {
    if (!v) return "rgba(255,255,255,0.04)"
    const ratio = v / (max || 1)
    return `rgba(34, 197, 94, ${0.15 + ratio * 0.75})` // green scale
  }

  return (
    <div className="space-y-4" data-testid="admin-stats-advanced">
      {/* Period switcher */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Analytics avancées
        </h2>
        <div className="flex gap-1 text-xs">
          {[1, 7, 30].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded ${
                period === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"
              }`}
              data-testid={`advanced-period-${p}`}
            >
              {p}j
            </button>
          ))}
        </div>
      </div>

      {/* Comparatif tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Vues", data.comparative.views],
          ["Clics liens", data.comparative.clicks],
          ["Clics pub", data.comparative.ad_clicks],
          ["Visiteurs uniques", data.comparative.unique],
        ].map(([label, c]: [string, any]) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold mt-1">{fmt(c.current)}</div>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-muted-foreground">vs préc. {fmt(c.previous)}</span>
                <Delta pct={c.delta_pct} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Heatmap 7x24 */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold inline-flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Heatmap horaire (7 derniers jours, UTC)
            </div>
            <div className="text-xs text-muted-foreground">Vert clair = peu de trafic, vert foncé = pic</div>
          </div>
          <div className="overflow-x-auto">
            <table className="text-[10px] border-collapse" data-testid="heatmap-table">
              <thead>
                <tr>
                  <th className="px-1"></th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="px-1 text-center text-muted-foreground font-normal w-6">
                      {h}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.heatmap_7d.map((row, dow) => (
                  <tr key={dow}>
                    <td className="pr-2 text-right text-muted-foreground font-medium">{DAYS_FR[dow]}</td>
                    {row.map((v, h) => (
                      <td
                        key={h}
                        className="p-0"
                        title={`${DAYS_FR[dow]} ${h}h — ${fmt(v)} vues`}
                      >
                        <div
                          className="w-6 h-5 m-0.5 rounded-sm flex items-center justify-center text-[9px] text-white/70"
                          style={{ background: cellBg(v) }}
                          data-testid={`heat-${dow}-${h}`}
                        >
                          {v && max > 0 && v / max > 0.5 ? fmt(v) : ""}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Funnel + Top countries side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="text-sm font-semibold mb-3 inline-flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" /> Funnel d'engagement
            </div>
            <div className="space-y-2.5" data-testid="funnel">
              {[
                ["Impressions embed", data.funnel.impressions, 100, "bg-primary"],
                ["Sessions uniques", data.funnel.unique_sessions, data.funnel.impressions, "bg-blue-500"],
                ["Clics source", data.funnel.source_clicks, data.funnel.impressions, "bg-emerald-500"],
                ["Clics pub", data.funnel.ad_clicks, data.funnel.impressions, "bg-pink-500"],
              ].map(([label, count, base, color]: any) => {
                const ratio = base > 0 ? (count / base) * 100 : 0
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{label}</span>
                      <span className="text-muted-foreground">
                        <span className="text-foreground font-semibold">{fmt(count)}</span> ({ratio.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className={color} style={{ width: `${Math.min(100, ratio)}%`, height: "100%" }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="bg-muted/40 rounded-lg p-2">
                <div className="text-muted-foreground">Taux clic source</div>
                <div className="text-lg font-bold text-emerald-400">{data.funnel.view_to_click_pct}%</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-2">
                <div className="text-muted-foreground">Taux clic pub</div>
                <div className="text-lg font-bold text-pink-400">{data.funnel.view_to_ad_pct}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="text-sm font-semibold mb-3 inline-flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-primary" /> Top pays (ip → geoip)
            </div>
            {data.top_countries.length === 0 ? (
              <div className="text-xs text-muted-foreground" data-testid="top-countries-empty">
                Pas encore de données géographiques (les nouveaux events stockent maintenant un préfixe IP).
              </div>
            ) : (
              <ol className="space-y-1.5 text-sm" data-testid="top-countries-list">
                {data.top_countries.map((c, i) => {
                  const max = data.top_countries[0]?.count || 1
                  const ratio = (c.count / max) * 100
                  return (
                    <li key={c.country} className="flex items-center gap-3">
                      <span className="w-6 text-center text-muted-foreground">#{i + 1}</span>
                      <span className="text-lg">{flagFor(c.country)}</span>
                      <span className="font-mono text-xs">{c.country}</span>
                      <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${ratio}%` }} />
                      </div>
                      <span className="text-xs tabular-nums w-12 text-right">{fmt(c.count)}</span>
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top bandwidth */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3">Top contenus consommateurs de bande passante</div>
          {data.top_bandwidth.length === 0 ? (
            <div className="text-xs text-muted-foreground">Pas de données disponibles.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="top-bandwidth-table">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-1">Contenu</th>
                    <th className="text-right py-1">Vues</th>
                    <th className="text-right py-1">Taille moy.</th>
                    <th className="text-right py-1">BP estimée</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_bandwidth.map((c) => (
                    <tr key={c.ww_id} className="border-t border-border/40">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          {c.poster && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.poster} alt="" className="w-6 h-9 rounded object-cover" />
                          )}
                          <div>
                            <div className="text-foreground truncate max-w-[280px]">{c.title}</div>
                            <div className="text-xs text-muted-foreground">{c.media_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{fmt(c.views)}</td>
                      <td className="text-right tabular-nums text-muted-foreground">{fmtBytes(c.avg_bytes)}</td>
                      <td className="text-right tabular-nums font-semibold">{fmtBytes(c.estimated_bandwidth_bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
