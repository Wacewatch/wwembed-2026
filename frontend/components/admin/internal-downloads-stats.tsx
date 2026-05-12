"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Download,
  TrendingUp,
  Film,
  Tv,
  Book,
  UploadCloud,
  Trophy,
  Award,
  ShieldCheck,
  CheckCircle,
  Clock,
  XCircle,
  Hash,
  Languages,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const COLORS = [
  "oklch(0.78 0.16 195)",
  "oklch(0.7 0.18 280)",
  "oklch(0.74 0.2 50)",
  "oklch(0.65 0.24 25)",
  "oklch(0.7 0.2 145)",
  "oklch(0.74 0.18 30)",
  "oklch(0.7 0.2 320)",
  "oklch(0.75 0.16 230)",
]

interface InternalLink {
  link_id: string
  ww_id: string
  kind: "download" | "digital"
  title: string
  poster: string | null
  source_name: string
  quality: string | null
  language?: string
  file_size?: string
  link_type?: string
  media_type?: string | null
  season_number?: number | null
  episode_number?: number | null
  submitted_by?: string
  status?: string
  clicks: number
}

interface InternalUploader {
  user_id: string
  username: string
  role: string
  clicks: number
  linkCount: number
}

interface InternalData {
  totalClicks: number
  totalClicksAllTime: number
  byDay: { date: string; count: number }[]
  topLinks: InternalLink[]
  topUploaders: InternalUploader[]
  byQuality: { quality: string; count: number }[]
  byMediaType: { type: string; count: number }[]
  byLinkType: { link_type: string; count: number }[]
}

function formatEpisode(l: InternalLink) {
  if (l.season_number != null && l.episode_number != null) {
    return `S${String(l.season_number).padStart(2, "0")}E${String(l.episode_number).padStart(2, "0")}`
  }
  return null
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const cfg: Record<string, { icon: any; cls: string; label: string }> = {
    approved: {
      icon: CheckCircle,
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      label: "Approuvé",
    },
    pending: { icon: Clock, cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "En attente" },
    rejected: { icon: XCircle, cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "Rejeté" },
  }
  const c = cfg[status] || { icon: Hash, cls: "bg-white/5 text-muted-foreground border-white/10", label: status }
  const Icon = c.icon
  return (
    <Badge variant="outline" className={`${c.cls} text-[10px] gap-1`}>
      <Icon className="w-2.5 h-2.5" /> {c.label}
    </Badge>
  )
}

