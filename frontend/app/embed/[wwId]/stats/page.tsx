"use client"

import { useEffect, useState, use } from "react"
import {
  Eye,
  MousePointer,
  Globe2,
  ArrowLeft,
  Calendar,
  TrendingUp,
  ExternalLink,
  Loader2,
  Sparkles,
  Copy,
  Check,
} from "lucide-react"
import Link from "next/link"

interface StatsData {
  ww_id: string
  type: string
  title: string
  poster: string | null
  totals: {
    views_all_time: number
    clicks_all_time: number
    views_today: number
    views_7d: number
    views_30d: number
    clicks_30d: number
  }
  series_30d: { date: string; count: number }[]
  top_countries: { country: string; count: number }[]
  top_referers: { host: string; count: number }[]
  generated_at: string
}

export default function PublicEmbedStatsPage({ params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = use(params)
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const r = await fetch(`/api/v1/stats/${wwId}`, { cache: "no-store" })
        if (!r.ok) throw new Error("Stats indisponibles")
        const j = await r.json()
        if (active) setData(j)
      } catch (e: any) {
        if (active) setError(e?.message || "Erreur")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000) // refresh every 30s
    return () => {
      active = false
      clearInterval(id)
    }
  }, [wwId])

  const copyEmbed = async () => {
    const u = `${window.location.origin}/api/v1/streaming/${wwId}`
    try {
      await navigator.clipboard.writeText(u)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="orb w-[460px] h-[460px] -top-32 -left-32 bg-primary/30" />
      <div className="orb w-[420px] h-[420px] top-[20%] right-[-160px] bg-cyan-500/20" style={{ animationDelay: "-5s" }} />

      <div className="relative container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          data-testid="back-home"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>

        {loading && (
          <div className="glass-strong rounded-2xl p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
            Chargement des statistiques...
          </div>
        )}

        {error && (
          <div className="glass-strong rounded-2xl p-12 text-center text-destructive border border-destructive/30">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6 fade-up">
            {/* Header */}
            <div className="glass-strong rounded-2xl p-6 sm:p-8 ring-glow flex flex-col sm:flex-row gap-5 sm:items-center">
              {data.poster && (
                <img
                  src={data.poster}
                  alt={data.title}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl ring-1 ring-white/10 shadow-2xl"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-primary/15 text-primary border border-primary/30">
                    <Sparkles className="w-3 h-3" />
                    Stats live
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-white/5 text-muted-foreground border border-white/10">
                    {data.type}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{data.title}</h1>
                <code className="text-xs text-muted-foreground font-mono mt-1 block truncate">{data.ww_id}</code>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={copyEmbed}
                    data-testid="copy-embed-url"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs glass-subtle hover:bg-primary/10 hover:text-primary transition-colors border border-white/10"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copié !" : "Copier l'URL embed"}
                  </button>
                  <Link
                    href={`/api/v1/streaming/${data.ww_id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs glass-subtle hover:bg-primary/10 hover:text-primary transition-colors border border-white/10"
                  >
                    <ExternalLink className="w-3 h-3" /> Tester l'embed
                  </Link>
                </div>
              </div>
            </div>

            {/* Big totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <BigStat icon={Eye} label="Vues totales" value={data.totals.views_all_time} accent="oklch(0.65 0.22 295)" />
              <BigStat icon={MousePointer} label="Clics totaux" value={data.totals.clicks_all_time} accent="oklch(0.7 0.18 220)" />
              <BigStat icon={Calendar} label="Aujourd'hui" value={data.totals.views_today} accent="oklch(0.7 0.2 145)" />
              <BigStat icon={TrendingUp} label="7 derniers jours" value={data.totals.views_7d} accent="oklch(0.74 0.2 50)" />
            </div>

            {/* Chart */}
            <div className="glass-strong rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Vues sur 30 jours</h2>
                <span className="text-xs text-muted-foreground">{data.totals.views_30d.toLocaleString()} vues / 30j</span>
              </div>
              <Sparkbar data={data.series_30d} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top countries */}
              <div className="glass-strong rounded-2xl p-5 sm:p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-primary" /> Top pays
                </h2>
                {data.top_countries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée géo disponible</p>
                ) : (
                  <div className="space-y-2">
                    {data.top_countries.map((c, i) => {
                      const pct = (c.count / Math.max(...data.top_countries.map((x) => x.count))) * 100
                      return (
                        <div key={c.country + i} className="flex items-center gap-3 text-sm">
                          <span className="w-10 text-muted-foreground tabular-nums">{c.country}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-12 text-right tabular-nums font-medium">{c.count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Top referers */}
              <div className="glass-strong rounded-2xl p-5 sm:p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" /> Top sources
                </h2>
                {data.top_referers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun référent enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {data.top_referers.map((r, i) => {
                      const pct = (r.count / Math.max(...data.top_referers.map((x) => x.count))) * 100
                      return (
                        <div key={r.host + i} className="flex items-center gap-3 text-sm">
                          <span className="flex-1 truncate text-muted-foreground" title={r.host}>
                            {r.host}
                          </span>
                          <div className="w-24 sm:w-32 h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-12 text-right tabular-nums font-medium">{r.count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Mis à jour automatiquement toutes les 30 secondes ·{" "}
              {new Date(data.generated_at).toLocaleString("fr-FR")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function BigStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl glass border border-white/5 p-5">
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30"
        style={{ background: accent }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</p>
          <p className="text-3xl font-black mt-2 tabular-nums">{value.toLocaleString()}</p>
        </div>
        <div className="w-11 h-11 rounded-xl grid place-items-center ring-1 ring-white/10" style={{ background: accent }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

function Sparkbar({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-32 sm:h-40">
        {data.map((d) => {
          const h = (d.count / max) * 100
          return (
            <div
              key={d.date}
              className="flex-1 group relative"
              title={`${d.date}: ${d.count} vues`}
            >
              <div
                className="rounded-t-md bg-gradient-to-t from-primary/60 to-cyan-400 transition-all group-hover:from-primary group-hover:to-cyan-300"
                style={{ height: `${Math.max(2, h)}%`, minHeight: "2px" }}
              />
              <div className="absolute opacity-0 group-hover:opacity-100 -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md glass-strong text-[10px] whitespace-nowrap pointer-events-none transition-opacity z-10">
                {d.count}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.date.slice(5)}</span>
        <span>Aujourd'hui</span>
      </div>
    </div>
  )
}
