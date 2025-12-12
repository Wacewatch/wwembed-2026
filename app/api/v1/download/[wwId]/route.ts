// Existing code block with updates merged

const css = `
.nfo-btn{background:#6366f1;color:#fff;padding:4px 10px;border-radius:6px;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px}
.nfo-btn:hover{background:#4f46e5}
.nfo-modal{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;z-index:2000;padding:16px;backdrop-filter:blur(8px)}
.nfo-modal.show{display:flex}
.nfo-content{background:#1a1a2e;border-radius:12px;padding:20px;max-width:800px;width:100%;max-height:80vh;overflow:auto;border:1px solid #333}
.nfo-content pre{white-space:pre-wrap;word-wrap:break-word;font-family:monospace;font-size:12px;color:#e0e0e0;background:#0d0d1a;padding:16px;border-radius:8px;margin-top:12px}
.nfo-close{background:#ef4444;color:#fff;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;margin-top:12px}
`

const nfoModalHtml = `
  <div id="nfoModal" class="nfo-modal" onclick="if(event.target===this)this.classList.remove('show')">
    <div class="nfo-content">
      <h3 style="color:#fff;margin:0 0 8px 0">Informations NFO</h3>
      <pre id="nfoText"></pre>
      <button class="nfo-close" onclick="document.getElementById('nfoModal').classList.remove('show')">Fermer</button>
    </div>
  </div>
`

function _renderLink(l) {
  var meta = ""
  if (l.subtitle) meta += '<span class="li-tag" style="background:#4f46e5;color:#ffffff">ST: ' + l.subtitle + "</span>"

  var nfoBtn = ""
  if (l.nfo && l.nfo.trim() !== "") {
    const nfoBase64 = btoa(unescape(encodeURIComponent(l.nfo)))
    nfoBtn = `<button class="nfo-btn" onclick="_showNfo('${nfoBase64}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>NFO</button>`
  }

  // Insert NFO button after metadata
  meta += nfoBtn

  // ... rest of code here ...
}

function _renderBody() {
  // Add NFO modal HTML before closing body tag
  document.body.innerHTML +=
    '<div id="nfoModal" class="nfo-modal" onclick="if(event.target===this)this.classList.remove(\'show\')">' +
    '<div class="nfo-content">' +
    '<h3 style="color:#fff;margin:0 0 8px 0">Informations NFO</h3>' +
    '<pre id="nfoText"></pre>' +
    "<button class=\"nfo-close\" onclick=\"document.getElementById('nfoModal').classList.remove('show')\">Fermer</button>" +
    "</div>" +
    "</div>"

  // ... existing code here ...
}

function _showNfo(b64) {
  try {
    var txt = decodeURIComponent(escape(atob(b64)))
    document.getElementById("nfoText").textContent = txt
    document.getElementById("nfoModal").classList.add("show")
  } catch (e) {
    alert("Erreur lecture NFO")
  }
}

// Include CSS in the HTML template and NFO modal
const scriptContent = "console.log('Script content here');" // Declare scriptContent variable
const html = `
<!DOCTYPE html>
<html>
<head>
<style>${css}</style>
</head>
<body>
... existing HTML content ...
${nfoModalHtml}
<script>
${scriptContent}
</script>
</body>
</html>
`
