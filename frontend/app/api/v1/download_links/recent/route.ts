/**
 * GET /api/v1/download_links/recent?limit=12
 * Returns the N most recent approved/active download links — used by WaveWatch
 * for the home "Derniers liens" module.
 */
import { NextRequest, NextResponse } from "next/server"
import {
  BASE_FILTER,
  queryDownloadLinks,
  requireApiKey,
} from "@/lib/wavewatch-api"

export const dynamic = "force-dynamic"

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 50

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req)
  if (denied) return denied

  const rawLimit = Number.parseInt(req.nextUrl.searchParams.get("limit") || "", 10)
  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT)
  )

  try {
    const { items } = await queryDownloadLinks({
      filter: { ...BASE_FILTER },
      sort: { created_at: -1 },
      limit,
    })
    return NextResponse.json({ items, count: items.length })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", reason: e?.message || "unknown" },
      { status: 500 }
    )
  }
}
