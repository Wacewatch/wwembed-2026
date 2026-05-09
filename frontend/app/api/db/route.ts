/**
 * /api/db — executes serialized Mongo-shim chains coming from the browser.
 * Reconstructs the chain on top of the real MongoSupabaseClient.
 */
import { NextRequest, NextResponse } from "next/server"
import { createMongoClient } from "@/lib/mongo/shim"
import { getCurrentUser } from "@/lib/mongo/auth"

const PUBLIC_READ_TABLES = new Set([
  "live_tv_channels",
  "live_tv_sources",
  "digital_content",
  "digital_download_links",
  "streaming_links",
  "download_links",
  "third_party_apis",
  "profiles",
  "site_settings",
  "ads",
  "embed_views",
  "link_clicks",
  "api_usage",
  "daily_stats",
  "bug_reports",
  "ad_clicks",
  "profile_settings",
  "ad_clicks",
])

const ADMIN_ONLY_WRITE = new Set(["third_party_apis", "ads", "site_settings", "users", "live_tv_channels"])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      table,
      mode,
      chain = [],
      payload,
      selectStr,
      upsertOnConflict,
      isSingle,
      isMaybeSingle,
      countMode,
      headOnly,
    } = body

    if (!table || !PUBLIC_READ_TABLES.has(table))
      return NextResponse.json({ data: null, error: { message: "Forbidden table" } }, { status: 403 })

    const writeOps = ["insert", "update", "upsert", "delete"]
    if (writeOps.includes(mode)) {
      const user = await getCurrentUser(req)
      if (!user)
        return NextResponse.json({ data: null, error: { message: "Auth required" } }, { status: 401 })
      // Special: profiles table — users can update their own; admins can update all
      // Special: streaming_links/download_links/digital_content/live_tv_sources — users can submit/edit own
      if (ADMIN_ONLY_WRITE.has(table) && user.role !== "admin") {
        return NextResponse.json({ data: null, error: { message: "Admin only" } }, { status: 403 })
      }
    }

    const client = createMongoClient()
    let q: any = client.from(table)

    if (mode === "select") q = q.select(selectStr, { count: countMode, head: headOnly })
    else if (mode === "insert") q = q.insert(payload)
    else if (mode === "update") q = q.update(payload)
    else if (mode === "upsert") q = q.upsert(payload, { onConflict: upsertOnConflict })
    else if (mode === "delete") q = q.delete()

    for (const step of chain as any[]) {
      const [op, ...rest] = step
      if (typeof q[op] === "function") {
        if (op === "order") q = q.order(rest[0], { ascending: rest[1] })
        else if (op === "range") q = q.range(rest[0], rest[1])
        else if (op === "limit") q = q.limit(rest[0])
        else q = q[op](...rest)
      }
    }

    if (isSingle) q = q.single()
    if (isMaybeSingle) q = q.maybeSingle()

    const res = await q._exec()
    return NextResponse.json(res)
  } catch (e: any) {
    return NextResponse.json(
      { data: null, error: { message: e?.message || "Internal error" } },
      { status: 500 }
    )
  }
}
