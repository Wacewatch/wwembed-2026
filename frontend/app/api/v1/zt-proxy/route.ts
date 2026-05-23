/**
 * GET /api/v1/zt-proxy
 *
 * Server-side cache proxy for the ZT external API
 * (https://apis.wavewatch.top/zt.php). 1h cache backed by the `zt_cache`
 * table (PostgreSQL), configurable via ZT_CACHE_TTL_MS.
 *
 * Choix Postgres (pas Redis) : fallback "stale-on-error" (sert l'entrée périmée
 * si l'upstream échoue) → on doit conserver l'entrée après expiration, ce qu'un
 * TTL Redis ne permet pas. La colonne expires_at + comparaison à la lecture
 * reproduit exactement ce comportement.
 *
 * The upstream API for TV searches can take ~15s — caching brings repeat
 * visits down to ~30ms. Same query signature → same cached payload.
 *
 * Query params (forwarded verbatim to ZT):
 *   - type   (movie | tv | anime | jeux | musique | ebook | logiciel ...)
 *   - id     (TMDB id, for movie/tv)
 *   - s, e   (season + episode, for tv)
 *   - q      (search text, used by digital types)
 *
 * Cache table: `zt_cache`
 *   key: deterministic SHA-256 hex of the query string
 *   data: JSON response
 *   cached_at / expires_at: timestamptz
 */
import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { getPool } from "@/lib/pg/db"

const ZT_UPSTREAM = "https://apis.wavewatch.top/zt.php"
const TTL_MS = Number(process.env.ZT_CACHE_TTL_MS) || 60 * 60_000 // 1 hour
const ALLOWED_TYPES = new Set([
  "movie",
  "tv",
  "anime",
  "jeux",
  "musique",
  "ebook",
  "logiciel",
  "documentaire",
  "emission",
  "spectacle",
  "concert",
  "sport",
  "auto",
  "formation",
])

function buildCacheKey(params: Record<string, string>) {
  const ordered = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&")
  return createHash("sha256").update(ordered).digest("hex")
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const type = (url.searchParams.get("type") || "").toLowerCase().trim()
  const id = (url.searchParams.get("id") || "").trim()
  const s = (url.searchParams.get("s") || "").trim()
  const e = (url.searchParams.get("e") || "").trim()
  const q = (url.searchParams.get("q") || "").trim().slice(0, 200)

  if (!type || !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid or missing 'type'" }, { status: 400 })
  }
  if (!id && !q) {
    return NextResponse.json({ error: "Either 'id' or 'q' is required" }, { status: 400 })
  }

  const pool = getPool()

  const params: Record<string, string> = { _route: "api", type }
  if (id) params.id = id
  if (s) params.s = s
  if (e) params.e = e
  if (q) params.q = q
  const cacheKey = buildCacheKey(params)

  // 1) Try cache
  let cached: { data: any; expires_at: string | null } | null = null
  try {
    const r = await pool.query<{ data: any; expires_at: string | null }>(
      `SELECT data, expires_at FROM zt_cache WHERE key = $1 LIMIT 1`,
      [cacheKey]
    )
    cached = r.rows[0] || null
  } catch {
    cached = null
  }

  const now = Date.now()
  if (cached && cached.expires_at && new Date(cached.expires_at).getTime() > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "X-ZT-Cache": "HIT",
        "Cache-Control": "public, max-age=60",
      },
    })
  }

  // 2) Fetch upstream
  const upstreamQs = new URLSearchParams(params).toString()
  const upstreamUrl = `${ZT_UPSTREAM}?${upstreamQs}`

  try {
    const ctrl = new AbortController()
    const tm = setTimeout(() => ctrl.abort(), 25_000)
    const res = await fetch(upstreamUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "WWEmbed-ZT-Proxy/1.0" },
    })
    clearTimeout(tm)

    if (!res.ok) {
      // Serve stale cache if we have one, otherwise propagate error.
      if (cached) {
        return NextResponse.json(cached.data, { headers: { "X-ZT-Cache": "STALE" } })
      }
      return NextResponse.json({ error: "Upstream " + res.status }, { status: 502 })
    }

    const data = await res.json()
    const expires_at = new Date(now + TTL_MS).toISOString()

    // Ne cache PAS les réponses « vides » (totalLinks=0 ou liste de résultats vide).
    // Évite de figer pendant 1h des résultats où le scraper upstream a échoué :
    // dès qu'une version corrigée est en ligne, l'appel suivant retentera l'upstream.
    const isEmpty =
      (typeof data?.totalLinks === "number" && data.totalLinks === 0) ||
      (Array.isArray(data?.results) && data.results.length === 0)

    if (!isEmpty) {
      await pool
        .query(
          `INSERT INTO zt_cache (key, cached_at, expires_at, data)
           VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT (key) DO UPDATE
             SET cached_at = EXCLUDED.cached_at,
                 expires_at = EXCLUDED.expires_at,
                 data = EXCLUDED.data`,
          [cacheKey, new Date(now).toISOString(), expires_at, JSON.stringify(data)]
        )
        .catch(() => {})
    }

    return NextResponse.json(data, {
      headers: {
        "X-ZT-Cache": isEmpty ? "MISS-NOCACHE" : "MISS",
        "Cache-Control": "public, max-age=60",
      },
    })
  } catch (err: any) {
    if (cached) {
      return NextResponse.json(cached.data, { headers: { "X-ZT-Cache": "STALE-ERR" } })
    }
    return NextResponse.json({ error: "Upstream failed", detail: String(err?.message || err) }, { status: 502 })
  }
}

export const dynamic = "force-dynamic"