function Tile({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl glass border border-white/5 p-5">
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30"
        style={{ background: accent }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</p>
          <p className="text-3xl font-black mt-2 tabular-nums">{(value || 0).toLocaleString()}</p>
        </div>
        <div
          className="w-11 h-11 rounded-xl grid place-items-center ring-1 ring-white/10"
          style={{ background: accent }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export function InternalDownloadsStats({
  period,
  setPeriod,
  data,
}: {
  period: string
  setPeriod: (p: string) => void
  data: InternalData
}) {
  const dayChart = data.byDay.map((d) => ({
    ...d,
    formattedDate: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
  }))

  const totalUploaderClicks = data.topUploaders.reduce((s, u) => s + u.clicks, 0) || 1
  const maxLinkClicks = data.topLinks[0]?.clicks || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Download className="w-6 h-6 text-orange-400" />
          Téléchargements internes
          <Badge variant="outline" className="border-orange-400/30 text-orange-400 text-[10px]">
            tous les liens uploadés sur le site
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

      {/* Top tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Tile icon={Download} label="Clics période" value={data.totalClicks} accent="oklch(0.74 0.2 50)" />
        <Tile icon={TrendingUp} label="Clics all-time" value={data.totalClicksAllTime} accent="oklch(0.65 0.22 295)" />
        <Tile icon={Hash} label="Liens cliqués" value={data.topLinks.length} accent="oklch(0.7 0.2 145)" />
        <Tile icon={UploadCloud} label="Uploaders actifs" value={data.topUploaders.length} accent="oklch(0.7 0.18 280)" />
      </div>

      {/* Activity chart */}
      <Card className="glass-strong border-white/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" /> Activité quotidienne des téléchargements internes
            </span>
            <Badge variant="outline" className="border-orange-400/30 text-orange-400">
              {data.totalClicks.toLocaleString()} clics
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dayChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grdInternal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.74 0.2 50)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.74 0.2 50)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="oklch(0.74 0.2 50)"
                  strokeWidth={2}
                  fill="url(#grdInternal)"
                  name="Clics internes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Top internal links */}
        <Card className="glass-strong border-white/5 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-400" /> Top liens téléchargement internes
              </span>
              <Badge variant="outline" className="border-orange-400/30 text-orange-400" data-testid="internal-top-links-count">
                {data.topLinks.length.toLocaleString()} liens
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="space-y-2 max-h-[640px] overflow-y-auto scrollbar-thin pr-1"
              data-testid="internal-top-links-list"
            >
              {data.topLinks.length === 0 ? (
                <p className="text-muted-foreground text-sm py-6 text-center">Aucune donnée</p>
              ) : (
                data.topLinks.map((l, i) => {
                  const ep = formatEpisode(l)
                  return (
                    <a
                      key={l.link_id}
                      href={l.ww_id ? `/embed/${l.ww_id}/stats` : "#"}
                      target={l.ww_id ? "_blank" : undefined}
                      rel="noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                      data-testid={`internal-top-link-${i}`}
                    >
                      <span className="text-muted-foreground w-7 text-right tabular-nums text-xs">{i + 1}.</span>
                      {l.poster ? (
                        <img
                          src={l.poster}
                          alt={l.title}
                          className="w-9 h-12 object-cover rounded ring-1 ring-white/5"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-9 h-12 bg-white/5 rounded grid place-items-center ring-1 ring-white/5">
                          {l.kind === "digital" ? (
                            <Book className="w-4 h-4 text-muted-foreground" />
                          ) : l.media_type === "tv" ? (
                            <Tv className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Film className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {l.title}
                          {ep && <span className="ml-2 text-primary font-mono text-xs">{ep}</span>}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{l.source_name}</span>
                          {l.quality && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                              {l.quality}
                            </Badge>
                          )}
                          {l.language && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Languages className="w-2.5 h-2.5" />
                              {l.language}
                            </span>
                          )}
                          {l.link_type && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">
                              {l.link_type}
                            </Badge>
                          )}
                          <StatusBadge status={l.status} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-orange-400 font-bold tabular-nums">{l.clicks.toLocaleString()}</span>
                        <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                            style={{ width: `${(l.clicks / maxLinkClicks) * 100}%` }}
                          />
                        </div>
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top uploaders ranking */}
        <Card className="glass-strong border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Classement uploaders
              </span>
              <Badge variant="outline" className="border-amber-400/30 text-amber-400" data-testid="internal-uploaders-count">
                {data.topUploaders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="space-y-2 max-h-[640px] overflow-y-auto scrollbar-thin pr-1"
              data-testid="internal-top-uploaders-list"
            >
              {data.topUploaders.length === 0 ? (
                <p className="text-muted-foreground text-sm py-6 text-center">Aucune donnée</p>
              ) : (
                data.topUploaders.map((u, i) => {
                  const pct = (u.clicks / totalUploaderClicks) * 100
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null
                  return (
                    <div
                      key={u.user_id}
                      className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors"
                      data-testid={`internal-uploader-${i}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-muted-foreground w-6 text-right tabular-nums text-xs">
                          {medal || `${i + 1}.`}
                        </span>
                        <span className="flex-1 text-sm font-semibold truncate">{u.username}</span>
                        {u.role === "admin" && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-violet-400/30 text-violet-400 gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" /> admin
                          </Badge>
                        )}
                        {u.role === "uploader" && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-cyan-400/30 text-cyan-400">
                            uploader
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-orange-400 font-bold tabular-nums">
                          {u.clicks.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">clics</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground tabular-nums">{u.linkCount} liens</span>
                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1.5 w-full h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass-strong border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="w-4 h-4 text-orange-400" /> Par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byMediaType.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {data.byMediaType.map((t) => (
                  <div key={t.type} className="glass-subtle rounded-xl p-3 text-center border border-white/5">
                    {t.type === "movie" && <Film className="w-6 h-6 mx-auto mb-1.5 text-blue-400" />}
                    {t.type === "tv" && <Tv className="w-6 h-6 mx-auto mb-1.5 text-purple-400" />}
                    {!["movie", "tv"].includes(t.type) && <Book className="w-6 h-6 mx-auto mb-1.5 text-amber-400" />}
                    <p className="text-xl font-black tabular-nums">{t.count.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {t.type === "movie" ? "Films" : t.type === "tv" ? "Séries" : t.type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-strong border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" /> Par qualité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byQuality.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                {data.byQuality.map((q, i) => {
                  const max = data.byQuality[0]?.count || 1
                  return (
                    <div key={q.quality + i} className="flex items-center gap-2 text-xs">
                      <span className="w-12 truncate text-muted-foreground">{q.quality}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                          style={{ width: `${(q.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="font-bold tabular-nums w-12 text-right text-orange-400">
                        {q.count.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-strong border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-4 h-4 text-orange-400" /> Par type de lien
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byLinkType.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2 items-center">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byLinkType}
                        dataKey="count"
                        nameKey="link_type"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {data.byLinkType.map((_, i) => (
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
                <ul className="space-y-1.5 text-xs">
                  {data.byLinkType.map((l, i) => (
                    <li key={l.link_type + i} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="flex-1 capitalize truncate">{l.link_type}</span>
                      <span className="font-bold tabular-nums">{l.count.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
