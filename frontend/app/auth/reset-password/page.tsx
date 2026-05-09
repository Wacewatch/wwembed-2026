"use client"

import type React from "react"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, ArrowLeft, ShieldCheck } from "lucide-react"

function ResetPasswordInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError("Mot de passe trop court (6 caractères minimum)")
      return
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Erreur")
      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div
        data-testid="reset-no-token"
        className="glass-strong rounded-2xl p-7 ring-glow text-center space-y-4"
      >
        <h2 className="text-lg font-semibold">Lien invalide</h2>
        <p className="text-sm text-muted-foreground">
          Ce lien de réinitialisation est incomplet. Refais une demande.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-block text-primary hover:underline underline-offset-4 text-sm"
        >
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div
        data-testid="reset-success"
        className="glass-strong rounded-2xl p-7 ring-glow text-center space-y-4"
      >
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 ring-1 ring-primary/30 grid place-items-center">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Mot de passe mis à jour</h2>
        <p className="text-sm text-muted-foreground">Redirection vers le dashboard...</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-strong rounded-2xl p-7 space-y-5 ring-glow"
      data-testid="reset-form"
    >
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Nouveau mot de passe
        </Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            data-testid="reset-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 h-11 bg-background/40 border-white/10 focus-visible:ring-primary/50"
            minLength={6}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Confirmer le mot de passe
        </Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="confirm"
            data-testid="reset-confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="pl-10 h-11 bg-background/40 border-white/10 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      {error && (
        <div
          data-testid="reset-error"
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        data-testid="reset-submit"
        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/30"
        disabled={loading || !password || !confirm}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mise à jour...
          </>
        ) : (
          "Mettre à jour le mot de passe"
        )}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
      <div className="orb w-[420px] h-[420px] -top-32 -left-32 bg-primary/35" />
      <div className="orb w-[480px] h-[480px] bottom-0 right-0 bg-cyan-500/20" style={{ animationDelay: "-6s" }} />

      <Link
        href="/auth/login"
        data-testid="back-to-login"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Connexion
      </Link>

      <div className="w-full max-w-md fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-500/60 grid place-items-center shadow-lg shadow-primary/30 ring-1 ring-primary/30">
              <span className="text-xs font-black text-primary-foreground">WW</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-gradient-primary">WW</span>
              <span className="text-foreground">Embed</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground mt-2">Choisis un mot de passe sécurisé.</p>
        </div>

        <Suspense fallback={<div className="text-muted-foreground text-center">Chargement...</div>}>
          <ResetPasswordInner />
        </Suspense>
      </div>
    </div>
  )
}
