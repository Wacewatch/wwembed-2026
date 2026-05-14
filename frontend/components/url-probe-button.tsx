"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wand2, CheckCircle2, AlertCircle } from "lucide-react"

export interface ProbeResult {
  ok: boolean
  url: string
  host: string | null
  provider: string | null
  filename: string | null
  fileSize: number | null
  fileSizeHuman: string | null
  contentType: string | null
  quality: string | null
  language: string | null
  guessedMediaType: string | null
  reachable: boolean
  httpStatus: number | null
  reason: string | null
}

interface Props {
  url: string
  /** Called when the probe returns useful data. The receiver should
   *  selectively apply only the fields it cares about. */
  onResult: (r: ProbeResult) => void
  className?: string
  compact?: boolean
  testId?: string
}

export function UrlProbeButton({ url, onResult, className, compact, testId }: Props) {
  const [loading, setLoading] = useState(false)
  const [last, setLast] = useState<ProbeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disabled = !url || !/^https?:\/\//.test(url.trim())

  async function run() {
    setLoading(true)
    setError(null)
    setLast(null)
    try {
      const r = await fetch("/api/upload/probe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      const j = (await r.json()) as ProbeResult & { error?: string }
      if (!r.ok) {
        setError((j as any)?.error || `HTTP ${r.status}`)
        return
      }
      setLast(j)
      onResult(j)
    } catch (e: any) {
      setError(e?.message || "erreur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        variant="outline"
        onClick={run}
        disabled={disabled || loading}
        data-testid={testId || "probe-url-btn"}
        className="gap-1.5"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {loading ? "Test…" : "Auto-remplir"}
      </Button>
      {last && (
        <div
          className="mt-2 text-xs bg-muted/40 rounded-md p-2 space-y-0.5 border border-border/60"
          data-testid="probe-result"
        >
          <div className="flex items-center gap-1 text-emerald-400">
            {last.reachable ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
            <span className="text-foreground font-medium">
              {last.provider || last.host || "Inconnu"}
            </span>
            <span className="text-muted-foreground">· {last.httpStatus ?? "?"}</span>
          </div>
          <div className="text-muted-foreground">
            {last.filename && <span className="block truncate">📄 {last.filename}</span>}
            {[
              last.quality && `🎬 ${last.quality}`,
              last.language && `🌐 ${last.language}`,
              last.fileSizeHuman && `📦 ${last.fileSizeHuman}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      )}
      {error && (
        <div className="mt-1 text-xs text-red-400" data-testid="probe-error">
          {error}
        </div>
      )}
    </div>
  )
}
