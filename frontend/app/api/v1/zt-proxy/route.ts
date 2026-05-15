/**
 * GET /api/v1/zt-proxy
 *
 * Server-side cache proxy for the ZT external API
 * (https://apis.wavewatch.top/zt.php). Saves a Mongo-backed copy of every
 * upstream response for 1 hour (configurable via ZT_CACHE_TTL_MS env var).
 *
 * The upstream API for TV searches can take ~15s — caching brings repeat
 * visits down to ~30ms. Same query signature → same cached payload.
 *
 * Query params (forwarded verbatim to ZT):
 *   - type   (movie | tv | anime | jeux | musique | ebook | logiciel)
 *   - id     (TMDB id, for movie/tv)
 *   - s, e   (season + episode, for tv)
 *   - q      (search text, used by digital types)
 *
 * Cache collection: `zt_cache`
 *   _id: deterministic SHA-256 hex of the query string
 *   data: JSON response
 *   cached_at: ISO string
 *   expires_at: Date (TTL index purges after expiry)
 */
import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { getDb } from "@/lib/mongo/db"

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

let cacheIndexEnsured = false
async function ensureCacheIndex() {
  if (cacheIndexEnsured) return
  try {
    const db = await getDb()
    await db
      .collection("zt_cache")
      .createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, name: "_zt_cache_ttl" })
  } catch {
    /* ignore (index may exist already) */
  }
  cacheIndexEnsured = true
}

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

  await ensureCacheIndex()
  const db = await getDb()

  const params: Record<string, string> = { _route: "api", type }
  if (id) params.id = id
  if (s) params.s = s
  if (e) params.e = e
  if (q) params.q = q
  const cacheKey = buildCacheKey(params)

  // 1) Try cache
  const cached = await db.collection("zt_cache").findOne({ _id: cacheKey } as any)
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
    const expires_at = new Date(now + TTL_MS)

    await db
      .collection("zt_cache")
      .updateOne(
        { _id: cacheKey } as any,
        { $set: { _id: cacheKey, data, cached_at: new Date(now).toISOString(), expires_at } },
        { upsert: true }
      )
      .catch(() => {})

    return NextResponse.json(data, {
      headers: {
        "X-ZT-Cache": "MISS",
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
