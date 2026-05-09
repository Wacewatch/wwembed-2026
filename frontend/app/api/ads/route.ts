import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

  if (!ads || ads.length === 0) {
    return NextResponse.json({ ad: null })
  }

  // Return a random ad
  const randomAd = ads[Math.floor(Math.random() * ads.length)]

  return NextResponse.json({ ad: randomAd })
}
