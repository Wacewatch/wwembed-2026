"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()
        setUser(profile)
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

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="font-bold text-2xl">
            <span className="text-primary">WW</span>
            <span className="text-foreground">Embed</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className={`text-sm ${pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Accueil
          </Link>

          {!loading && user && (
            <>
              <Link
                href="/dashboard"
                className={`text-sm ${pathname === "/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Dashboard
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={`text-sm ${pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Admin
                </Link>
              )}
              <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">{user.role}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Déconnexion
              </Button>
            </>
          )}

          {!loading && !user && (
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Connexion
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
