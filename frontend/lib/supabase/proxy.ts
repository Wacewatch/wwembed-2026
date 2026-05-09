/**
 * Drop-in replacement: middleware proxy. The original Supabase proxy refreshed
 * cookies. Our JWT cookies don't need refresh per request — just pass through.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function updateSession(_request: NextRequest) {
  return NextResponse.next()
}
