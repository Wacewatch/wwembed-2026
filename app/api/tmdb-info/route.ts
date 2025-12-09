import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tmdbId = searchParams.get("id")
  const mediaType = searchParams.get("type") || "movie"

  if (!tmdbId) {
    return NextResponse.json({ error: "Missing tmdb_id" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=fr-FR`,
    )

    if (!res.ok) {
      return NextResponse.json({ title: "Inconnu", poster: "" })
    }

    const data = await res.json()
    return NextResponse.json({
      title: data.title || data.name || "Inconnu",
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w92${data.poster_path}` : "",
    })
  } catch {
    return NextResponse.json({ title: "Inconnu", poster: "" })
  }
}
