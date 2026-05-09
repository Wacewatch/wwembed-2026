"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, Mail, KeyRound, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push("/dashboard")
      router.refresh()
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
        href="/"
        data-testid="back-home"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
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
          <h1 className="text-3xl font-bold tracking-tight">Bon retour</h1>
          <p className="text-sm text-muted-foreground mt-2">Connectez-vous pour accéder à votre dashboard</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="glass-strong rounded-2xl p-7 space-y-5 ring-glow"
          data-testid="login-form"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                data-testid="login-email"
                type="email"
                placeholder="email@exemple.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 bg-background/40 border-white/10 focus-visible:ring-primary/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Mot de passe
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                data-testid="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-11 bg-background/40 border-white/10 focus-visible:ring-primary/50"
              />
            </div>
          </div>

          {error && (
            <div
              data-testid="login-error"
              className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            data-testid="login-submit"
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/30"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connexion...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground pt-1 space-y-2">
            <div>
              <Link
                href="/auth/forgot-password"
                data-testid="goto-forgot"
                className="text-primary/80 hover:text-primary hover:underline underline-offset-4 text-xs"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div>
              Pas encore de compte ?{" "}
              <Link
                href="/auth/sign-up"
                data-testid="goto-signup"
                className="text-primary hover:underline underline-offset-4 font-medium"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
