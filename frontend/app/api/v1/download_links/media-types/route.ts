/**
 * GET /api/v1/download_links/media-types
 *
 * Returns the set of media types currently used by approved/active download
 * links. WaveWatch uses this to populate the filter dropdown.
 *
 * Response: { types: ["movie", "tv"] }
 */
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"
import { BASE_FILTER, requireApiKey } from "@/lib/wavewatch-api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req)
  if (denied) return denied

  try {
    const db = await getDb()
    const types = (await db
      .collection("download_links")
      .distinct("media_type", BASE_FILTER)) as Array<string | null>
    const cleaned = types
      .filter((t): t is string => typeof t === "string" && t.length > 0)
      .sort()
    return NextResponse.json({ types: cleaned })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", reason: e?.message || "unknown" },
      { status: 500 }
    )
  }
}
