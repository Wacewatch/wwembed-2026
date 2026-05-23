/**
 * GET /api/v1/dark-proxy
 *
 * Server-side cache proxy for the Dark / movix.tax external API
 * (apis.wavewatch.top/darkdl.php). 1h cache backed by the `dark_cache`
 * table (PostgreSQL).
 *
 * Choix Postgres (pas Redis) : ce cache implémente un fallback "stale-on-error"
 * — si l'upstream échoue, on sert l'entrée même périmée (header STALE). Cela
 * impose de CONSERVER l'entrée après son expiration logique, ce qu'un TTL Redis
 * (qui supprime la clé) ne permet pas. La colonne `expires_at` + comparaison à
 * la lecture donne exactement ce comportement.
 *
 * Query params (forwarded to darkdl.php):
 *   - type   (movie | tv)
 *   - id     (TMDB id, required)
 *   - s, e   (season + episode, required for tv)
 *
 * Override the upstream via env DARK_UPSTREAM (defaults to
 * https://apis.wavewatch.top/darkdl.php).
 */
import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { getPool } from "@/lib/pg/db"

const DARK_UPSTREAM = process.env.DARK_UPSTREAM || "https://apis.wavewatch.top/darkdl.php"
const TTL_MS = Number(process.env.DARK_CACHE_TTL_MS) || 60 * 60_000 // 1 hour

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

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid 'type' (movie|tv)" }, { status: 400 })
  }
  if (!id) {
    return NextResponse.json({ error: "'id' (tmdb_id) is required" }, { status: 400 })
  }
  if (type === "tv" && (!s || !e)) {
    return NextResponse.json({ error: "'s' and 'e' are required for tv" }, { status: 400 })
  }

  const pool = getPool()

  const params: Record<string, string> = { type, id }
  if (s) params.s = s
  if (e) params.e = e
  const cacheKey = buildCacheKey(params)

  // Lecture cache (on récupère data + expires_at pour décider HIT vs STALE).
  let cached: { data: any; expires_at: string | null } | null = null
  try {
    const r = await pool.query<{ data: any; expires_at: string | null }>(
      `SELECT data, expires_at FROM dark_cache WHERE key = $1 LIMIT 1`,
      [cacheKey]
    )
    cached = r.rows[0] || null
  } catch {
    cached = null
  }

  const now = Date.now()
  if (cached && cached.expires_at && new Date(cached.expires_at).getTime() > now) {
    return NextResponse.json(cached.data, {
      headers: { "X-Dark-Cache": "HIT", "Cache-Control": "public, max-age=60" },
    })
  }

  const upstreamUrl = `${DARK_UPSTREAM}?${new URLSearchParams(params).toString()}`
  try {
    const ctrl = new AbortController()
    const tm = setTimeout(() => ctrl.abort(), 30_000)
    const res = await fetch(upstreamUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "WWEmbed-Dark-Proxy/1.0" },
    })
    clearTimeout(tm)

    if (!res.ok) {
      if (cached) {
        return NextResponse.json(cached.data, { headers: { "X-Dark-Cache": "STALE" } })
      }
      return NextResponse.json({ error: "Upstream " + res.status }, { status: 502 })
    }

    const data = await res.json()
    const expires_at = new Date(now + TTL_MS).toISOString()

    const isEmpty =
      typeof data?.totalLinks === "number" && data.totalLinks === 0

    if (!isEmpty) {
      await pool
        .query(
          `INSERT INTO dark_cache (key, cached_at, expires_at, data)
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
        "X-Dark-Cache": isEmpty ? "MISS-NOCACHE" : "MISS",
        "Cache-Control": "public, max-age=60",
      },
    })
  } catch (err: any) {
    if (cached) {
      return NextResponse.json(cached.data, { headers: { "X-Dark-Cache": "STALE-ERR" } })
    }
    return NextResponse.json(
      { error: "Upstream failed", detail: String(err?.message || err) },
      { status: 502 }
    )
  }
}

export const dynamic = "force-dynamic"
