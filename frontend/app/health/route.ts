import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Plain healthcheck — no auth required. Mirror at /api/v1/health.
export async function GET() {
  return NextResponse.json({ status: "ok" })
}
