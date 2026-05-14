import crypto from "crypto"

/**
 * Derive a stable per-client identifier hash from the request headers.
 *
 * Used to fill `embed_views.ip_hash` so admin/stats unique-visitor
 * aggregations don't collapse every browser sharing the same user-agent
 * into a single bucket (which was the cause of severely under-counted
 * "online" stats — e.g. 927 unique / 42k views in 24h).
 *
 * Privacy: only the first 16 hex chars of a SHA-256 are kept, and the IP
 * itself is never persisted.
 */
export function getClientIpHash(request: Request): string | null {
  try {
    const fwd = request.headers.get("x-forwarded-for")
    const real = request.headers.get("x-real-ip")
    const cf = request.headers.get("cf-connecting-ip")
    const ip = (fwd?.split(",")[0] || real || cf || "").trim()
    if (!ip) return null
    return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16)
  } catch {
    return null
  }
}
