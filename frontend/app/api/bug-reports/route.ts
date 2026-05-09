import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wwId, mediaType, tmdbId, seasonNumber, episodeNumber, title, sourceName, sourceUrl, message, embedType } =
      body

    if (!wwId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    let userId = null
    try {
      const supabaseAuth = await createClient()
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser()
      userId = user?.id || null
    } catch {}

    const { error } = await supabase.from("bug_reports").insert({
      ww_id: wwId,
      media_type: mediaType,
      tmdb_id: tmdbId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      title: title,
      source_name: sourceName,
      source_url: sourceUrl,
      message: message,
      embed_type: embedType || "streaming",
      reporter_ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      user_agent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
      user_id: userId,
      status: "pending",
    })

    if (error) {
      console.error("Bug report error:", error)
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Bug report error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let query = supabase.from("bug_reports").select("*").order("created_at", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, adminNote } = body

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("bug_reports")
      .update({
        status,
        admin_note: adminNote,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
