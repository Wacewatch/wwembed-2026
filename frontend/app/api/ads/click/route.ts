import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { adId, wwId } = await request.json()
    const supabase = createAdminClient()

    // Log click
    await supabase.from("ad_clicks").insert({
      ad_id: adId,
      ww_id: wwId,
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    // Atomically increment click_count via the rpc shim (handles null legacy values)
    const { error } = await supabase.rpc("increment_ad_clicks", { ad_id: adId })

    if (error) {
      // Manual fallback (should never trigger after the shim fix)
      const { data: ad } = await supabase.from("ads").select("click_count").eq("id", adId).single()
      if (ad) {
        await supabase
          .from("ads")
          .update({ click_count: (ad.click_count || 0) + 1 })
          .eq("id", adId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[v0] Ad click error:", e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
