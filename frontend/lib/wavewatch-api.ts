/**
 * Shared helpers for the public WaveWatch consumer API (/api/v1/download_links/*).
 *
 * - `requireApiKey()` enforces the X-API-Key header against WAVEWATCH_API_KEY (.env).
 * - `BASE_FILTER` is the implicit filter applied on every list/query endpoint
 *    (except /stats): only active, approved and not-explicitly-invalid links.
 * - `normalizeLink()` shapes a Mongo doc into the public response item shape
 *    documented for WaveWatch.
 * - `fetchUploaderMap()` resolves `submitted_by` ids to { username, role }.
 * - `QUALITY_RANK` and `compareQuality()` give a stable numeric ordering for
 *    string qualities like "4k", "1080p", etc.
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongo/db"

export const BASE_FILTER: Record<string, any> = {
  // is_active: legacy data sometimes has the field missing → treat missing as true.
  is_active: { $ne: false },
  status: "approved",
  // is_valid is tri-state (true/false/null). Spec says "true"; we accept
  // also `null` (not yet checked) so freshly imported links aren't hidden.
  is_valid: { $ne: false },
}

export function unauthorized(reason = "Invalid or missing X-API-Key") {
  return NextResponse.json(
    { error: "Unauthorized", reason },
    { status: 401, headers: { "WWW-Authenticate": 'ApiKey realm="wwembed"' } }
  )
}

/**
 * Returns null on success; returns a NextResponse(401) when the key is bad.
 * Accepts the key in any of:
 *   - X-API-Key: <key>
 *   - Authorization: Bearer <key>
 *   - Authorization: ApiKey <key>
 *   - ?api_key=<key>  (last-resort, easier for ops smoke tests)
 */
export function requireApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.WAVEWATCH_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured", reason: "WAVEWATCH_API_KEY not set" },
      { status: 500 }
    )
  }
  const headerKey =
    req.headers.get("x-api-key") ||
    req.headers.get("X-API-Key") ||
    ""
  const authz = req.headers.get("authorization") || ""
  let bearerKey = ""
  if (authz) {
    const m = authz.match(/^\s*(Bearer|ApiKey)\s+(.+)\s*$/i)
    if (m) bearerKey = m[2].trim()
  }
  const queryKey = req.nextUrl.searchParams.get("api_key") || ""
  const provided = headerKey || bearerKey || queryKey
  if (!provided || provided !== expected) return unauthorized()
  return null
}

export const QUALITY_RANK: Record<string, number> = {
  "8k": 8,
  "4320p": 8,
  "4k": 7,
  "2160p": 7,
  "1440p": 6,
  "2k": 6,
  "1080p": 5,
  "fhd": 5,
  "720p": 4,
  "hd": 4,
  "576p": 3,
  "480p": 2,
  "sd": 2,
  "360p": 1,
  "240p": 0,
}

export function qualityRank(q: unknown): number {
  if (!q || typeof q !== "string") return -1
  return QUALITY_RANK[q.toLowerCase().trim()] ?? -1
}

export function compareQuality(a: any, b: any): number {
  return qualityRank(a?.quality) - qualityRank(b?.quality)
}

/** Public shape of a download_link item, per WaveWatch spec. */
export function normalizeLink(doc: any, uploaderMap: Map<string, any>): any {
  if (!doc) return doc
  const id = doc._id?.toString?.() || doc.id || null
  const submittedBy = doc.submitted_by ? String(doc.submitted_by) : null
  const uploader = submittedBy ? uploaderMap.get(submittedBy) : null
  return {
    id,
    tmdb_id: doc.tmdb_id ?? null,
    media_type: doc.media_type ?? null,
    ww_id: doc.ww_id ?? null,
    source_name: doc.source_name ?? null,
    source_url: doc.source_url ?? null,
    quality: doc.quality ?? null,
    resolution: doc.resolution ?? null,
    language: doc.language ?? null,
    release_name: doc.release_name ?? null,
    season_number: doc.season_number ?? null,
    episode_number: doc.episode_number ?? null,
    codec_video: doc.codec_video ?? null,
    codec_audio: doc.codec_audio ?? null,
    subtitle: doc.subtitle ?? null,
    file_size: doc.file_size ?? null,
    is_verified: doc.is_verified === true,
    created_at: doc.created_at ?? null,
    submitted_by: submittedBy,
    uploader_username: uploader?.username ?? null,
    uploader_role: uploader?.role ?? null,
  }
}

/**
 * Resolve a batch of `submitted_by` ids → { username, role } using the
 * `profiles` mirror collection. Handles both ObjectId-style ids and legacy
 * UUID ids carried over from the Supabase import.
 */
export async function fetchUploaderMap(
  submittedBys: Array<string | null | undefined>
): Promise<Map<string, { username: string | null; role: string | null }>> {
  const ids = Array.from(new Set((submittedBys.filter(Boolean) as string[]).map(String)))
  if (ids.length === 0) return new Map()

  const objectIds: ObjectId[] = []
  const otherIds: string[] = []
  for (const id of ids) {
    if (/^[a-f0-9]{24}$/i.test(id)) {
      try {
        objectIds.push(new ObjectId(id))
      } catch {
        otherIds.push(id)
      }
    } else {
      otherIds.push(id)
    }
  }

  const ors: any[] = []
  if (objectIds.length) ors.push({ _id: { $in: objectIds } })
  if (otherIds.length) {
    ors.push({ legacy_uuid: { $in: otherIds } })
    ors.push({ _id: { $in: otherIds } })
  }
  const filter: any = ors.length ? { $or: ors } : {}

  const db = await getDb()
  const docs = await db
    .collection("profiles")
    .find(filter, { projection: { username: 1, role: 1, legacy_uuid: 1 } })
    .toArray()

  const map = new Map<string, { username: string | null; role: string | null }>()
  for (const d of docs) {
    const entry = { username: d.username ?? null, role: d.role ?? null }
    const oid = d._id?.toString?.()
    if (oid) map.set(oid, entry)
    if (d.legacy_uuid) map.set(d.legacy_uuid, entry)
  }
  return map
}

/** Convenience: query + enrich + normalize in one shot. */
export async function queryDownloadLinks(opts: {
  filter: Record<string, any>
  sort?: Record<string, 1 | -1> | null
  limit?: number
  skip?: number
  sortByQuality?: "asc" | "desc" | null
}): Promise<{ items: any[]; total: number }> {
  const db = await getDb()
  const coll = db.collection("download_links")

  const total = await coll.countDocuments(opts.filter)

  let cursor = coll.find(opts.filter)
  if (opts.sort && Object.keys(opts.sort).length) cursor = cursor.sort(opts.sort)
  if (opts.skip) cursor = cursor.skip(opts.skip)
  if (opts.limit) cursor = cursor.limit(opts.limit)

  let docs = await cursor.toArray()

  if (opts.sortByQuality) {
    const dir = opts.sortByQuality === "asc" ? 1 : -1
    docs = docs.slice().sort((a, b) => dir * compareQuality(a, b))
  }

  const submittedBys = docs.map((d) => d.submitted_by)
  const uploaderMap = await fetchUploaderMap(submittedBys)
  const items = docs.map((d) => normalizeLink(d, uploaderMap))
  return { items, total }
}
