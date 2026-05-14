"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, ShieldX, ShieldQuestion, RefreshCw, ExternalLink, Loader2 } from "lucide-react"

interface Breakdown {
  [k: string]: { alive: number; dead: number; unknown: number }
}
interface DeadLink {
  link_id: string
  link_type: string
  source_url: string
  host: string | null
  status: string
  consecutive_failures: number
  last_checked_at: string | null
  dead_since: string | null
  last_http_status: number | null
  last_error: string | null
  response_ms: number | null
}
interface ScanReport {
  started_at: string
  ended_at: string
  scanned: number
  alive: number
  dead: number
  unknown: number
  per_collection: Record<string, number>
}

function shortDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
}

function StatusBadge({ s }: { s: string }) {
  if (s === "alive")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <ShieldCheck className="w-3 h-3 mr-1" /> en ligne
      </Badge>
    )
  if (s === "dead")
    return (
      <Badge className="bg-red-500/15 text-red-400 border border-red-500/30">
        <ShieldX className="w-3 h-3 mr-1" /> mort
      </Badge>
    )
  return (
    <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <ShieldQuestion className="w-3 h-3 mr-1" /> à vérifier
    </Badge>
  )
}

export function LinkHealthModule() {
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)
  const [lastScan, setLastScan] = useState<ScanReport | null>(null)
  const [deadLinks, setDeadLinks] = useState<DeadLink[]>([])
  const [onlyDead, setOnlyDead] = useState(false)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/check-link/run${onlyDead ? "?only_dead=1" : ""}`, {
        credentials: "include",
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      setBreakdown(j.breakdown)
      setLastScan(j.last_scan || null)
      setDeadLinks(j.dead_links || [])
    } catch (e: any) {
      setError(e?.message || "erreur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyDead])

  async function runNow() {
    setRunning(true)
    try {
      const r = await fetch("/api/admin/check-link/run?wait=1", {
        method: "POST",
        credentials: "include",
      })
      const j = await r.json()
      if (j?.report) setLastScan(j.report)
      await load()
    } catch {}
    setRunning(false)
  }

  async function recheck(linkId: string, linkType: string) {
    try {
      await fetch(`/api/admin/check-link/run?link_id=${encodeURIComponent(linkId)}&link_type=${linkType}`, {
        method: "POST",
        credentials: "include",
      })
      await load()
    } catch {}
  }

  if (loading && !breakdown) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> Chargement…
        </CardContent>
      </Card>
    )
  }
  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-red-400">Erreur: {error}</CardContent>
      </Card>
    )
  }

  const aliveTotal = (breakdown?.download?.alive || 0) + (breakdown?.digital?.alive || 0) + (breakdown?.streaming?.alive || 0)
  const deadTotal = (breakdown?.download?.dead || 0) + (breakdown?.digital?.dead || 0) + (breakdown?.streaming?.dead || 0)
  const unkTotal = (breakdown?.download?.unknown || 0) + (breakdown?.digital?.unknown || 0) + (breakdown?.streaming?.unknown || 0)

  return (
    <div className="space-y-4" data-testid="link-health-module">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Santé des liens</h2>
          <p className="text-xs text-muted-foreground">
            Test périodique automatique des sources de téléchargement / streaming. Re-test toutes les 12h max.
          </p>
        </div>
        <Button onClick={runNow} disabled={running} data-testid="link-health-run-now">
          {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          {running ? "Scan en cours…" : "Lancer un scan maintenant"}
        </Button>
      </div>

      {/* Overview tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total testés</div>
            <div className="text-2xl font-bold">{aliveTotal + deadTotal + unkTotal}</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-emerald-500">En ligne</div>
            <div className="text-2xl font-bold text-emerald-400">{aliveTotal}</div>
          </CardContent>
        </Card>
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-red-500">Morts</div>
            <div className="text-2xl font-bold text-red-400">{deadTotal}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-amber-500">À vérifier</div>
            <div className="text-2xl font-bold text-amber-400">{unkTotal}</div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by collection */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Détail par collection</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left py-1">Type</th>
                <th className="text-right py-1">En ligne</th>
                <th className="text-right py-1">Morts</th>
                <th className="text-right py-1">À vérifier</th>
              </tr>
            </thead>
            <tbody>
              {["download", "digital", "streaming"].map((k) => (
                <tr key={k} className="border-t border-border/40">
                  <td className="py-1.5 capitalize">{k}</td>
                  <td className="text-right tabular-nums text-emerald-400">{breakdown?.[k]?.alive || 0}</td>
                  <td className="text-right tabular-nums text-red-400">{breakdown?.[k]?.dead || 0}</td>
                  <td className="text-right tabular-nums text-amber-400">{breakdown?.[k]?.unknown || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lastScan && (
            <div className="text-xs text-muted-foreground mt-2">
              Dernier scan : {shortDate(lastScan.ended_at)} · {lastScan.scanned} liens testés (
              {lastScan.alive} ok, {lastScan.dead} morts, {lastScan.unknown} inconnus)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dead list */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">{onlyDead ? "Liens morts" : "Liens problématiques"}</div>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={onlyDead}
                onChange={(e) => setOnlyDead(e.target.checked)}
                data-testid="filter-only-dead"
              />
              Uniquement les morts confirmés
            </label>
          </div>
          {deadLinks.length === 0 ? (
            <div className="text-xs text-muted-foreground" data-testid="dead-empty">Aucun lien problématique. 🎉</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left py-1">Statut</th>
                    <th className="text-left py-1">Hôte</th>
                    <th className="text-left py-1">URL</th>
                    <th className="text-right py-1">HTTP</th>
                    <th className="text-left py-1">Erreur</th>
                    <th className="text-left py-1">Depuis</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {deadLinks.slice(0, 50).map((d) => (
                    <tr key={d.link_id} className="border-t border-border/40">
                      <td className="py-1.5">
                        <StatusBadge s={d.status} />
                      </td>
                      <td>{d.host || "—"}</td>
                      <td className="max-w-[260px] truncate">
                        <a href={d.source_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                          <span className="truncate">{d.source_url}</span>
                          <ExternalLink className="w-3 h-3 flex-none" />
                        </a>
                      </td>
                      <td className="text-right tabular-nums">{d.last_http_status ?? "—"}</td>
                      <td className="text-muted-foreground">{d.last_error || "—"}</td>
                      <td className="text-muted-foreground">{shortDate(d.dead_since || d.last_checked_at)}</td>
                      <td>
                        <Button size="sm" variant="ghost" onClick={() => recheck(d.link_id, d.link_type)} data-testid={`recheck-${d.link_id}`}>
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </td>
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
