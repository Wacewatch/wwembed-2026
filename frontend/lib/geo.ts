/**
 * Country lookup helper using ip-api.com (free, no key, 45 req/min).
 *
 * Stores results in `geo_ip_cache` collection so we never re-query.
 * Returns ISO-2 country code (e.g. "FR") or null when lookup fails.
 *
 * NOTE: only call this in low-frequency paths (admin stats, lazy enrichment).
 * The free tier is HTTP-only and rate-limited, so we batch with bounded
 * concurrency and an in-memory cache for the current process.
 */
import { getDb } from "@/lib/mongo/db"

const memCache = new Map<string, string | null>()

const CONCURRENCY = 5
let inflight = 0
const waiters: Array<() => void> = []
async function gate() {
  while (inflight >= CONCURRENCY) {
    await new Promise<void>((r) => waiters.push(r))
  }
  inflight++
}
function release() {
  inflight--
  const n = waiters.shift()
  if (n) n()
}

export async function countryForIp(ip: string): Promise<string | null> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return null
  }
  if (memCache.has(ip)) return memCache.get(ip)!

  // Mongo cache (180 days TTL via _ttl Date)
  const db = await getDb()
  const cached = await db.collection("geo_ip_cache").findOne({ ip })
  if (cached) {
    memCache.set(ip, cached.country || null)
    return cached.country || null
  }

  await gate()
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    let country: string | null = null
    try {
      const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`, {
        signal: ctrl.signal,
      })
      if (r.ok) {
        const j: any = await r.json()
        if (j.status === "success" && j.countryCode) country = j.countryCode
      }
    } catch {
      country = null
    } finally {
      clearTimeout(timer)
    }

    memCache.set(ip, country)
    try {
      await db.collection("geo_ip_cache").updateOne(
        { ip },
        { $set: { ip, country, _ttl: new Date() } },
        { upsert: true }
      )
    } catch {}
    return country
  } finally {
    release()
  }
}

/**
 * Resolve countries for an array of `ip_hash` values is NOT possible (we
 * hash IPs at insert). Caller must store raw `ip` (truncated) somewhere
 * else if they want geo. For now, this helper is only useful when called
 * during the embed view insert path with the raw header IP.
 */
export async function attachCountries(ipList: string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {}
  await Promise.all(
    ipList.map(async (ip) => {
      out[ip] = await countryForIp(ip)
    })
  )
  return out
}
