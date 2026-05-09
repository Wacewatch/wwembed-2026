"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Shield, LayoutDashboard, Home } from "lucide-react"
import type { Profile } from "@/lib/types"

export function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser) {
        // With JWT auth, /api/auth/me returns the profile-shaped user directly
        setUser(authUser as unknown as Profile)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/"
  }

  const navLink = (href: string, label: string, Icon?: any, active?: boolean) => (
    <Link
      href={href}
      data-testid={`nav-${label.toLowerCase()}`}
      className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
      {active && (
        <span className="absolute inset-0 rounded-full bg-primary/10 -z-10 ring-1 ring-primary/20" />
      )}
    </Link>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-xl bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="logo-link">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500/60 grid place-items-center shadow-lg shadow-primary/20">
            <span className="text-[10px] font-black tracking-tighter text-primary-foreground">WW</span>
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-gradient-primary">WW</span>
            <span className="text-foreground">Embed</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-0.5 mr-2 glass-subtle rounded-full px-1 py-0.5">
            {navLink("/", "Accueil", Home, pathname === "/")}
            {!loading && user && navLink("/dashboard", "Dashboard", LayoutDashboard, pathname === "/dashboard")}
            {!loading && user && user.role === "admin" &&
              navLink("/admin", "Admin", Shield, pathname.startsWith("/admin"))}
          </div>

          {!loading && user && (
            <>
              <span
                className="hidden md:inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
                data-testid="user-role-badge"
              >
                {user.role}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="logout-button"
                className="gap-1.5 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </>
          )}

          {!loading && !user && (
            <Link href="/auth/login" data-testid="login-link">
              <Button
                size="sm"
                className="rounded-full px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                Connexion
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
