/**
 * Auto-fill helper: probe a hosting URL and infer
 *   { provider, quality, language, fileSize, hostName }.
 *
 * Uses:
 *  • Regex on the hostname to map → known provider.
 *  • Regex on the path / filename for resolution / language tags.
 *  • HEAD then GET-Range as a fallback to pull Content-Length & filename
 *    from Content-Disposition (when the hoster exposes them publicly).
 *
 * Designed to be called from the uploader form: paste URL → press Tester →
 * fields auto-populate; user can still override.
 */
import { hostnameOf } from "@/lib/url-utils"

// Hostname → canonical provider label
const PROVIDER_MAP: { match: RegExp; provider: string }[] = [
  { match: /(^|\.)1fichier\.com$/, provider: "1fichier" },
  { match: /(^|\.)uptobox\.com$/, provider: "Uptobox" },
  { match: /(^|\.)rapidgator\.net$/, provider: "Rapidgator" },
  { match: /(^|\.)nitroflare\.com$/, provider: "Nitroflare" },
  { match: /(^|\.)turbobit\.net$/, provider: "Turbobit" },
  { match: /(^|\.)mega\.nz$/, provider: "Mega" },
  { match: /(^|\.)mediafire\.com$/, provider: "MediaFire" },
  { match: /(^|\.)pixeldrain\.com$/, provider: "Pixeldrain" },
  { match: /(^|\.)gofile\.io$/, provider: "GoFile" },
  { match: /(^|\.)krakenfiles\.com$/, provider: "KrakenFiles" },
  { match: /(^|\.)clicknupload\.click$/, provider: "ClicknUpload" },
  { match: /(^|\.)ddownload\.com$/, provider: "DDownload" },
  { match: /(^|\.)katfile\.com$/, provider: "Katfile" },
  { match: /(^|\.)hexupload\.net$/, provider: "Hexupload" },
  { match: /(^|\.)sendcm\.com$/, provider: "SendCM" },
  { match: /(^|\.)zippyshare\.com$/, provider: "Zippyshare" },
  { match: /(^|\.)dl\.free\.fr$/, provider: "FreeDL" },
  { match: /(^|\.)uploaded\.net$/, provider: "Uploaded" },
  { match: /(^|\.)dood\..+$/, provider: "DoodStream" },
  { match: /(^|\.)mixdrop\..+$/, provider: "Mixdrop" },
  { match: /(^|\.)streamtape\..+$/, provider: "Streamtape" },
  { match: /(^|\.)vidoza\.net$/, provider: "Vidoza" },
  { match: /(^|\.)voe\.sx$/, provider: "VOE" },
  { match: /(^|\.)upstream\.to$/, provider: "Upstream" },
  { match: /(^|\.)filemoon\..+$/, provider: "FileMoon" },
]

const QUALITY_PATTERNS: { match: RegExp; quality: string }[] = [
  { match: /\b(4k|2160p|uhd)\b/i, quality: "4K" },
  { match: /\b(2160[ip])\b/i, quality: "4K" },
  { match: /\b1440p\b/i, quality: "1440p" },
  { match: /\b1080p\b/i, quality: "1080p" },
  { match: /\b720p\b/i, quality: "720p" },
  { match: /\b480p\b/i, quality: "480p" },
  { match: /\b360p\b/i, quality: "360p" },
  { match: /\b240p\b/i, quality: "240p" },
  { match: /\b(bluray|brrip|bdrip|bdremux)\b/i, quality: "BluRay" },
  { match: /\b(web[-.]?dl|webrip)\b/i, quality: "WEB-DL" },
  { match: /\b(hdtv|dvbrip)\b/i, quality: "HDTV" },
  { match: /\bhdcam\b/i, quality: "HDCAM" },
  { match: /\b(dvdrip|dvdscr|r5)\b/i, quality: "DVDRip" },
]

const LANGUAGE_PATTERNS: { match: RegExp; language: string }[] = [
  { match: /\bmulti(?:i|lang|s)?\b/i, language: "MULTI" },
  { match: /\bvostfr\b/i, language: "VOSTFR" },
  { match: /\bvff\b|\btrueFrench\b|\btruefr\b/i, language: "TRUEFRENCH" },
  { match: /\bvfq\b/i, language: "VFQ" },
  { match: /\bvf2?\b|\bfrench\b/i, language: "FRENCH" },
  { match: /\bsubfr\b/i, language: "SUBFR" },
  { match: /\bvostang?\b|\bsubeng\b/i, language: "VOSTANG" },
  { match: /\bengl?ish\b|\benglish\b|\beng\b/i, language: "ENGLISH" },
]

const VIDEO_EXTS = [".mkv", ".mp4", ".avi", ".m4v", ".mov", ".wmv", ".webm", ".ts"]
const EBOOK_EXTS = [".epub", ".pdf", ".mobi", ".azw3", ".cbz", ".cbr"]
const ARCHIVE_EXTS = [".zip", ".rar", ".7z", ".tar.gz", ".tar.bz2"]

function pickFirstMatch<T extends { match: RegExp }>(haystack: string, list: T[]): T | null {
  for (const item of list) {
    if (item.match.test(haystack)) return item
  }
  return null
}

