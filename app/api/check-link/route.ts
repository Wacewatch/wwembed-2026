import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// List of known file hosting domains and their patterns
const FILE_HOSTS: Record<string, { checkMethod: "head" | "get" | "pattern"; validPatterns?: RegExp[] }> = {
  "1fichier.com": { checkMethod: "head" },
  "uptobox.com": { checkMethod: "head" },
  "rapidgator.net": { checkMethod: "head" },
  "nitroflare.com": { checkMethod: "head" },
  "turbobit.net": { checkMethod: "head" },
  "uploaded.net": { checkMethod: "head" },
  "mega.nz": { checkMethod: "head" },
  "mediafire.com": { checkMethod: "head" },
  "zippyshare.com": { checkMethod: "head" },
  "sendcm.com": { checkMethod: "head" },
  "pixeldrain.com": { checkMethod: "head" },
  "gofile.io": { checkMethod: "head" },
  "krakenfiles.com": { checkMethod: "head" },
  "clicknupload.click": { checkMethod: "head" },
  "ddownload.com": { checkMethod: "head" },
  "katfile.com": { checkMethod: "head" },
  "hexupload.net": { checkMethod: "head" },
}

// Common error patterns that indicate a dead link
const ERROR_PATTERNS = [
  /file.*not.*found/i,
  /file.*deleted/i,
  /file.*removed/i,
  /not.*exist/i,
  /expired/i,
  /invalid.*link/i,
  /error.*404/i,
  /page.*not.*found/i,
  /unavailable/i,
  /removed.*copyright/i,
  /removed.*dmca/i,
  /removed.*abuse/i,
]

async function checkLinkValidity(url: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    // Basic URL validation
    const urlObj = new URL(url)

    // Try HEAD request first (faster)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      clearTimeout(timeoutId)

      // Check status code
      if (response.status === 404 || response.status === 410 || response.status === 451) {
        return { isValid: false, reason: `HTTP ${response.status}` }
      }

      // For redirects to error pages
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")
        if (location && ERROR_PATTERNS.some((p) => p.test(location))) {
          return { isValid: false, reason: "Redirect to error page" }
        }
      }

      // Status 200-299 generally means valid
      if (response.status >= 200 && response.status < 300) {
        return { isValid: true }
      }

      // For other status codes, try GET to check content
      if (response.status === 403 || response.status === 405) {
        // Some hosts don't allow HEAD, try GET
        const getResponse = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(15000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Range: "bytes=0-1024", // Only get first 1KB
          },
        })

        const text = await getResponse.text()

        // Check for error patterns in response
        if (ERROR_PATTERNS.some((p) => p.test(text))) {
          return { isValid: false, reason: "Error pattern detected" }
        }

        return { isValid: getResponse.status >= 200 && getResponse.status < 300 }
      }

      return { isValid: response.ok }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      if (fetchError.name === "AbortError") {
        return { isValid: false, reason: "Timeout" }
      }

      // Network error might mean temporary issue, mark as unknown
      return { isValid: false, reason: fetchError.message }
    }
  } catch (e: any) {
    return { isValid: false, reason: "Invalid URL" }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { linkId, linkType, url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 })
    }

    const result = await checkLinkValidity(url)

    // Update database if linkId provided
    if (linkId && linkType) {
      const supabase = await createClient()
      const table = linkType === "digital" ? "digital_download_links" : "download_links"

      await supabase
        .from(table)
        .update({
          is_valid: result.isValid,
          last_checked: new Date().toISOString(),
        })
        .eq("id", linkId)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET endpoint for checking multiple links (cron job)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")

  // Simple protection for cron endpoint
  if (secret !== process.env.CRON_SECRET && secret !== "check-links") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)

  // Get links that haven't been checked in 12 hours
  const { data: downloadLinks } = await supabase
    .from("download_links")
    .select("id, source_url")
    .or(`last_checked.is.null,last_checked.lt.${twelveHoursAgo.toISOString()}`)
    .eq("is_active", true)
    .limit(50)

  const { data: digitalLinks } = await supabase
    .from("digital_download_links")
    .select("id, source_url")
    .or(`last_checked.is.null,last_checked.lt.${twelveHoursAgo.toISOString()}`)
    .eq("is_active", true)
    .limit(50)

  const results: { checked: number; valid: number; invalid: number } = {
    checked: 0,
    valid: 0,
    invalid: 0,
  }

  // Check download links
  for (const link of downloadLinks || []) {
    if (link.source_url) {
      const result = await checkLinkValidity(link.source_url)
      await supabase
        .from("download_links")
        .update({
          is_valid: result.isValid,
          last_checked: new Date().toISOString(),
        })
        .eq("id", link.id)

      results.checked++
      if (result.isValid) results.valid++
      else results.invalid++
    }
  }

  // Check digital links
  for (const link of digitalLinks || []) {
    if (link.source_url) {
      const result = await checkLinkValidity(link.source_url)
      await supabase
        .from("digital_download_links")
        .update({
          is_valid: result.isValid,
          last_checked: new Date().toISOString(),
        })
        .eq("id", link.id)

      results.checked++
      if (result.isValid) results.valid++
      else results.invalid++
    }
  }

  return NextResponse.json(results)
}
