import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/v1/livetv — public JSON list of active live TV channels
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const url = new URL(request.url)
  const country = url.searchParams.get("country")
  const category = url.searchParams.get("category")

  let query = supabase
    .from("live_tv_channels")
    .select("id, channel_name, country, category, channel_logo, language")
    .eq("is_active", true)
    .eq("status", "approved")

  if (country) query = query.eq("country", country)
  if (category) query = query.eq("category", category)

  const { data: channels } = await query

  const list = (channels || []).map((c: any) => ({
    ww_id: `ww-live-${c.id}`,
    embed_url: `${url.origin}/api/v1/live/ww-live-${c.id}`,
    name: c.channel_name,
    country: c.country || null,
    category: c.category || null,
    language: c.language || null,
    logo: c.channel_logo || null,
  }))

  return NextResponse.json(
    { count: list.length, channels: list },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, max-age=300",
      },
    },
  )
}
