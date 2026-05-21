/**
 * GET /api/v1/dark-proxy
 *
 * Server-side cache proxy for the Dark / movix.tax external API
 * (apis.wavewatch.top/darkdl.php). Same Mongo-backed 1h cache as the
 * ZT proxy, but with a separate collection (`dark_cache`).
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
import { getDb } from "@/lib/mongo/db"

const DARK_UPSTREAM = process.env.DARK_UPSTREAM || "https://apis.wavewatch.top/darkdl.php"
const TTL_MS = Number(process.env.DARK_CACHE_TTL_MS) || 60 * 60_000 // 1 hour

let cacheIndexEnsured = false
async function ensureCacheIndex() {
  if (cacheIndexEnsured) return
  try {
    const db = await getDb()
    await db
      .collection("dark_cache")
      .createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, name: "_dark_cache_ttl" })
  } catch {
    /* ignore */
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

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid 'type' (movie|tv)" }, { status: 400 })
  }
  if (!id) {
    return NextResponse.json({ error: "'id' (tmdb_id) is required" }, { status: 400 })
  }
  if (type === "tv" && (!s || !e)) {
    return NextResponse.json({ error: "'s' and 'e' are required for tv" }, { status: 400 })
  }

  await ensureCacheIndex()
  const db = await getDb()

  const params: Record<string, string> = { type, id }
  if (s) params.s = s
  if (e) params.e = e
  const cacheKey = buildCacheKey(params)

  const cached = await db.collection("dark_cache").findOne({ _id: cacheKey } as any)
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
    const expires_at = new Date(now + TTL_MS)

    const isEmpty =
      typeof data?.totalLinks === "number" && data.totalLinks === 0

    if (!isEmpty) {
      await db
        .collection("dark_cache")
        .updateOne(
          { _id: cacheKey } as any,
          { $set: { _id: cacheKey, data, cached_at: new Date(now).toISOString(), expires_at } },
          { upsert: true }
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
