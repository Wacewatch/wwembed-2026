import crypto from "crypto"

/**
 * Extract the client IP from the usual proxy headers.
 * Returns null if no source IP is available.
 */
export function getClientIp(request: Request): string | null {
  try {
    const fwd = request.headers.get("x-forwarded-for")
    const real = request.headers.get("x-real-ip")
    const cf = request.headers.get("cf-connecting-ip")
    const ip = (fwd?.split(",")[0] || real || cf || "").trim()
    return ip || null
  } catch {
    return null
  }
}

/**
 * Privacy-preserving identifier hash. SHA-256(ip), truncated to 16 hex chars.
 * Used to count unique visitors without storing IPs themselves.
 */
export function getClientIpHash(request: Request): string | null {
  const ip = getClientIp(request)
  if (!ip) return null
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16)
}

/**
 * GDPR-friendly truncated IP (network prefix only) suitable for storing
 * alongside the hash so we can do country lookups on aggregated buckets
 * without retaining the full IP.
 *
 *   IPv4  → /24, e.g. "82.65.7.0"
 *   IPv6  → /48, e.g. "2a01:cb14:c8::"
 */
export function getClientIpPrefix(request: Request): string | null {
  const ip = getClientIp(request)
  if (!ip) return null
  if (ip.includes(":")) {
    // IPv6 — keep first 3 groups
    const groups = ip.split(":")
    return groups.slice(0, 3).join(":") + "::"
  }
  // IPv4
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`
}
