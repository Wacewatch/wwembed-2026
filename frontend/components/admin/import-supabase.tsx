"use client"

import { useEffect, useState, useCallback } from "react"
import { Database, AlertTriangle, CheckCircle2, Loader2, Play, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type TableStatus = {
  name: string
  total: number
  state: "pending" | "running" | "done" | "error"
  error?: string
}

type Job = {
  id: string
  status: "running" | "done" | "error"
  phase: "tables" | "auth_users" | "done"
  started_at: string
  finished_at?: string
  current_table?: string
  total_rows: number
  tables: TableStatus[]
  auth_users: { total: number; state: "pending" | "running" | "done" | "error"; error?: string }
  error?: string
}

function StateDot({ state }: { state: TableStatus["state"] }) {
  if (state === "running")
    return <Loader2 className="w-4 h-4 animate-spin text-cyan-400" data-testid="row-state-running" />
  if (state === "done")
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" data-testid="row-state-done" />
  if (state === "error")
    return <AlertTriangle className="w-4 h-4 text-red-400" data-testid="row-state-error" />
  return <div className="w-2 h-2 rounded-full bg-white/20" data-testid="row-state-pending" />
}

function fmt(n: number) {
  return n.toLocaleString()
}

export function ImportSupabase() {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchJob = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/import-supabase", { credentials: "include" })
      const d = await r.json()
      setJob(d.job || null)
    } catch (e: any) {
      // ignore network blip
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchJob().finally(() => setLoading(false))
  }, [fetchJob])

  // Poll while running
  useEffect(() => {
    if (!job || job.status !== "running") return
    const t = setInterval(fetchJob, 2000)
    return () => clearInterval(t)
  }, [job, fetchJob])

  const startImport = async () => {
    setStarting(true)
    setErrorMsg(null)
    try {
      const r = await fetch("/api/admin/import-supabase", {
        method: "POST",
        credentials: "include",
      })
      const d = await r.json()
      if (!r.ok) {
        setErrorMsg(d.error || "Échec du démarrage")
      } else {
        setJob(d.job)
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur réseau")
    } finally {
      setStarting(false)
      setConfirming(false)
    }
  }

  const isRunning = job?.status === "running"
  const totalTables = job?.tables.length || 0
  const doneTables = job?.tables.filter((t) => t.state === "done").length || 0
  const errorTables = job?.tables.filter((t) => t.state === "error").length || 0
  const progressPct =
    totalTables > 0 ? Math.round(((doneTables + errorTables) / (totalTables + 1)) * 100) : 0

  return (
    <div className="space-y-6" data-testid="import-supabase-panel">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl glass-strong ring-glow p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 grid place-items-center ring-1 ring-cyan-400/30 shrink-0">
              <Database className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Import Supabase → MongoDB
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Lance une migration complète de toutes les tables Supabase publiques + des comptes
                <code className="mx-1 px-1.5 py-0.5 rounded bg-white/5 text-[11px]">auth.users</code>
                vers MongoDB. <strong>Idempotent</strong> — peut être relancé sans dupliquer les
                données (upsert par UUID→ObjectId).
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3">
            {confirming ? (
              <div className="flex gap-2">
                <Button
                  onClick={startImport}
                  disabled={starting}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                  data-testid="confirm-import-btn"
                >
                  {starting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Lancement...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" /> Confirmer le lancement
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirming(false)}
                  disabled={starting}
                  data-testid="cancel-import-btn"
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setConfirming(true)}
                disabled={isRunning || starting}
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-lg shadow-cyan-500/30"
                data-testid="start-import-btn"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Import en cours...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> Démarrer l'import complet
                  </>
                )}
              </Button>
            )}
            <button
              type="button"
              onClick={fetchJob}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              data-testid="refresh-job-btn"
            >
              <RefreshCw className="w-3 h-3" />
              Actualiser le statut
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2"
          data-testid="import-error-msg"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{errorMsg}</div>
        </div>
      )}

      {loading && !job && (
        <div className="flex items-center gap-2 text-muted-foreground" data-testid="import-loading">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement du statut...
        </div>
      )}

      {!loading && !job && (
        <div className="rounded-xl glass-subtle border border-white/5 p-6 text-center text-sm text-muted-foreground" data-testid="import-no-job">
          Aucun import lancé pour l'instant. Cliquez sur <strong>Démarrer l'import complet</strong>{" "}
          pour migrer toutes les données de Supabase vers MongoDB.
        </div>
      )}

      {job && (
        <div className="space-y-4" data-testid="import-job-block">
          {/* Status header */}
          <div className="rounded-xl glass border border-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Job
                  </span>
                  <code
                    className="text-xs px-2 py-0.5 rounded bg-white/5 text-foreground"
                    data-testid="import-job-id"
                  >
                    {job.id}
                  </code>
                  <span
                    className={`text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                      job.status === "running"
                        ? "bg-cyan-500/15 text-cyan-300"
                        : job.status === "done"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                    }`}
                    data-testid="import-job-status"
                  >
                    {job.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Démarré le {new Date(job.started_at).toLocaleString("fr-FR")}
                  {job.finished_at && (
                    <> · Terminé le {new Date(job.finished_at).toLocaleString("fr-FR")}</>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tabular-nums" data-testid="import-total-rows">
                  {fmt(job.total_rows)}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  lignes migrées
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-primary transition-all"
                style={{ width: `${progressPct}%` }}
                data-testid="import-progress-bar"
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex justify-between">
              <span>
                Phase: <strong className="text-foreground">{job.phase}</strong>
                {job.current_table && (
                  <>
                    {" "}
                    · table en cours: <strong className="text-foreground">{job.current_table}</strong>
                  </>
                )}
              </span>
              <span>{progressPct}%</span>
            </div>
          </div>

          {/* Tables grid */}
          <div className="rounded-xl glass-subtle border border-white/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Tables ({doneTables}/{totalTables} OK
                {errorTables > 0 && (
                  <span className="text-red-300"> · {errorTables} erreur(s)</span>
                )}
                )
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {job.tables.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 md:border-r border-white/5"
                  data-testid={`import-row-${t.name}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StateDot state={t.state} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      {t.error && (
                        <div className="text-[10px] text-red-300 truncate" title={t.error}>
                          {t.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm tabular-nums text-muted-foreground shrink-0">
                    {fmt(t.total)}
                  </div>
                </div>
              ))}
              {/* auth.users row */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 md:border-r border-white/5"
                data-testid="import-row-auth-users"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StateDot state={job.auth_users.state} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">auth.users</div>
                    {job.auth_users.error && (
                      <div
                        className="text-[10px] text-red-300 truncate"
                        title={job.auth_users.error}
                      >
                        {job.auth_users.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm tabular-nums text-muted-foreground shrink-0">
                  {fmt(job.auth_users.total)}
                </div>
              </div>
            </div>
          </div>

          {job.status === "done" && (
            <div
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-start gap-2"
              data-testid="import-success-msg"
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Import terminé avec succès.{" "}
                <strong>{fmt(job.total_rows)} lignes</strong> ont été persistées dans MongoDB.
                Les comptes utilisateurs migrés depuis <code>auth.users</code> sont marqués
                <code className="mx-1">needs_password_reset: true</code> — ils peuvent réinitialiser
                via /auth/forgot-password ou se ré-inscrire avec le même email.
              </div>
            </div>
          )}

          {job.status === "error" && (
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2"
              data-testid="import-error-summary"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Import terminé avec des erreurs. {job.error && <span>{job.error}</span>}
                <br />
                Les tables réussies sont déjà persistées — vous pouvez relancer pour réessayer
                celles qui ont échoué (idempotent).
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
