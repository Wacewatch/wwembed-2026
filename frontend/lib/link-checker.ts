/**
 * Download / streaming link health checker.
 *
 * Goals:
 *  • Reliable verdict: a link is only flagged DEAD after `DEAD_THRESHOLD`
 *    consecutive failures (anti-flap, avoids false negatives caused by
 *    one-off 5xx, captcha, regional blocks, network blips).
 *  • Host-aware: we never hit the same hoster more than `HOST_CONCURRENCY`
 *    times in parallel — many file hosts ban abusive IPs.
 *  • Browser-like requests: realistic User-Agent + Accept-Language headers
 *    so HEAD/GET don't get a 403 from anti-bot WAFs.
 *  • HEAD-first, GET-fallback: many hosters refuse HEAD; we then issue a
 *    small Range GET and abort.
 *  • Pattern-aware: even an HTTP 200 can host a "File not found" page; we
 *    scan the first few KB for common dead-link error patterns.
 *  • Idempotent storage: writes a `link_status` doc + updates the parent
 *    link with `is_valid`, `last_checked`, `consecutive_failures`,
 *    `dead_since`, `last_error`.
 *
 * Storage shape (collection: `link_status`, one doc per linkId):
 *   {
 *     link_id, collection, source_url, host,
 *     status: "alive" | "dead" | "unknown",
 *     consecutive_failures, last_checked_at, dead_since, last_error,
 *     last_http_status, response_ms, last_alive_at
 *   }
 */
import { getDb } from "@/lib/mongo/db"

export type LinkStatusValue = "alive" | "dead" | "unknown"

export interface LinkCheckResult {
  status: LinkStatusValue
  httpStatus: number | null
  responseMs: number
  reason: string | null
  patternMatched: string | null
}

const TIMEOUT_MS = 12_000
const PATTERN_SCAN_BYTES = 16 * 1024 // peek 16 KB max
export const DEAD_THRESHOLD = 3 // consecutive failures before flagging dead
const HOST_CONCURRENCY = 3
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
}

const DEAD_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "file_not_found", re: /file\s*(?:was\s+)?not\s+found/i },
  { name: "file_deleted", re: /file\s+(?:has\s+been\s+)?deleted/i },
  { name: "file_removed", re: /file\s+(?:has\s+been\s+)?removed/i },
  { name: "file_expired", re: /file\s+(?:has\s+)?expired/i },
  { name: "dmca", re: /(dmca|copyright\s+(?:infringement|claim)|takedown)/i },
  { name: "abuse_removed", re: /removed\s+(?:due\s+to|for)\s+(?:abuse|tos|terms)/i },
  { name: "not_exist", re: /does\s+not\s+exist|no\s+such\s+file/i },
  { name: "invalid_link", re: /invalid\s+(?:link|file|url|download)/i },
  { name: "unavailable", re: /(?:file|content)\s+(?:is\s+)?(?:currently\s+)?unavailable/i },
  { name: "page_404", re: /\b(?:page|file)\s+not\s+found\b|404\s+not\s+found/i },
]

// ───── host throttling ─────
const hostInFlight = new Map<string, number>()
const hostWaiters = new Map<string, Array<() => void>>()

async function acquireHostSlot(host: string) {
  while ((hostInFlight.get(host) || 0) >= HOST_CONCURRENCY) {
    await new Promise<void>((resolve) => {
      const list = hostWaiters.get(host) || []
      list.push(resolve)
      hostWaiters.set(host, list)
    })
  }
  hostInFlight.set(host, (hostInFlight.get(host) || 0) + 1)
}

function releaseHostSlot(host: string) {
  const cur = hostInFlight.get(host) || 1
  hostInFlight.set(host, cur - 1)
  const list = hostWaiters.get(host) || []
  const next = list.shift()
  if (next) {
    hostWaiters.set(host, list)
    next()
  }
}

// ───── core check ─────
function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "follow" })
  } finally {
    clearTimeout(timer)
  }
}

async function readSomeText(res: Response, maxBytes = PATTERN_SCAN_BYTES): Promise<string> {
  if (!res.body) return ""
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let out = ""
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        received += value.byteLength
        out += decoder.decode(value, { stream: true })
      }
    }
  } finally {
    try { reader.cancel() } catch {}
  }
  return out
}

