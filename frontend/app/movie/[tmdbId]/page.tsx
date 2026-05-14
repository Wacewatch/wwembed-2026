/**
 * Public fiche page for a movie.
 *   /movie/[tmdbId]
 *
 * SSR with full OG metadata for shareability (Discord / Twitter / WhatsApp
 * preview cards) + JSON-LD VideoObject for SEO.
 *
 * Lists every Wave Watch source available for this title so visitors can
 * pick a streaming / download / digital link directly.
 */
import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { getMovieDetails, getPosterUrl, getBackdropUrl } from "@/lib/tmdb"
import { getDb } from "@/lib/mongo/db"

interface Props {
  params: Promise<{ tmdbId: string }>
}

async function loadMovie(tmdbId: number) {
  try {
    const tm = await getMovieDetails(tmdbId)
    if (!tm) return null
    const db = await getDb()
    const wwId = `ww-movie-${tmdbId}`
    const [streaming, download] = await Promise.all([
      db.collection("streaming_links").find({ tmdb_id: tmdbId, media_type: "movie", is_active: { $ne: false } }).toArray(),
      db.collection("download_links").find({ tmdb_id: tmdbId, media_type: "movie", is_active: { $ne: false } }).toArray(),
    ])
    return { tm, wwId, streaming, download }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tmdbId } = await params
  const id = parseInt(tmdbId, 10)
  if (!id) return { title: "Film introuvable" }
  const data = await loadMovie(id)
  if (!data) return { title: "Film introuvable" }
  const { tm } = data
  const title = `${tm.title} — Streaming & téléchargement | WWEmbed`
  const description = (tm.overview || "Découvrez ce film sur WWEmbed.").slice(0, 200)
  const poster = tm.poster_path ? getPosterUrl(tm.poster_path, "w500") : null
  const backdrop = tm.backdrop_path ? getBackdropUrl(tm.backdrop_path, "w780") : null
  const og = backdrop || poster
  const url = `${process.env.PUBLIC_APP_URL || ""}/movie/${id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "video.movie",
      images: og ? [{ url: og, width: 780, height: 439, alt: tm.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: og ? [og] : undefined,
    },
  }
}

function sanitize<T>(rows: any[]): T[] {
  return rows.map((r) => ({ ...r, _id: undefined })) as T[]
}

export default async function MoviePage({ params }: Props) {
  const { tmdbId } = await params
  const id = parseInt(tmdbId, 10)
  if (!id) notFound()
  const data = await loadMovie(id)
  if (!data) notFound()
  const { tm, wwId, streaming, download } = data

  const poster = tm.poster_path ? getPosterUrl(tm.poster_path, "w500") : null
  const backdrop = tm.backdrop_path ? getBackdropUrl(tm.backdrop_path, "original") : null
  const year = tm.release_date ? tm.release_date.slice(0, 4) : ""

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: tm.title,
    image: poster,
    description: tm.overview,
    datePublished: tm.release_date,
    aggregateRating: tm.vote_count
      ? {
          "@type": "AggregateRating",
          ratingValue: tm.vote_average,
          ratingCount: tm.vote_count,
          bestRating: 10,
        }
      : undefined,
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {backdrop && (
        <div
          className="h-72 sm:h-96 w-full bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${backdrop})` }}
          aria-hidden
          data-testid="movie-backdrop"
        />
      )}
      <main className="container mx-auto -mt-32 sm:-mt-48 relative z-10 px-4 pb-16">
        <div className="grid md:grid-cols-[260px_1fr] gap-8">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={tm.title}
              className="w-full rounded-xl shadow-2xl shadow-black/40 ring-1 ring-white/10"
              data-testid="movie-poster"
            />
          )}
          <div className="space-y-4 text-foreground">
            <h1 className="text-3xl sm:text-5xl font-bold" data-testid="movie-title">
              {tm.title}{" "}
              {year && <span className="text-muted-foreground font-normal text-2xl">({year})</span>}
            </h1>
            {(tm as any).tagline && <p className="italic text-muted-foreground">{(tm as any).tagline}</p>}
            <div className="flex flex-wrap gap-3 text-sm">
              {tm.vote_average ? (
                <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                  ★ {tm.vote_average.toFixed(1)} / 10
                </span>
              ) : null}
              {tm.runtime ? (
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  {tm.runtime} min
                </span>
              ) : null}
              {tm.genres?.map((g) => (
                <span key={g.id} className="px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {g.name}
                </span>
              ))}
            </div>
            {tm.overview && (
              <p className="text-base leading-relaxed text-foreground/90">{tm.overview}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href={`/embed/${wwId}`}
                className="px-5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
                data-testid="play-now-btn"
              >
                ▶ Lecture
              </Link>
              <Link
                href={`/embed/${wwId}/stats`}
                className="px-5 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition"
                data-testid="see-stats-btn"
              >
                📊 Stats
              </Link>
            </div>

            <section className="pt-6">
              <h2 className="text-xl font-semibold mb-3">Sources disponibles</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border p-4 bg-card" data-testid="streaming-sources-card">
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                    Streaming ({streaming.length})
                  </h3>
                  {streaming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune source streaming pour l'instant.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {sanitize<any>(streaming).slice(0, 6).map((s, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate">{s.provider || s.host_name || "Source"}</span>
                          <span className="text-muted-foreground text-xs">{s.quality || s.language || ""}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-border p-4 bg-card" data-testid="download-sources-card">
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                    Téléchargement ({download.length})
                  </h3>
                  {download.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune source de téléchargement pour l'instant.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {sanitize<any>(download).slice(0, 6).map((d, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate">{d.provider || d.host_name || "Source"}</span>
                          <span className="text-muted-foreground text-xs">
                            {d.quality || ""} {d.language ? `· ${d.language}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
    </div>
  )
}
