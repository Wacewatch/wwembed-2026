import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(req, { params }) {
  try {
    const { wwId } = await params
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )

    let contentType = ""
    let content = null

    if (wwId.startsWith("ww-digital-")) {
      contentType = "digital"
      const digitalId = wwId.replace("ww-digital-", "")
      const { data } = await supabase.from("digital_content").select("*").eq("id", digitalId).single()
      content = data
    } else if (wwId.startsWith("ww-movie-")) {
      contentType = "movie"
      const tmdbId = wwId.replace("ww-movie-", "")
      const { data } = await supabase.rpc("get_movie_by_tmdb", { p_tmdb_id: tmdbId })
      content = data?.[0] || null
    } else if (wwId.startsWith("ww-series-")) {
      contentType = "series"
      const tmdbId = wwId.replace("ww-series-", "")
      const { data } = await supabase.rpc("get_series_by_tmdb", { p_tmdb_id: tmdbId })
      content = data?.[0] || null
    }

    if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 })

    // Fetch download links
    const { data: links } = await supabase.from("download_links").select("*").eq("ww_id", wwId)

    const html = generateDownloadHTML(content, links || [], contentType)
    return new NextResponse(html, { headers: { "content-type": "text/html;charset=utf-8" } })
  } catch (err) {
    console.error("Download error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function generateDownloadHTML(content, links, type) {
  const isDigital = type === "digital"
  const title = isDigital ? content.title : content.title || "Content"
  const poster = isDigital ? content.thumbnail : content.poster_path
  const contentTypeLabel = isDigital ? "Digital" : type === "movie" ? "Film" : "Série"

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { display: flex; gap: 20px; margin-bottom: 30px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 20px; backdrop-filter: blur(8px); }
    .poster { width: 120px; height: 180px; border-radius: 8px; object-fit: cover; }
    .info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .type { color: #64748b; font-size: 14px; }
    .section { margin-bottom: 24px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 16px; backdrop-filter: blur(8px); }
    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .link-card { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 12px; }
    .link-title { font-weight: 600; margin-bottom: 8px; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .badge { background: #0d9488; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .btn { width: 100%; padding: 10px; background: #14b8a6; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.3s; }
    .btn:hover { background: #0d9488; }
    .external-btn { background: #8b5cf6; color: #fff; }
    .external-btn:hover { background: #7c3aed; }
    .nfo-btn { background: #6366f1; color: #fff; padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; flex-shrink: 0; }
    .nfo-btn:hover { background: #4f46e5; }
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 16px; backdrop-filter: blur(8px); }
    .modal.show { display: flex; }
    .modal-content { background: #1a1a2e; border-radius: 12px; padding: 20px; max-width: 800px; width: 100%; max-height: 80vh; overflow: auto; border: 1px solid #333; }
    .modal-content pre { white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 12px; color: #e0e0e0; background: #0d0d1a; padding: 16px; border-radius: 8px; margin-top: 12px; }
    .close-btn { background: #ef4444; color: #fff; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${poster ? `<img src="${poster}" alt="${title}" class="poster" onerror="this.style.display='none'">` : ""}
      <div class="info">
        <h1 class="title">${escapeHtml(title)}</h1>
        <p class="type">${contentTypeLabel}</p>
      </div>
    </div>

    ${generateLinksSection(links, type)}
  </div>

  <div id="nfoModal" class="modal" onclick="if(event.target===this)this.classList.remove('show')">
    <div class="modal-content">
      <h3 style="color:#fff;margin:0 0 8px 0">Informations NFO</h3>
      <pre id="nfoText"></pre>
      <button class="close-btn" onclick="document.getElementById('nfoModal').classList.remove('show')">Fermer</button>
    </div>
  </div>

  <script>
    function _showNfo(b64) {
      try {
        const txt = decodeURIComponent(escape(atob(b64)))
        document.getElementById('nfoText').textContent = txt
        document.getElementById('nfoModal').classList.add('show')
      } catch (e) {
        alert('Erreur lecture NFO')
      }
    }
  </script>
</body>
</html>`
}

function generateLinksSection(links, type) {
  if (!links.length) return ""

  const internalLinks = links.filter((l) => !l.external_url)
  const externalLinks = links.filter((l) => l.external_url)

  let html = ""

  if (internalLinks.length) {
    html += '<div class="section"><div class="section-title">📥 Téléchargement Direct</div><div class="links-grid">'
    internalLinks.forEach((link) => {
      html += generateLinkCard(link, false)
    })
    html += "</div></div>"
  }

  if (externalLinks.length) {
    html +=
      '<div class="section"><div class="section-title">🌐 Sources Externes (' +
      externalLinks.length +
      ')</div><div class="links-grid">'
    externalLinks.forEach((link) => {
      html += generateLinkCard(link, true)
    })
    html += "</div></div>"
  }

  return html
}

function generateLinkCard(link, isExternal) {
  const badges = []
  if (link.quality) badges.push(`<span class="badge">${escapeHtml(link.quality)}</span>`)
  if (link.resolution) badges.push(`<span class="badge">${escapeHtml(link.resolution)}</span>`)
  if (link.file_size) badges.push(`<span class="badge">${escapeHtml(link.file_size)}</span>`)
  if (link.language) badges.push(`<span class="badge">${escapeHtml(link.language)}</span>`)
  if (link.codec_video) badges.push(`<span class="badge">${escapeHtml(link.codec_video)}</span>`)
  if (link.codec_audio) badges.push(`<span class="badge">${escapeHtml(link.codec_audio)}</span>`)
  if (link.subtitle) badges.push(`<span class="badge">ST: ${escapeHtml(link.subtitle)}</span>`)
  if (link.source_name) badges.push(`<span class="badge">${escapeHtml(link.source_name)}</span>`)

  const nfoBtn =
    link.nfo && link.nfo.trim()
      ? `<button class="nfo-btn" onclick="_showNfo('${btoa(unescape(encodeURIComponent(link.nfo)))}')" title="Voir NFO">📄 NFO</button>`
      : ""

  const title = isExternal ? link.provider_name || link.host_name || "Source" : link.release_name || "Lien"
  const btnClass = isExternal ? "btn external-btn" : "btn"
  const btnText = isExternal ? "Débloquer" : "Télécharger"
  const btnOnclick = isExternal
    ? `onclick="fetch('/api/link-click',{method:'POST',body:JSON.stringify({ww_id:'${link.ww_id}',provider:'${link.provider_name}',is_external:true})})"`
    : ""

  return `<div class="link-card">
    <div class="link-title">${escapeHtml(title)}</div>
    <div class="badges">${badges.join("")}</div>
    <div style="display:flex;gap:6px">
      <button class="${btnClass}" style="flex:1" ${btnOnclick}>${btnText}</button>
      ${nfoBtn}
    </div>
  </div>`
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
