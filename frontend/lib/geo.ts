/**
 * Country lookup helper using ip-api.com (free, no key, 45 req/min).
 *
 * Stores results in the `geo_ip_cache` table (PostgreSQL) so we never re-query.
 * Returns ISO-2 country code (e.g. "FR") or null when lookup fails.
 *
 * Choix d'architecture (migration Mongo → Postgres) : geo reste en Postgres
 * (et non Redis) car le profil l'y prête mieux — volume négligeable (~quelques
 * centaines de lignes), écritures rares (low-frequency paths uniquement),
 * TTL très long (180 j) et persistance longue utile. Un memCache process
 * absorbe déjà l'essentiel des lectures. La colonne `ttl` est renseignée pour
 * un éventuel cron de purge, mais à 180 j c'est cosmétique.
 *
 * NOTE: only call this in low-frequency paths (admin stats, lazy enrichment).
 * The free tier is HTTP-only and rate-limited, so we batch with bounded
 * concurrency and an in-memory cache for the current process.
 */
import { getPool } from "@/lib/pg/db"

const memCache = new Map<string, string | null>()

// Durée de vie logique de l'entrée (équivaut au TTL 180 j de l'ancien index Mongo).
const TTL_DAYS = 180

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

  const pool = getPool()

  // Postgres cache. Toute erreur DB est non-fatale : on tente la résolution réseau.
  try {
    const r = await pool.query<{ country: string | null }>(
      `SELECT country FROM geo_ip_cache WHERE ip = $1`,
      [ip]
    )
    if (r.rows.length) {
      const country = r.rows[0].country ?? null
      memCache.set(ip, country)
      return country
    }
  } catch (e: any) {
    console.error("[geo] cache read error:", e?.message)
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
      await pool.query(
        `INSERT INTO geo_ip_cache (ip, country, ttl)
         VALUES ($1, $2, now() + ($3 || ' days')::interval)
         ON CONFLICT (ip) DO UPDATE
           SET country = EXCLUDED.country,
               ttl     = EXCLUDED.ttl`,
        [ip, country, String(TTL_DAYS)]
      )
    } catch (e: any) {
      console.error("[geo] cache write error:", e?.message)
    }
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
