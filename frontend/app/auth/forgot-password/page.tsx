"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { Loader2, Mail, ArrowLeft, MailCheck } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Erreur lors de l'envoi")
      }
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
      <div className="orb w-[420px] h-[420px] -top-32 -left-32 bg-primary/35" />
      <div className="orb w-[480px] h-[480px] bottom-0 right-0 bg-cyan-500/20" style={{ animationDelay: "-6s" }} />

      <Link
        href="/auth/login"
        data-testid="back-to-login"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour à la connexion
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
          <h1 className="text-3xl font-bold tracking-tight">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground mt-2">
            On t'envoie un lien pour en choisir un nouveau.
          </p>
        </div>

        {sent ? (
          <div
            data-testid="forgot-success"
            className="glass-strong rounded-2xl p-7 ring-glow space-y-4 text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 ring-1 ring-primary/30 grid place-items-center">
              <MailCheck className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Vérifie ta boîte mail</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si un compte existe pour <span className="text-foreground font-medium">{email}</span>,
              tu recevras un lien de réinitialisation dans quelques secondes. Le lien expire dans
              30 minutes.
            </p>
            <p className="text-xs text-muted-foreground/80 pt-2">
              Pense à vérifier tes spams. Pas reçu ?{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                data-testid="forgot-resend"
                className="text-primary hover:underline underline-offset-4"
              >
                Réessayer
              </button>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="glass-strong rounded-2xl p-7 space-y-5 ring-glow"
            data-testid="forgot-form"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  data-testid="forgot-email"
                  type="email"
                  placeholder="email@exemple.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-background/40 border-white/10 focus-visible:ring-primary/50"
                />
              </div>
            </div>

            {error && (
              <div
                data-testid="forgot-error"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-testid="forgot-submit"
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/30"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...
                </>
              ) : (
                "Envoyer le lien"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
