"use client"

/**
 * /api-docs — Interactive Swagger UI for the WWEmbed public API.
 * Loads the spec from /api/openapi.
 */
import { useEffect } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft, BookOpen, Github } from "lucide-react"
import "./swagger.css"

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false })

export default function ApiDocsPage() {
  useEffect(() => {
    // Suppress noisy "deprecated lifecycle methods" warnings from swagger-ui's
    // internal React tree (we cannot fix those upstream).
    const orig = console.error
    console.error = (...args) => {
      const msg = args[0]
      if (typeof msg === "string" && /componentWill|UNSAFE_/.test(msg)) return
      orig.apply(console, args)
    }
    return () => {
      console.error = orig
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb w-[420px] h-[420px] -top-32 -left-32 bg-primary/30 pointer-events-none" />
      <div
        className="orb w-[480px] h-[480px] bottom-0 right-0 bg-cyan-500/15 pointer-events-none"
        style={{ animationDelay: "-6s" }}
      />

      <div className="relative max-w-[1200px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fade-up">
          <Link
            href="/"
            data-testid="back-home"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <a
            href="/api/openapi"
            target="_blank"
            rel="noreferrer"
            data-testid="raw-spec-link"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Github className="w-3.5 h-3.5" /> spec OpenAPI brute
          </a>
        </div>

        {/* Hero */}
        <div className="mb-10 fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle text-xs uppercase tracking-wider text-primary/90 mb-5">
            <BookOpen className="w-3.5 h-3.5" />
            Documentation API
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-gradient-primary">WWEmbed</span> API
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Toutes les routes HTTP exposées par WWEmbed — embeds, statistiques, auth, base de
            données générique. Endpoints prêts à tester depuis le navigateur (les cookies de
            session sont envoyés automatiquement).
          </p>
        </div>

        {/* Swagger Container */}
        <div
          data-testid="swagger-container"
          className="glass-strong rounded-2xl p-3 md:p-6 ring-glow fade-up-delay-1"
        >
          <SwaggerUI
            url="/api/openapi"
            docExpansion="list"
            defaultModelsExpandDepth={-1}
            tryItOutEnabled
            persistAuthorization
            requestInterceptor={(req: any) => {
              // Ensure cookies (ww_access) are forwarded for authenticated routes
              req.credentials = "include"
              return req
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Auth : cookies httpOnly posés automatiquement après <code className="text-primary">/api/auth/login</code>. Pour tester ici un endpoint protégé, connecte-toi d'abord dans un autre onglet.
        </p>
      </div>
    </div>
  )
}
