/**
 * MongoDB-backed TMDB cache.
 *
 * Replaces the per-process in-memory `Map` cache that used to live in
 * `app/api/admin/stats/route.ts`. On serverless / multi-instance hosting
 * the in-memory cache hit-rate is near zero (every cold start refetches
 * everything from TMDB). The Mongo cache is shared across instances,
 * survives restarts, and gets auto-purged after 7 days by the TTL index
 * declared in `lib/mongo/db.ts`.
 *
 * Usage:
 *   const hit = await getTmdbCached("movie", 12345)
 *   if (!hit) { ... call TMDB ... await putTmdbCached("movie", 12345, payload) }
 */
import { getDb } from "@/lib/mongo/db"

const TMDB_KEY = process.env.TMDB_API_KEY || ""
const TMDB_IMG = "https://image.tmdb.org/t/p/w92"

export interface TmdbCacheEntry {
  title: string
  poster: string | null
}

export async function fetchTmdbCached(
  type: "movie" | "tv",
  id: number
): Promise<TmdbCacheEntry> {
  if (!id || (type !== "movie" && type !== "tv")) {
    return { title: `#${id}`, poster: null }
  }
  const key = `${type}/${id}`
  const db = await getDb()
  const coll = db.collection("tmdb_cache")

  const hit = await coll.findOne({ key })
  if (hit && hit.title) {
    return { title: hit.title, poster: hit.poster ?? null }
  }

  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=fr-FR`,
      { next: { revalidate: 21600 } }
    )
    if (!r.ok) throw new Error(`tmdb ${r.status}`)
    const j: any = await r.json()
    const entry: TmdbCacheEntry = {
      title: j.title || j.name || `#${id}`,
      poster: j.poster_path ? `${TMDB_IMG}${j.poster_path}` : null,
    }
    // Upsert with a fresh _ttl (Date) so the TTL index keeps the row alive.
    await coll.updateOne(
      { key },
      {
        $set: { ...entry, key, _ttl: new Date() },
      },
      { upsert: true }
    )
    return entry
  } catch {
    // Cache the negative result for a short time so we don't hammer TMDB.
    const fallback: TmdbCacheEntry = { title: `#${id}`, poster: null }
    await coll
      .updateOne(
        { key },
        { $set: { ...fallback, key, _ttl: new Date(Date.now() - 6 * 86400 * 1000) } },
        { upsert: true }
      )
      .catch(() => {})
    return fallback
  }
}
