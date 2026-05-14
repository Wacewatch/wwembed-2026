/**
 * Public fiche page for a TV show.
 *   /tv/[tmdbId]
 *
 * Same pattern as /movie/[tmdbId] — SSR + OG metadata + JSON-LD.
 */
import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { getTVDetails, getPosterUrl, getBackdropUrl } from "@/lib/tmdb"
import { getDb } from "@/lib/mongo/db"

interface Props {
  params: Promise<{ tmdbId: string }>
}

async function loadShow(tmdbId: number) {
  try {
    const tm = await getTVDetails(tmdbId)
    if (!tm) return null
    const db = await getDb()
    const wwId = `ww-tv-${tmdbId}`
    const [streaming, download] = await Promise.all([
      db.collection("streaming_links").find({ tmdb_id: tmdbId, media_type: "tv", is_active: { $ne: false } }).toArray(),
      db.collection("download_links").find({ tmdb_id: tmdbId, media_type: "tv", is_active: { $ne: false } }).toArray(),
    ])
    return { tm, wwId, streaming, download }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tmdbId } = await params
  const id = parseInt(tmdbId, 10)
  if (!id) return { title: "Série introuvable" }
  const data = await loadShow(id)
  if (!data) return { title: "Série introuvable" }
  const { tm } = data
  const title = `${tm.name} — Streaming & téléchargement | WWEmbed`
  const description = (tm.overview || "Découvrez cette série sur WWEmbed.").slice(0, 200)
  const poster = tm.poster_path ? getPosterUrl(tm.poster_path, "w500") : null
  const backdrop = tm.backdrop_path ? getBackdropUrl(tm.backdrop_path, "w780") : null
  const og = backdrop || poster
  const url = `${process.env.PUBLIC_APP_URL || ""}/tv/${id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "video.tv_show",
      images: og ? [{ url: og, width: 780, height: 439, alt: tm.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: og ? [og] : undefined,
    },
  }
}

export default async function TvPage({ params }: Props) {
  const { tmdbId } = await params
  const id = parseInt(tmdbId, 10)
  if (!id) notFound()
  const data = await loadShow(id)
  if (!data) notFound()
  const { tm, wwId, streaming, download } = data

  const poster = tm.poster_path ? getPosterUrl(tm.poster_path, "w500") : null
  const backdrop = tm.backdrop_path ? getBackdropUrl(tm.backdrop_path, "original") : null
  const year = tm.first_air_date ? tm.first_air_date.slice(0, 4) : ""

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: tm.name,
    image: poster,
    description: tm.overview,
    datePublished: tm.first_air_date,
    numberOfSeasons: tm.number_of_seasons,
    numberOfEpisodes: tm.number_of_episodes,
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
          data-testid="tv-backdrop"
        />
      )}
      <main className="container mx-auto -mt-32 sm:-mt-48 relative z-10 px-4 pb-16">
        <div className="grid md:grid-cols-[260px_1fr] gap-8">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={tm.name}
              className="w-full rounded-xl shadow-2xl shadow-black/40 ring-1 ring-white/10"
              data-testid="tv-poster"
            />
          )}
          <div className="space-y-4 text-foreground">
            <h1 className="text-3xl sm:text-5xl font-bold" data-testid="tv-title">
              {tm.name}{" "}
              {year && <span className="text-muted-foreground font-normal text-2xl">({year})</span>}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm">
              {tm.vote_average ? (
                <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                  ★ {tm.vote_average.toFixed(1)} / 10
                </span>
              ) : null}
              {tm.number_of_seasons ? (
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  {tm.number_of_seasons} saisons
                </span>
              ) : null}
              {tm.number_of_episodes ? (
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  {tm.number_of_episodes} épisodes
                </span>
              ) : null}
              {tm.genres?.map((g) => (
                <span key={g.id} className="px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {g.name}
                </span>
              ))}
            </div>
            {tm.overview && <p className="text-base leading-relaxed text-foreground/90">{tm.overview}</p>}

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
                <div className="rounded-xl border border-border p-4 bg-card">
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                    Streaming ({streaming.length})
                  </h3>
                  {streaming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune source pour l'instant.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {streaming.slice(0, 6).map((s: any, i) => (
                        <li key={i} className="flex justify-between">
                          <span className="truncate">{s.provider || s.host_name || "Source"}</span>
                          <span className="text-muted-foreground text-xs">
                            S{s.season_number}E{s.episode_number} {s.quality || ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-border p-4 bg-card">
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                    Téléchargement ({download.length})
                  </h3>
                  {download.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune source pour l'instant.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {download.slice(0, 6).map((d: any, i) => (
                        <li key={i} className="flex justify-between">
                          <span className="truncate">{d.provider || d.host_name || "Source"}</span>
                          <span className="text-muted-foreground text-xs">
                            S{d.season_number}E{d.episode_number} {d.quality || ""}
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
