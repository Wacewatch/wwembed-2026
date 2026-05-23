/**
 * Redis-backed TMDB cache.
 *
 * Remplace l'ancien cache Mongo (`tmdb_cache` collection + TTL index). Le
 * profil de cette donnée — clé/valeur pure, TTL court (7 j), aucune requête
 * analytique — en fait un candidat idéal pour Redis :
 *   • TTL géré nativement par Redis (SET ... EX) → aucune purge applicative
 *     ni cron de nettoyage, contrairement à une table Postgres où la colonne
 *     `ttl` devrait être balayée manuellement.
 *   • Écritures en mémoire → aucune pression d'I/O sur PostgreSQL/TimescaleDB
 *     à chaque miss TMDB (c'était une source connue de croissance RAM côté
 *     process avec l'ancien `_tmdb_route_cache`).
 *   • Partagé entre instances et survit aux redémarrages applicatifs.
 *
 * ioredis est déjà une dépendance du frontend (utilisée par admin/live et
 * admin/stats) ; on réutilise le client partagé `lib/redis`.
 *
 * Clé Redis :  tmdb:<type>/<id>     ex. "tmdb:movie/12345"
 * Valeur     :  JSON { title, poster }
 *
 * Usage (inchangé pour les appelants) :
 *   const entry = await fetchTmdbCached("movie", 12345)
 */
import { getRedis } from "@/lib/redis"

const TMDB_KEY = process.env.TMDB_API_KEY || ""
const TMDB_IMG = "https://image.tmdb.org/t/p/w92"

// TTL positifs : 7 jours (équivalent du TTL index Mongo d'origine).
const TTL_HIT_SEC = 7 * 86400
// TTL négatif court (~24 h) : en Mongo, le fallback était inséré avec un _ttl
// daté de 6 jours dans le passé, ce qui le faisait purger ~1 jour plus tard par
// l'index TTL de 7 j. On reproduit exactement ce comportement ici.
const TTL_MISS_SEC = 86400

export interface TmdbCacheEntry {
  title: string
  poster: string | null
}

function cacheKey(type: "movie" | "tv", id: number): string {
  return `tmdb:${type}/${id}`
}

export async function fetchTmdbCached(
  type: "movie" | "tv",
  id: number
): Promise<TmdbCacheEntry> {
  if (!id || (type !== "movie" && type !== "tv")) {
    return { title: `#${id}`, poster: null }
  }
  const key = cacheKey(type, id)
  const redis = getRedis()

  // 1) Lecture cache. Toute erreur Redis est non-fatale : on retombe sur TMDB.
  try {
    const raw = await redis.get(key)
    if (raw) {
      const hit = JSON.parse(raw) as TmdbCacheEntry
      if (hit && hit.title) {
        return { title: hit.title, poster: hit.poster ?? null }
      }
    }
  } catch {
    // cache indisponible → on continue vers TMDB
  }

  // 2) Miss → appel TMDB.
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
    try {
      await redis.set(key, JSON.stringify(entry), "EX", TTL_HIT_SEC)
    } catch {
      // écriture cache best-effort
    }
    return entry
  } catch {
    // Cache négatif court pour ne pas marteler TMDB sur les ids cassés.
    const fallback: TmdbCacheEntry = { title: `#${id}`, poster: null }
    try {
      await redis.set(key, JSON.stringify(fallback), "EX", TTL_MISS_SEC)
    } catch {
      // best-effort
    }
    return fallback
  }
}