export async function checkLinkOnce(rawUrl: string): Promise<LinkCheckResult> {
  const started = Date.now()
  const host = hostnameOf(rawUrl)
  if (!host) {
    return {
      status: "unknown",
      httpStatus: null,
      responseMs: 0,
      reason: "invalid_url",
      patternMatched: null,
    }
  }

  await acquireHostSlot(host)
  try {
    // 1) HEAD first
    let resp: Response | null = null
    let used: "HEAD" | "GET" = "HEAD"
    try {
      resp = await fetchWithTimeout(rawUrl, { method: "HEAD", headers: BROWSER_HEADERS })
    } catch (e: any) {
      // network error → try GET range
      resp = null
    }

    // Some hosts disable HEAD or return wrong codes — fallback to GET range
    if (!resp || resp.status === 405 || resp.status === 501 || (resp.status >= 500 && resp.status < 600)) {
      used = "GET"
      try {
        resp = await fetchWithTimeout(rawUrl, {
          method: "GET",
          headers: { ...BROWSER_HEADERS, Range: "bytes=0-32768" },
        })
      } catch (e: any) {
        return {
          status: "unknown", // unknown = inconclusive (treat as transient failure for hesteresis)
          httpStatus: null,
          responseMs: Date.now() - started,
          reason: e?.name === "AbortError" ? "timeout" : (e?.message || "network_error"),
          patternMatched: null,
        }
      }
    }

    const http = resp.status
    // 2xx + 3xx considered alive at HTTP level
    if (http >= 400 && http !== 401 && http !== 403 && http !== 429) {
      // 4xx other than auth/forbidden/rate-limit are usually dead (404, 410, 451 …)
      return {
        status: "dead",
        httpStatus: http,
        responseMs: Date.now() - started,
        reason: `http_${http}`,
        patternMatched: null,
      }
    }

    // 401/403/429 → inconclusive (likely captcha / geo-block / rate-limit). Treat as unknown.
    if (http === 401 || http === 403 || http === 429) {
      try { resp.body?.cancel?.() } catch {}
      return {
        status: "unknown",
        httpStatus: http,
        responseMs: Date.now() - started,
        reason: `http_${http}`,
        patternMatched: null,
      }
    }

    // 200/206 → scan body for dead-link patterns (if HTML)
    const ct = (resp.headers.get("content-type") || "").toLowerCase()
    const looksHtml = ct.includes("text/html") || (ct === "" && used === "GET")
    let matched: string | null = null
    if (looksHtml) {
      try {
        const text = await readSomeText(resp)
        for (const p of DEAD_PATTERNS) {
          if (p.re.test(text)) {
            matched = p.name
            break
          }
        }
      } catch {
        // ignore
      }
    } else {
      try { resp.body?.cancel?.() } catch {}
    }

    if (matched) {
      return {
        status: "dead",
        httpStatus: http,
        responseMs: Date.now() - started,
        reason: `pattern:${matched}`,
        patternMatched: matched,
      }
    }

    return {
      status: "alive",
      httpStatus: http,
      responseMs: Date.now() - started,
      reason: null,
      patternMatched: null,
    }
  } finally {
    releaseHostSlot(host)
  }
}

/** Map a logical link "type" to its source collection. */
export const LINK_COLLECTIONS = {
  download: "download_links",
  digital: "digital_download_links",
  streaming: "streaming_links",
} as const
export type LinkType = keyof typeof LINK_COLLECTIONS

/**
 * Persist one check result with hesteresis. Returns the new effective status.
 */
export async function recordCheckResult(args: {
  linkId: string
  linkType: LinkType
  url: string
  result: LinkCheckResult
}): Promise<LinkStatusValue> {
  const { linkId, linkType, url, result } = args
  const db = await getDb()
  const now = new Date().toISOString()
  const statusColl = db.collection("link_status")
  const host = hostnameOf(url)

  const prev = await statusColl.findOne({ link_id: linkId })
  const prevFails = prev?.consecutive_failures || 0

  let nextFails = prevFails
  let effective: LinkStatusValue = (prev?.status as LinkStatusValue) || "unknown"
  let deadSince: string | null = prev?.dead_since || null
  let lastAliveAt: string | null = prev?.last_alive_at || null

  if (result.status === "alive") {
    nextFails = 0
    effective = "alive"
    deadSince = null
    lastAliveAt = now
  } else if (result.status === "dead") {
    nextFails = prevFails + 1
    if (nextFails >= DEAD_THRESHOLD) {
      effective = "dead"
      if (!deadSince) deadSince = now
    } else {
      effective = "unknown" // not yet enough confidence
    }
  } else {
    // "unknown" — inconclusive; don't bump the failure counter aggressively
    // but if we already had failures, keep them as-is (no decay either).
    effective = prev?.status === "dead" ? "dead" : "unknown"
  }

  await statusColl.updateOne(
    { link_id: linkId },
    {
      $set: {
        link_id: linkId,
        link_type: linkType,
        collection: LINK_COLLECTIONS[linkType],
        source_url: url,
        host,
        status: effective,
        consecutive_failures: nextFails,
        last_checked_at: now,
        last_http_status: result.httpStatus,
        last_error: result.reason,
        response_ms: result.responseMs,
        dead_since: deadSince,
        last_alive_at: lastAliveAt,
      },
    },
    { upsert: true }
  )

  // Mirror to the parent link record (so existing UI/queries see is_valid quickly).
  const parentColl = db.collection(LINK_COLLECTIONS[linkType])
  await parentColl.updateOne(
    { $or: [{ legacy_uuid: linkId }, { id: linkId }] },
    {
      $set: {
        is_valid: effective === "alive",
        link_status: effective,
        last_checked: now,
      },
    }
  )

  return effective
}

/**
 * Convenience: check a single link and persist the verdict.
 */
export async function checkAndRecord(args: {
  linkId: string
  linkType: LinkType
  url: string
}): Promise<{ effective: LinkStatusValue; result: LinkCheckResult }> {
  const result = await checkLinkOnce(args.url)
  const effective = await recordCheckResult({ ...args, result })
  return { effective, result }
}
