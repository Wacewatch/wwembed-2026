"use client"

import type React from "react"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, ArrowLeft, ShieldCheck, Mail, Lock } from "lucide-react"

function SetupPasswordInner() {
  const params = useSearchParams()
  const router = useRouter()
  const prefilledEmail = params.get("email") || ""

  const [email, setEmail] = useState(prefilledEmail)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [adminCode, setAdminCode] = useState("")
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
    if (!adminCode.trim()) {
      setError("Le code admin est requis")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, admin_code: adminCode }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Erreur lors de la création")
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

  if (success) {
    return (
      <div
        data-testid="setup-success"
        className="glass-strong rounded-2xl p-7 ring-glow text-center space-y-4"
      >
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 ring-1 ring-primary/30 grid place-items-center">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Mot de passe créé</h2>
        <p className="text-sm text-muted-foreground">Redirection vers le dashboard...</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-strong rounded-2xl p-7 space-y-5 ring-glow"
      data-testid="setup-form"
    >
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Email du compte
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            data-testid="setup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={!!prefilledEmail}
            className="pl-10 h-11 bg-background/40 border-white/10 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Nouveau mot de passe
        </Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            data-testid="setup-password"
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
            data-testid="setup-confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="pl-10 h-11 bg-background/40 border-white/10 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-code" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Code admin de confirmation
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="admin-code"
            data-testid="setup-admin-code"
            type="password"
            required
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="Code fourni par l'administrateur"
            className="pl-10 h-11 bg-background/40 border-white/10 focus-visible:ring-primary/50"
          />
        </div>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Ce code est nécessaire pour confirmer la création du mot de passe pour un compte existant.
        </p>
      </div>

      {error && (
        <div
          data-testid="setup-error"
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        data-testid="setup-submit"
        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/30"
        disabled={loading || !email || !password || !confirm || !adminCode}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création...
          </>
        ) : (
          "Créer le mot de passe"
        )}
      </Button>
    </form>
  )
}

export default function SetupPasswordPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Créer un mot de passe</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
            Ton compte existe déjà mais n'a pas encore de mot de passe. Crée-en un et confirme avec le code admin.
          </p>
        </div>

        <Suspense fallback={<div className="text-muted-foreground text-center">Chargement...</div>}>
          <SetupPasswordInner />
        </Suspense>
      </div>
    </div>
  )
}
