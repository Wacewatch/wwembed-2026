"use client"

import Link from "next/link"
import { ArrowLeft, BookOpen, Code, Tv, Download, Play, List } from "lucide-react"
import { useState } from "react"

const PREVIEW_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://wavewatch.top"

type Section = {
  id: string
  icon: any
  title: string
  description: string
  url: string
  exampleUrl: string
  jsonResponse?: string
  notes?: string[]
}

const SECTIONS: Section[] = [
  {
    id: "streaming",
    icon: Play,
    title: "Streaming (films & séries)",
    description:
      "URL d'embed iframe pour lire un film ou un épisode de série en streaming. Le lecteur s'ouvre directement avec un sélecteur de sources.",
    url: "/api/v1/streaming/{ww_id}",
    exampleUrl: "/api/v1/streaming/ww-movie-27205",
    notes: [
      "Format film : ww-movie-{tmdb_id} — ex : ww-movie-27205 (Inception)",
      "Format série : ww-tv-{tmdb_id}-s{season}-e{episode} — ex : ww-tv-1399-s1-e1 (Game of Thrones S01E01)",
      "À utiliser dans une iframe : <iframe src=\"...\" allowfullscreen></iframe>",
    ],
  },
  {
    id: "download",
    icon: Download,
    title: "Téléchargement (films, séries, ebooks, jeux, logiciels, musique)",
    description:
      "URL d'embed pour la page de téléchargement. Liste les liens directs DB + sources externes (movix, sources alternatives).",
    url: "/api/v1/download/{ww_id}",
    exampleUrl: "/api/v1/download/ww-movie-27205",
    notes: [
      "Films / séries : même format que streaming (ww-movie-* ou ww-tv-*)",
      "Ebooks : ww-ebook-{id} — ex : ww-ebook-579975",
      "Logiciels : ww-soft-{id} ou ww-software-{id}",
      "Jeux : ww-game-{id}",
      "Musique : ww-music-{id}",
    ],
  },
  {
    id: "live",
    icon: Tv,
    title: "TV en direct",
    description:
      "URL d'embed pour une chaîne TV live. Utilise le ww_id retourné par l'endpoint liste ci-dessous.",
    url: "/api/v1/live/{ww_id}",
    exampleUrl: "/api/v1/live/ww-live-cc0461f590ca4cb1a3bf5152",
    notes: [
      "Le ww_id commence toujours par ww-live-",
      "Récupère la liste complète des chaînes via l'endpoint JSON ci-dessous",
    ],
  },
  {
    id: "livetv-list",
    icon: List,
    title: "Liste des chaînes TV (JSON)",
    description:
      "Retourne toutes les chaînes TV actives avec leur ww_id et URL d'embed prêts à utiliser. Filtres optionnels : ?country=fr&category=sport",
    url: "/api/v1/livetv",
    exampleUrl: "/api/v1/livetv?country=fr&category=sport",
    jsonResponse: `{
  "count": 12,
  "channels": [
    {
      "ww_id": "ww-live-cc0461f590ca4cb1a3bf5152",
      "embed_url": "${PREVIEW_BASE}/api/v1/live/ww-live-cc0461f590ca4cb1a3bf5152",
      "name": "bEIN Sport 1",
      "country": "fr",
      "category": "sport",
      "language": "fr",
      "logo": "https://..."
    },
    {
      "ww_id": "ww-live-...",
      "embed_url": "${PREVIEW_BASE}/api/v1/live/ww-live-...",
      "name": "Canal+ Foot",
      ...
    }
  ]
}`,
  },
  {
    id: "links-json",
    icon: Code,
    title: "Liste des liens d'un média (JSON)",
    description:
      "Retourne en JSON les sources streaming + download pour un film ou une série donné·e.",
    url: "/api/v1/links/{ww_id}",
    exampleUrl: "/api/v1/links/ww-movie-27205",
    jsonResponse: `{
  "ww_id": "ww-movie-27205",
  "tmdb_id": 27205,
  "media_type": "movie",
  "streaming": [
    {
      "id": "auto-...",
      "source_name": "VidSrc",
      "source_url": "https://vidsrc.xyz/embed/movie/27205",
      "quality": "HD",
      "language": "multi",
      "is_auto": true
    }
  ],
  "download": [
    {
      "id": "...",
      "source_name": "1Fichier",
      "source_url": "https://...",
      "link_type": "direct",
      "quality": "1080p",
      "file_size": "4.5 GB",
      "language": "VF"
    }
  ]
}`,
  },
]

function CodeBlock({ children, copyable = true }: { children: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      <pre className="bg-black/60 border border-white/10 rounded-lg p-4 text-xs md:text-sm text-cyan-100 overflow-x-auto font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
      {copyable && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(children)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          data-testid={`copy-${children.slice(0, 20).replace(/[^a-z0-9]/gi, "-")}`}
          className="absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-white/5 border border-white/10 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          {copied ? "✓ copié" : "copier"}
        </button>
      )}
    </div>
  )
}

export default function ApiDocsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb w-[420px] h-[420px] -top-32 -left-32 bg-primary/30 pointer-events-none" />
      <div
        className="orb w-[480px] h-[480px] bottom-0 right-0 bg-cyan-500/15 pointer-events-none"
        style={{ animationDelay: "-6s" }}
      />

      <div className="relative max-w-[960px] mx-auto px-6 py-10">
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
            spec OpenAPI brute
          </a>
        </div>

        {/* Hero */}
        <div className="mb-10 fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle text-xs uppercase tracking-wider text-primary/90 mb-5">
            <BookOpen className="w-3.5 h-3.5" />
            Documentation API
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gradient-primary">WWEmbed</span> API
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            Toutes les URLs d'embed et les endpoints JSON dont vous avez besoin pour intégrer
            WWEmbed dans votre site. Pas de clé API, pas d'authentification, prêt à l'emploi.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon
            const fullEx = `${PREVIEW_BASE}${s.exampleUrl}`
            return (
              <section
                key={s.id}
                data-testid={`section-${s.id}`}
                className="glass-strong rounded-2xl p-6 md:p-7 ring-glow"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-1">
                      {s.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </div>

                {/* URL pattern */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                    URL
                  </div>
                  <CodeBlock copyable={false}>
                    {`GET ${s.url}`}
                  </CodeBlock>
                </div>

                {/* Example */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                    Exemple
                  </div>
                  <CodeBlock>{fullEx}</CodeBlock>
                  <a
                    href={s.exampleUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={`try-${s.id}`}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
                  >
                    Tester dans un nouvel onglet →
                  </a>
                </div>

                {/* Notes */}
                {s.notes && s.notes.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                      Formats acceptés
                    </div>
                    <ul className="space-y-1.5 text-sm text-foreground/80">
                      {s.notes.map((n, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="text-primary shrink-0">›</span>
                          <span className="font-mono text-[12.5px]">{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* JSON response */}
                {s.jsonResponse && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                      Réponse JSON
                    </div>
                    <CodeBlock>{s.jsonResponse}</CodeBlock>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-5 rounded-xl glass-subtle border border-white/5 text-center fade-up">
          <p className="text-sm text-muted-foreground">
            Toutes les routes embed s'intègrent dans une <code className="text-primary font-mono text-[12px] mx-1">&lt;iframe&gt;</code>
            avec <code className="text-primary font-mono text-[12px] mx-1">allowfullscreen</code>.
            Les endpoints JSON acceptent le CORS depuis n'importe quelle origine.
          </p>
        </div>
      </div>
    </div>
  )
}
