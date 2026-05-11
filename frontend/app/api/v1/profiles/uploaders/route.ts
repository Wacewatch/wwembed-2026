/**
 * GET /api/v1/profiles/uploaders
 *
 * Returns every profile that has at least one approved/active download_link
 * submitted under their id. Used to populate the "Uploader" filter dropdown.
 *
 * Response: { uploaders: [{ username, role }] }
 */
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongo/db"
import { BASE_FILTER, requireApiKey } from "@/lib/wavewatch-api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req)
  if (denied) return denied

  try {
    const db = await getDb()

    // 1) distinct submitted_by ids on active/approved download_links
    const rawIds = (await db
      .collection("download_links")
      .distinct("submitted_by", BASE_FILTER)) as Array<unknown>

    const ids = rawIds.filter((v): v is string | ObjectId => Boolean(v))
    if (ids.length === 0) return NextResponse.json({ uploaders: [] })

    const objectIds: ObjectId[] = []
    const stringIds: string[] = []
    for (const v of ids) {
      if (v instanceof ObjectId) {
        objectIds.push(v)
      } else if (typeof v === "string") {
        if (/^[a-f0-9]{24}$/i.test(v)) {
          try {
            objectIds.push(new ObjectId(v))
          } catch {
            stringIds.push(v)
          }
        } else {
          stringIds.push(v)
        }
      }
    }

    const ors: any[] = []
    if (objectIds.length) ors.push({ _id: { $in: objectIds } })
    if (stringIds.length) {
      ors.push({ legacy_uuid: { $in: stringIds } })
      ors.push({ _id: { $in: stringIds } })
    }
    const filter: any = ors.length ? { $or: ors } : {}

    const docs = await db
      .collection("profiles")
      .find(filter, { projection: { username: 1, role: 1 } })
      .toArray()

    const uploaders = docs
      .map((d) => ({ username: d.username || null, role: d.role || null }))
      .filter((u) => u.username)
      // Stable sort, case-insensitive.
      .sort((a, b) =>
        String(a.username).toLowerCase().localeCompare(String(b.username).toLowerCase())
      )

    return NextResponse.json({ uploaders })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", reason: e?.message || "unknown" },
      { status: 500 }
    )
  }
}
