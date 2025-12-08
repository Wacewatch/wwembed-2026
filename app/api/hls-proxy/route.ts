import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: new URL(url).origin,
        Referer: new URL(url).origin + "/",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch stream" }, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || "application/vnd.apple.mpegurl"
    let body = await response.text()

    // Rewrite relative URLs in m3u8 to absolute URLs
    if (url.endsWith(".m3u8") || contentType.includes("mpegurl")) {
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1)
      body = body.replace(/^(?!#)(?!http)(.+\.ts)/gm, baseUrl + "$1")
      body = body.replace(/^(?!#)(?!http)(.+\.m3u8)/gm, baseUrl + "$1")
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("HLS Proxy error:", error)
    return NextResponse.json({ error: "Proxy error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  })
}
