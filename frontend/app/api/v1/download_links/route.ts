/**
 * GET /api/v1/download_links
 *
 * Query params:
 *   limit       (default 100, max 20 000)
 *   offset      (default 0)
 *   quality     "4k" | "1080p" | "720p" | "480p" | …
 *   media_type  "movie" | "tv"
 *   language    "VF" | "VOSTFR" | "VO" | …
 *   q           free-text search on release_name | source_name | ww_id
 *   uploader    profile username
 *   sort        "created_at.desc" (default) | "created_at.asc" |
 *               "quality.asc" | "quality.desc"
 *
 * Implicit filters (always applied): is_active=true, status=approved,
 * is_valid != false.
 *
 * Response: { items: [...], total, offset, limit }
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongo/db"
import {
  BASE_FILTER,
  queryDownloadLinks,
  requireApiKey,
} from "@/lib/wavewatch-api"

export const dynamic = "force-dynamic"

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 20_000

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function resolveUploaderToIds(username: string): Promise<string[]> {
  if (!username) return []
  const db = await getDb()
  const docs = await db
    .collection("profiles")
    .find({ username }, { projection: { _id: 1, legacy_uuid: 1 } })
    .toArray()
  const ids: string[] = []
  for (const d of docs) {
    const oid = d._id?.toString?.()
    if (oid) ids.push(oid)
    if (d.legacy_uuid) ids.push(d.legacy_uuid)
  }
  return ids
}

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req)
  if (denied) return denied

  const sp = req.nextUrl.searchParams

  const rawLimit = Number.parseInt(sp.get("limit") || "", 10)
  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT)
  )
  const rawOffset = Number.parseInt(sp.get("offset") || "", 10)
  const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0)

  const quality = sp.get("quality")?.trim() || ""
  const mediaType = sp.get("media_type")?.trim() || ""
  const language = sp.get("language")?.trim() || ""
  const q = sp.get("q")?.trim() || ""
  const uploader = sp.get("uploader")?.trim() || ""
  const sort = (sp.get("sort") || "created_at.desc").trim()

  const filter: Record<string, any> = { ...BASE_FILTER }
  if (quality) filter.quality = quality
  if (mediaType) {
    if (mediaType !== "movie" && mediaType !== "tv") {
      return NextResponse.json(
        { error: "Bad request", reason: "media_type must be 'movie' or 'tv'" },
        { status: 400 }
      )
    }
    filter.media_type = mediaType
  }
  if (language) filter.language = language

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i")
    filter.$or = [{ release_name: rx }, { source_name: rx }, { ww_id: rx }]
  }

  if (uploader) {
    const ids = await resolveUploaderToIds(uploader)
    if (ids.length === 0) {
      // Unknown uploader → return empty page immediately.
      return NextResponse.json({ items: [], total: 0, offset, limit })
    }
    const oids = ids
      .filter((id) => /^[a-f0-9]{24}$/i.test(id))
      .map((id) => {
        try {
          return new ObjectId(id)
        } catch {
          return null
        }
      })
      .filter(Boolean) as ObjectId[]
    filter.submitted_by = { $in: [...ids, ...oids] }
  }

  // Sort parsing.
  let mongoSort: Record<string, 1 | -1> | null = { created_at: -1 }
  let sortByQuality: "asc" | "desc" | null = null
  switch (sort) {
    case "created_at.desc":
      mongoSort = { created_at: -1 }
      break
    case "created_at.asc":
      mongoSort = { created_at: 1 }
      break
    case "quality.asc":
      mongoSort = null
      sortByQuality = "asc"
      break
    case "quality.desc":
      mongoSort = null
      sortByQuality = "desc"
      break
    default:
      return NextResponse.json(
        {
          error: "Bad request",
          reason:
            "sort must be one of: created_at.desc, created_at.asc, quality.asc, quality.desc",
        },
        { status: 400 }
      )
  }

  try {
    // For quality sort we must fetch the whole filtered set and sort in memory
    // (string quality → numeric rank). We still respect the requested page.
    if (sortByQuality) {
      const { items, total } = await queryDownloadLinks({
        filter,
        sort: null,
        sortByQuality,
        // hard ceiling at MAX_LIMIT so we never load the entire collection.
        limit: Math.min(MAX_LIMIT, offset + limit),
      })
      const paged = items.slice(offset, offset + limit)
      return NextResponse.json({ items: paged, total, offset, limit })
    }

    const { items, total } = await queryDownloadLinks({
      filter,
      sort: mongoSort,
      skip: offset,
      limit,
    })
    return NextResponse.json({ items, total, offset, limit })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", reason: e?.message || "unknown" },
      { status: 500 }
    )
  }
}
