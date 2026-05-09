/**
 * Server-side RPC endpoint — replaces Supabase `.rpc()` calls.
 */
import { NextRequest, NextResponse } from "next/server"
import { createMongoClient } from "@/lib/mongo/shim"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { fn, args = {} } = body
  if (!fn) return NextResponse.json({ data: null, error: { message: "Missing fn" } }, { status: 400 })

  const client = createMongoClient()
  const res = await client.rpc(fn, args)
  return NextResponse.json(res)
}
