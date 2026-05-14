/**
 * Sliding-window rate limiter backed by MongoDB.
 *
 * Uses the existing `login_attempts` collection (already indexed on identifier)
 * so we don't need a Redis dependency. Each call records the attempt and checks
 * how many attempts were made by the same identifier inside the window.
 *
 * Identifier should be stable per (route, ip) or (route, ip, email) tuple —
 * the caller decides. Returns { allowed, retryAfterSec, count }.
 */
import { getDb } from "@/lib/mongo/db"

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

let indexEnsured = false

async function ensureIndex(coll: any) {
  if (indexEnsured) return
  indexEnsured = true
  try {
    // 24h TTL on attempts so the collection doesn't grow forever.
    await coll.createIndex({ created_at: 1 }, { expireAfterSeconds: 86400 })
    await coll.createIndex({ identifier: 1, created_at: -1 })
  } catch {
    // index may already exist with different opts — fine.
  }
}

export async function rateLimit(opts: RateLimitOpts): Promise<RateLimitResult> {
  const db = await getDb()
  const coll = db.collection("login_attempts")
  await ensureIndex(coll)

  const now = new Date()
  const windowStart = new Date(now.getTime() - opts.windowSec * 1000)

  const count = await coll.countDocuments({
    identifier: opts.identifier,
    created_at: { $gte: windowStart },
  })

  if (count >= opts.max) {
    // Find oldest attempt in window → compute retry-after
    const oldest = await coll
      .find({ identifier: opts.identifier, created_at: { $gte: windowStart } })
      .sort({ created_at: 1 })
      .limit(1)
      .toArray()
    const oldestTs = oldest[0]?.created_at?.getTime?.() || now.getTime()
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldestTs + opts.windowSec * 1000 - now.getTime()) / 1000)
    )
    return { allowed: false, retryAfterSec, count }
  }

  if (opts.record !== false) {
    await coll.insertOne({ identifier: opts.identifier, created_at: now })
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
