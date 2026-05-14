"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Card as Cd } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts"
import { Trophy, Eye, TrendingUp, TrendingDown, ShieldCheck, ShieldX, ShieldQuestion } from "lucide-react"

interface MyStats {
  totals: { views: number; views_30d: number; views_7d: number; clicks_30d: number }
  delta_pct: { views_30d: number | null }
  series_30d: { date: string; views: number; clicks: number }[]
  top_contents: { ww_id: string; views: number; media_type: string | null; tmdb_id: number | null }[]
  best_day: { date: string; views: number } | null
  avg_views_per_day_30d: number
  link_health: { alive: number; dead: number; unknown: number; total: number }
  content_count: number
}

interface LeaderRow {
  rank: number
  uploader_id: string
  username: string
  role: string
  views: number
  contents: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

export function DashboardStatsOverview({ currentUserId }: { currentUserId?: string }) {
  const [stats, setStats] = useState<MyStats | null>(null)
  const [board, setBoard] = useState<LeaderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"7d" | "30d">("7d")

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch("/api/dashboard/my-stats", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/leaderboard?period=${period}&limit=10`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([s, l]) => {
        if (!alive) return
        if (s && !s.error) setStats(s)
        if (l?.leaderboard) setBoard(l.leaderboard)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [period])

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center text-muted-foreground" data-testid="dashboard-stats-loading">
          Chargement des statistiques…
        </CardContent>
      </Card>
    )
  }
  if (!stats) return null

  const delta = stats.delta_pct.views_30d
  const myRank = board.findIndex((r) => r.uploader_id === currentUserId) + 1

  return (
    <div className="space-y-4" data-testid="dashboard-stats-overview">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Cd className="border-border">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Vues 30j</div>
            <div className="text-2xl font-bold mt-1" data-testid="kpi-views-30d">{fmt(stats.totals.views_30d)}</div>
            {delta !== null && (
              <div className={`text-xs mt-1 inline-flex items-center gap-1 ${delta >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {delta >= 0 ? "+" : ""}{delta}% vs 30j précédents
              </div>
            )}
          </CardContent>
        </Cd>
        <Cd className="border-border">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Vues totales</div>
            <div className="text-2xl font-bold mt-1" data-testid="kpi-views-all">{fmt(stats.totals.views)}</div>
            <div className="text-xs mt-1 text-muted-foreground">sur {stats.content_count} contenus</div>
          </CardContent>
        </Cd>
        <Cd className="border-border">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Clics liens 30j</div>
            <div className="text-2xl font-bold mt-1" data-testid="kpi-clicks-30d">{fmt(stats.totals.clicks_30d)}</div>
            <div className="text-xs mt-1 text-muted-foreground">
              Avg {fmt(stats.avg_views_per_day_30d)} vues/jour
            </div>
          </CardContent>
        </Cd>
        <Cd className="border-border">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Classement {period}
            </div>
            <div className="text-2xl font-bold mt-1" data-testid="kpi-rank">
              {myRank > 0 ? `#${myRank}` : "—"}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">parmi les top 10</div>
          </CardContent>
        </Cd>
      </div>

      {/* Main grid: chart + sidebar */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Chart 30j */}
        <Cd className="md:col-span-2 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Activité 30 jours
              </div>
              {stats.best_day && (
                <div className="text-xs text-muted-foreground">
                  Pic : {fmt(stats.best_day.views)} le {stats.best_day.date}
                </div>
              )}
            </div>
            <div className="h-56" data-testid="dashboard-30d-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.series_30d}>
                  <defs>
                    <linearGradient id="myViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#myViews)" />
                  <Line type="monotone" dataKey="clicks" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Cd>

        {/* Right column: link health + top contents */}
        <div className="space-y-4">
          <Cd className="border-border">
            <CardContent className="p-4">
              <div className="text-sm font-semibold mb-3">Santé de tes liens</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-emerald-500/10 p-3" data-testid="health-alive">
                  <ShieldCheck className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                  <div className="text-xl font-bold text-emerald-400">{stats.link_health.alive}</div>
                  <div className="text-muted-foreground">en ligne</div>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3" data-testid="health-dead">
                  <ShieldX className="w-4 h-4 mx-auto text-red-500 mb-1" />
                  <div className="text-xl font-bold text-red-400">{stats.link_health.dead}</div>
                  <div className="text-muted-foreground">morts</div>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3" data-testid="health-unknown">
                  <ShieldQuestion className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                  <div className="text-xl font-bold text-amber-400">{stats.link_health.unknown}</div>
                  <div className="text-muted-foreground">à vérifier</div>
                </div>
              </div>
            </CardContent>
          </Cd>
          <Cd className="border-border">
            <CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">Tes top contenus (30j)</div>
              {stats.top_contents.length === 0 ? (
                <div className="text-xs text-muted-foreground">Pas encore de vues sur tes contenus.</div>
              ) : (
                <ul className="text-xs space-y-1.5" data-testid="top-contents">
                  {stats.top_contents.slice(0, 6).map((c) => (
                    <li key={c.ww_id} className="flex justify-between gap-2">
                      <span className="truncate text-foreground/90">{c.ww_id}</span>
                      <span className="text-primary font-semibold">{fmt(c.views)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Cd>
        </div>
      </div>

      {/* Leaderboard */}
      <Cd className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold inline-flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard uploaders
            </div>
            <div className="flex gap-1 text-xs">
              {(["7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  data-testid={`leaderboard-period-${p}`}
                  className={`px-2 py-1 rounded ${period === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"}`}
                >
                  {p === "7d" ? "7 jours" : "30 jours"}
                </button>
              ))}
            </div>
          </div>
          {board.length === 0 ? (
            <div className="text-xs text-muted-foreground" data-testid="leaderboard-empty">
              Pas encore de données pour cette période.
            </div>
          ) : (
            <ol className="text-sm space-y-1" data-testid="leaderboard-list">
              {board.map((r) => {
                const me = r.uploader_id === currentUserId
                return (
                  <li
                    key={r.uploader_id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md ${me ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/40"}`}
                    data-testid={`leaderboard-row-${r.rank}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 text-center font-bold ${
                          r.rank === 1 ? "text-yellow-400" : r.rank === 2 ? "text-zinc-300" : r.rank === 3 ? "text-orange-400" : "text-muted-foreground"
                        }`}
                      >
                        #{r.rank}
                      </span>
                      <span className="truncate">
                        {r.username}
                        {me && <span className="ml-2 text-xs text-primary">(toi)</span>}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      <span className="text-foreground font-semibold">{fmt(r.views)}</span> vues · {r.contents} contenus
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Cd>
    </div>
  )
}
