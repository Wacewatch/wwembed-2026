/**
 * URL helpers shared by checker, probe and stats normalisation.
 */
export function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    // Fallback: strip scheme + path
    const s = String(url)
      .trim()
      .replace(/^[a-z][a-z0-9+.\-]*:\/\//i, "")
      .split(/[\/?#]/)[0]
      .toLowerCase()
    return s || null
  }
}
