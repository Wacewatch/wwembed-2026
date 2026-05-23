/**
 * GET /api/v1/profiles/uploaders
 *
 * Returns every profile that has at least one approved/active download_link
 * submitted under their id. Used to populate the "Uploader" filter dropdown.
 *
 * Response: { uploaders: [{ username, role }] }
 */
import { NextRequest, NextResponse } from "next/server"
import { listUploaders, requireApiKey } from "@/lib/wavewatch-api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req)
  if (denied) return denied

  try {
    const uploaders = await listUploaders()
    return NextResponse.json({ uploaders })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", reason: e?.message || "unknown" },
      { status: 500 }
    )
  }
}
