import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { rateLimit, getClientIp } from "@/lib/mongo/rate-limit"
import { getDb } from "@/lib/mongo/db"

/**
 * Stats tracking endpoint.
 *
 * Hardened so external callers can't gonfler les stats:
 *  • IP-based rate limit (60 clicks / minute / IP)
 *  • When linkId is provided, server REVALIDATES the link from the DB and
 *    overwrites every metadata field (provider, host_name, quality, language,
 *    media_type, etc.) from the source record. Client-supplied values for
 *    those fields are IGNORED.
 *  • Free-form fields (ww_id, link_type) are length-capped.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit({
      identifier: `linkclick:${ip}`,
      windowSec: 60,
      max: 60,
    })
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }

    const body = await request.json().catch(() => ({}))

    const safeStr = (v: any, max: number) =>
      typeof v === "string" ? v.slice(0, max) : v == null ? null : String(v).slice(0, max)

    const linkId = safeStr(body.linkId, 100)
    const linkType = safeStr(body.linkType, 30) || "download"
    const wwId = safeStr(body.wwId, 100)
    const isExternal = Boolean(body.isExternal)
    const externalLinkId = safeStr(body.externalLinkId, 100)
    // Source of the external link: "movix" (legacy), "alt" (wawa.php) or "zt" (zt.php).
    // Only meaningful when linkType === "external"; stored as null otherwise.
    const sourceRaw = safeStr(body.source, 20)
    const source =
      linkType === "external" && sourceRaw && ["movix", "alt", "zt"].includes(sourceRaw)
        ? sourceRaw
        : null

    // Server-resolved metadata (truth = DB, NOT client).
    let resolved = {
      tmdb_id: null as number | null,
      media_type: null as string | null,
      season_number: null as number | null,
      episode_number: null as number | null,
      provider: null as string | null,
      host_name: null as string | null,
      quality: null as string | null,
      language: null as string | null,
      file_size: null as string | null,
    }

    if (linkId) {
      // Resolve the link from one of the three tables. We use legacy_uuid
      // because the click events historically pass the original UUID.
      const db = await getDb()
      const lookup =
        (await db
          .collection("download_links")
          .findOne({ $or: [{ legacy_uuid: linkId }, { id: linkId }] })) ||
        (await db
          .collection("digital_download_links")
          .findOne({ $or: [{ legacy_uuid: linkId }, { id: linkId }] })) ||
        (await db
          .collection("streaming_links")
          .findOne({ $or: [{ legacy_uuid: linkId }, { id: linkId }] }))

      if (lookup) {
        resolved = {
          tmdb_id: lookup.tmdb_id ?? null,
          media_type: lookup.media_type ?? null,
          season_number: lookup.season_number ?? null,
          episode_number: lookup.episode_number ?? null,
          provider: lookup.provider ?? null,
          host_name: lookup.host_name ?? null,
          quality: lookup.quality ?? lookup.file_format ?? null,
          language: lookup.language ?? null,
          file_size: lookup.file_size ?? null,
        }
      } else {
        // Unknown link_id — refuse to record (would skew stats).
        return NextResponse.json({ success: false, error: "unknown_link" }, { status: 404 })
      }
    } else if (isExternal || linkType === "external") {
      // External clicks (no DB link). Accept client-provided metadata BUT only
      // after length capping + whitelist-style filtering.
      resolved = {
        tmdb_id: typeof body.tmdbId === "number" ? body.tmdbId : null,
        media_type: safeStr(body.mediaType, 30),
        season_number: typeof body.seasonNumber === "number" ? body.seasonNumber : null,
        episode_number: typeof body.episodeNumber === "number" ? body.episodeNumber : null,
        provider: safeStr(body.provider, 100),
        host_name: safeStr(body.hostName, 100),
        quality: safeStr(body.quality, 30),
        language: safeStr(body.language, 30),
        file_size: safeStr(body.fileSize, 30),
      }
    }

    // Hash IP for privacy.
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16)
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 500)
    const referrer = (request.headers.get("referer") || "").slice(0, 1000)

    const supabase = await createClient()
    await supabase.from("link_clicks").insert({
      link_id: linkId,
      link_type: linkType,
      source: source,
      ww_id: wwId,
      ip_hash: ipHash,
      user_agent: userAgent,
      referrer: referrer,
      is_external: isExternal,
      external_link_id: externalLinkId,
      ...resolved,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking link click:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
