import { type NextRequest, NextResponse } from "next/server"
import { getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params
  const tmdbId = Number.parseInt(id, 10)

  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    let data
    if (type === "movie") {
      data = await getMovieDetails(tmdbId)
    } else if (type === "tv") {
      data = await getTVDetails(tmdbId)
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const title = "title" in data ? data.title : data.name
    const poster = getPosterUrl(data.poster_path, "w200")
    const seasons = "number_of_seasons" in data ? data.number_of_seasons : undefined

    return NextResponse.json({
      title,
      poster,
      seasons,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