export interface UrlProbeResult {
  ok: boolean
  url: string
  host: string | null
  provider: string | null
  filename: string | null
  fileSize: number | null
  fileSizeHuman: string | null
  contentType: string | null
  quality: string | null
  language: string | null
  guessedMediaType: "video" | "ebook" | "archive" | "other" | null
  reachable: boolean
  httpStatus: number | null
  reason: string | null
}

function humanSize(bytes: number | null): string | null {
  if (!bytes || !Number.isFinite(bytes) || bytes < 0) return null
  const units = ["B", "KB", "MB", "GB", "TB"]
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)} ${units[i]}`
}

function filenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null
  // RFC 6266: filename*=UTF-8''foo  or  filename="foo"
  const star = /filename\*\s*=\s*[^']*''([^;]+)/i.exec(cd)
  if (star) {
    try { return decodeURIComponent(star[1].trim().replace(/"/g, "")) } catch { return star[1] }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(cd)
  return plain ? plain[1] : null
}

function filenameFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "")
    return last || null
  } catch {
    return null
  }
}

function guessMediaType(filename: string | null, ct: string | null): UrlProbeResult["guessedMediaType"] {
  const name = (filename || "").toLowerCase()
  if (VIDEO_EXTS.some((e) => name.endsWith(e))) return "video"
  if (EBOOK_EXTS.some((e) => name.endsWith(e))) return "ebook"
  if (ARCHIVE_EXTS.some((e) => name.endsWith(e))) return "archive"
  if (ct) {
    if (ct.startsWith("video/")) return "video"
    if (ct === "application/pdf" || ct === "application/epub+zip") return "ebook"
    if (ct.includes("zip") || ct.includes("rar") || ct.includes("7z")) return "archive"
  }
  return name ? "other" : null
}

export async function probeUrl(rawUrl: string): Promise<UrlProbeResult> {
  const host = hostnameOf(rawUrl)
  const provider = host ? PROVIDER_MAP.find((p) => p.match.test(host))?.provider || null : null

  const result: UrlProbeResult = {
    ok: false,
    url: rawUrl,
    host,
    provider,
    filename: null,
    fileSize: null,
    fileSizeHuman: null,
    contentType: null,
    quality: null,
    language: null,
    guessedMediaType: null,
    reachable: false,
    httpStatus: null,
    reason: null,
  }

  if (!host) {
    result.reason = "invalid_url"
    return result
  }

  // Pull tags from URL filename first (works even if hoster blocks HEAD)
  const urlFilename = filenameFromUrl(rawUrl)
  const tagSource = `${urlFilename || ""} ${rawUrl}`
  result.filename = urlFilename
  result.quality = pickFirstMatch(tagSource, QUALITY_PATTERNS)?.quality || null
  result.language = pickFirstMatch(tagSource, LANGUAGE_PATTERNS)?.language || null

  const BROWSER: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "*/*",
  }

  const fetchWithTimeout = async (init: RequestInit, ms = 10_000) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ms)
    try {
      return await fetch(rawUrl, { ...init, signal: ctrl.signal, redirect: "follow" })
    } finally {
      clearTimeout(timer)
    }
  }

  let resp: Response | null = null
  try {
    resp = await fetchWithTimeout({ method: "HEAD", headers: BROWSER })
  } catch {
    resp = null
  }
  if (!resp || resp.status === 405 || resp.status === 501 || resp.status >= 500) {
    try {
      resp = await fetchWithTimeout({
        method: "GET",
        headers: { ...BROWSER, Range: "bytes=0-0" },
      })
      try { resp.body?.cancel?.() } catch {}
    } catch (e: any) {
      result.reason = e?.name === "AbortError" ? "timeout" : (e?.message || "network_error")
      return result
    }
  }

  result.reachable = resp.ok || resp.status === 206 || resp.status === 401 || resp.status === 403
  result.httpStatus = resp.status
  result.contentType = resp.headers.get("content-type")
  // Content-Length: HEAD or 206 Content-Range total
  const lenHeader = resp.headers.get("content-length")
  let size: number | null = lenHeader ? parseInt(lenHeader, 10) : null
  const cr = resp.headers.get("content-range") // e.g. bytes 0-0/12345
  if (cr) {
    const m = /\/(\d+)$/.exec(cr)
    if (m) size = parseInt(m[1], 10)
  }
  if (size && size > 0) {
    result.fileSize = size
    result.fileSizeHuman = humanSize(size)
  }
  const cdFilename = filenameFromContentDisposition(resp.headers.get("content-disposition"))
  if (cdFilename) {
    result.filename = cdFilename
    // re-run tag extraction with the better filename
    const ts = `${cdFilename} ${rawUrl}`
    result.quality = result.quality || pickFirstMatch(ts, QUALITY_PATTERNS)?.quality || null
    result.language = result.language || pickFirstMatch(ts, LANGUAGE_PATTERNS)?.language || null
  }
  result.guessedMediaType = guessMediaType(result.filename, result.contentType)
  result.ok = true
  return result
}
