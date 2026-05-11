import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// /api/v1/health — same payload as /health. No auth required (healthcheck).
export async function GET() {
  return NextResponse.json({ status: "ok" })
}
