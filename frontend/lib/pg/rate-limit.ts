/**
 * Sliding-window rate limiter backed by PostgreSQL.
 *
 * Uses the `login_attempts` table (indexed on identifier, created_at) so we
 * don't need a Redis dependency. Each call records the attempt and checks how
 * many attempts were made by the same identifier inside the window.
 *
 * Identifier should be stable per (route, ip) or (route, ip, email) tuple.
 * Returns { allowed, retryAfterSec, count }.
 *
 * Note : la purge des vieux enregistrements (> 24h) est assurée côté DB par un
 * nettoyage périodique applicatif ou un simple DELETE planifié. On évite ici un
 * index TTL (inexistant en PG natif) ; un DELETE best-effort est lancé de temps
 * en temps pour borner la table.
 */
import { getPool } from "@/lib/pg/db"

interface RateLimitResult {
  allowed: boolean
  retryAfterSec: number
  count: number
}

interface RateLimitOpts {
  identifier: string
  windowSec: number
  max: number
  /** Optional: also bump on success (default true). Set to false to only count failures. */
  record?: boolean
}

let lastCleanup = 0

/** Purge best-effort des tentatives > 24h, au plus une fois par heure. */
async function maybeCleanup(pool: ReturnType<typeof getPool>) {
  const now = Date.now()
  if (now - lastCleanup < 3600_000) return
  lastCleanup = now
  try {
    await pool.query(`DELETE FROM login_attempts WHERE created_at < now() - interval '24 hours'`)
  } catch {
    // best-effort
  }
}

export async function rateLimit(opts: RateLimitOpts): Promise<RateLimitResult> {
  const pool = getPool()
  void maybeCleanup(pool)

  const windowStart = new Date(Date.now() - opts.windowSec * 1000).toISOString()

  const cntRes = await pool.query(
    `SELECT count(*)::int AS c FROM login_attempts WHERE identifier = $1 AND created_at >= $2`,
    [opts.identifier, windowStart]
  )
  const count = cntRes.rows[0]?.c ?? 0

  if (count >= opts.max) {
    const oldestRes = await pool.query(
      `SELECT created_at FROM login_attempts WHERE identifier = $1 AND created_at >= $2 ORDER BY created_at ASC LIMIT 1`,
      [opts.identifier, windowStart]
    )
    const oldestTs = oldestRes.rows[0]?.created_at ? new Date(oldestRes.rows[0].created_at).getTime() : Date.now()
    const retryAfterSec = Math.max(1, Math.ceil((oldestTs + opts.windowSec * 1000 - Date.now()) / 1000))
    return { allowed: false, retryAfterSec, count }
  }

  if (opts.record !== false) {
    await pool.query(
      `INSERT INTO login_attempts (identifier, created_at) VALUES ($1, now())`,
      [opts.identifier]
    )
  }
  return { allowed: true, retryAfterSec: 0, count: count + 1 }
}

/** Extract the client IP from common proxy headers (Cloudflare / nginx). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  const real = req.headers.get("x-real-ip")
  const cf = req.headers.get("cf-connecting-ip")
  const ip = (fwd?.split(",")[0] || real || cf || "unknown").trim()
  return ip || "unknown"
}
