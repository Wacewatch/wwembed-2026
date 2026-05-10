import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Anti-adblock: Generate random class names
function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

// Generic route for software and games downloads
export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params

  // Validate format: accept legacy/alias prefixes — DB stores ww-soft-*, ww-ebook-*, ww-music-* (no ww-software-*, no ww-game-* in current data, but kept for forward compat)
  const match = wwId.match(/^ww-(soft|software|game|ebook|music)-/)
  if (!match) {
    return NextResponse.json({ error: "Invalid digital content WW ID format" }, { status: 400 })
  }

  // Map prefix → canonical content_type stored in digital_content
  const PREFIX_TO_TYPE: Record<string, string> = {
    soft: "software",
    software: "software",
    game: "game",
    ebook: "ebook",
    music: "music",
  }
  const contentType = PREFIX_TO_TYPE[match[1]] as "software" | "game" | "ebook" | "music"
  const supabase = createAdminClient()

  // Fetch the digital content
  const { data: content } = await supabase
    .from("digital_content")
    .select("*")
    .eq("ww_id", wwId)
    .eq("content_type", contentType)
    .eq("is_active", true)
    .eq("status", "approved")
    .single()

  if (!content) {
    return NextResponse.json({ error: `${contentType} not found` }, { status: 404 })
  }

  // Fetch download links
  const { data: links } = await supabase
    .from("digital_download_links")
    .select("*")
    .eq("ww_id", wwId)
    .eq("is_active", true)
    .eq("status", "approved")

  // Fetch ads
  const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

  const hasAds = ads && ads.length > 0
  const randomAd = hasAds ? ads[Math.floor(Math.random() * ads.length)] : null
  const adUrl = randomAd?.ad_url || ""
  const adId = randomAd?.id || ""
  const adCount = ads ? ads.length : 0

  // Log embed view
  await supabase.from("embed_views").insert({
    ww_id: wwId,
    tmdb_id: 0,
    media_type: contentType,
    embed_type: "download",
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  const downloadLinks = links || []

  const linksJson = JSON.stringify(
    downloadLinks.map((l) => ({
      name: l.source_name,
      url: l.source_url,
      format: l.file_format || "",
      size: l.file_size || "",
      type: l.link_type || "direct",
    })),
  )

  const ids = {
    overlay: generateRandomId("ov"),
    container: generateRandomId("ct"),
    timer: generateRandomId("tm"),
    progress: generateRandomId("pg"),
    btnUnlock: generateRandomId("bu"),
    btnDownload: generateRandomId("bd"),
    step1: generateRandomId("s1"),
    step2: generateRandomId("s2"),
    step3: generateRandomId("s3"),
    boxWarn: generateRandomId("bw"),
    boxTime: generateRandomId("bt"),
    boxDone: generateRandomId("dn"),
  }

  const TYPE_LABEL: Record<string, string> = {
    software: "Logiciel",
    game: "Jeu",
    ebook: "Ebook",
    music: "Musique",
  }
  const TYPE_ICON: Record<string, string> = {
    // Monitor (laptop) icon for software
    software: '<path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>',
    // Gamepad icon
    game: '<path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    // Open book icon for ebook
    ebook: '<path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>',
    // Music note icon
    music: '<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>',
  }
  const typeLabel = TYPE_LABEL[contentType] || "Contenu"
  const iconSvg = TYPE_ICON[contentType] || TYPE_ICON.software

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title} - Telechargement</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0a0f1a;color:#fff;min-height:100vh;padding:20px}
.hd{display:flex;gap:20px;margin-bottom:24px;align-items:flex-start}
.cv{width:120px;height:120px;object-fit:cover;border-radius:16px;background:linear-gradient(135deg,#1a2436,#141c2b);flex-shrink:0;box-shadow:0 8px 24px rgba(0,0,0,0.3)}
.ti{flex:1}
.ti h1{font-size:20px;font-weight:700;margin-bottom:8px;color:#f1f5f9}
.ti p{font-size:13px;color:#7a8ba3;margin-bottom:6px}
.tg{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;font-size:12px;font-weight:600;box-shadow:0 4px 12px rgba(99,102,241,0.3)}
.tg svg{width:14px;height:14px;fill:currentColor}
.desc{color:#94a3b8;font-size:14px;margin-bottom:20px;line-height:1.6;background:linear-gradient(135deg,#141c2b,#1a2436);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.06)}
.lk{background:linear-gradient(180deg,#141c2b,#0d1219);border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)}
.lk-hd{padding:16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px}
.lk-hd svg{width:20px;height:20px;fill:#6366f1}
.lk-hd span{font-weight:600;color:#e2e8f0}
.li{display:flex;flex-direction:column;gap:12px;padding:16px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.2s}
.li:hover{background:rgba(99,102,241,0.05)}
.li:last-child{border-bottom:none}
.ln{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.nm{font-weight:500;font-size:15px;color:#e2e8f0}
.bg{padding:4px 10px;background:rgba(99,102,241,0.15);border-radius:6px;font-size:11px;color:#a5b4fc;font-weight:500}
.db{padding:12px 24px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px;width:100%;transition:all 0.2s;box-shadow:0 4px 12px rgba(16,185,129,0.25)}
.db:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(16,185,129,0.35)}
.db:active{transform:scale(0.98)}
.em{color:#64748b;padding:40px;text-align:center;font-size:14px}
.ft{text-align:center;color:#475569;font-size:12px;margin-top:24px}
.ft a{color:#6366f1;text-decoration:none}
.ft a:hover{text-decoration:underline}

/* Modal - elegant dark glassmorphism */
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.97));backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px}
.mo.sh{display:flex}
.mc{background:linear-gradient(180deg,#1e293b,#0f172a);border-radius:24px;padding:32px;max-width:420px;width:100%;text-align:center;border:1px solid rgba(255,255,255,0.08);box-shadow:0 25px 50px rgba(0,0,0,0.5)}
.mc-icon{width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(99,102,241,0.3)}
.mc-icon svg{width:32px;height:32px;fill:#fff}
.mc h2{color:#f1f5f9;margin-bottom:8px;font-size:22px;font-weight:700}
.mc-sub{color:#94a3b8;font-size:14px;margin-bottom:24px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:24px}
.step{width:10px;height:10px;border-radius:50%;background:#334155;transition:all 0.3s ease}
.step.ac{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 0 12px rgba(99,102,241,0.5)}
.step.dn{background:#10b981}
.bx{border-radius:12px;padding:14px 16px;margin:10px 0;text-align:left;display:flex;align-items:center;gap:12px}
.bx-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.bx-icon svg{width:18px;height:18px}
.bw{background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3)}
.bw .bx-icon{background:rgba(251,191,36,0.2)}
.bw .bx-icon svg{fill:#fbbf24}
.bi{background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3)}
.bi .bx-icon{background:rgba(99,102,241,0.2)}
.bi .bx-icon svg{fill:#818cf8}
.bo{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3)}
.bo .bx-icon{background:rgba(16,185,129,0.2)}
.bo .bx-icon svg{fill:#10b981}
.bx-txt b{display:block;font-size:13px;color:#f1f5f9;margin-bottom:2px}
.bx-txt span{font-size:12px;color:#94a3b8}
.pb{height:6px;background:#1e293b;border-radius:3px;margin:20px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7);border-radius:3px;transition:width 0.3s ease}
.bt{width:100%;padding:14px 20px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;margin-top:12px;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;gap:8px}
.bp{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 8px 24px rgba(99,102,241,0.3)}
.bp:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(99,102,241,0.4)}
.bg-btn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 8px 24px rgba(16,185,129,0.3)}
.bg-btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(16,185,129,0.4)}
.hd-cls{display:none}
.cnt{background:rgba(251,191,36,0.15);color:#fbbf24;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}

@media(min-width:480px){
.li{flex-direction:row;justify-content:space-between;align-items:center}
.db{width:auto;padding:12px 28px}
}
</style>
</head>
<body>
<div class="hd">
${content.cover_url ? `<img src="${content.cover_url}" alt="${content.title}" class="cv">` : '<div class="cv"></div>'}
<div class="ti">
<h1>${content.title}</h1>
${content.version ? `<p>Version: ${content.version}</p>` : ""}
${content.file_size ? `<p>Taille: ${content.file_size}</p>` : ""}
<span class="tg"><svg viewBox="0 0 24 24">${iconSvg}</svg>${typeLabel}</span>
</div>
</div>
${content.description ? `<div class="desc">${content.description}</div>` : ""}
<div class="lk">
<div class="lk-hd"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span>Liens de telechargement</span></div>
<div id="${ids.container}"></div>
</div>
<div class="ft">Propulse par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
<script>
(function(){
var _l=${linksJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};
var _unlocked=!_h;

function _bl(){
var c=document.getElementById(_ids.container);
if(!c)return;
if(_l.length===0){
c.innerHTML='<div class="em">Aucun lien de telechargement disponible</div>';
return;
}
var h="";
for(var i=0;i<_l.length;i++){
var l=_l[i];
h+='<div class="li">';
h+='<div class="ln">';
h+='<span class="nm">'+l.name+'</span>';
if(l.format)h+='<span class="bg">'+l.format+'</span>';
if(l.size)h+='<span class="bg">'+l.size+'</span>';
h+='</div>';
h+='<button class="db" data-url="'+l.url+'">Telecharger</button>';
h+='</div>';
}
c.innerHTML=h;

document.querySelectorAll(".db").forEach(function(b){
b.onclick=function(){
var url=this.getAttribute("data-url");
if(_unlocked){window.open(url,"_blank");}
else{_sa(url);}
};
});
}

function _sa(url){
_p=url;
var o=document.getElementById(_ids.overlay);
if(!o){
o=document.createElement("div");
o.className="mo";
o.id=_ids.overlay;
o.innerHTML=\`<div class="mc">
<div class="mc-icon"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div>
<h2>Telechargement</h2>
<p class="mc-sub">Deux etapes pour acceder au fichier</p>
<div class="steps"><div class="step ac" id="${ids.step1}"></div><div class="step" id="${ids.step2}"></div></div>
<div class="bx bw hd-cls" id="${ids.boxWarn}"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div><div class="bx-txt"><b>Autorisez les popups</b><span>Desactivez votre bloqueur si necessaire</span></div></div>
<div class="bx bi" id="${ids.boxTime}"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div><div class="bx-txt"><b>Soutenez le service</b><span>Votre clic nous aide a rester en ligne</span></div></div>
<div class="bx bo hd-cls" id="${ids.boxDone}"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div><div class="bx-txt"><b>Tout est pret!</b><span>Telechargement en cours...</span></div></div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">ETAPE 1 / 2 <span class="cnt">PUB</span></button>
<button class="bt bp hd-cls" id="${ids.btnDownload}">ETAPE 2 / 2 <span class="cnt">PUB</span></button>
</div>\`;
document.body.appendChild(o);

document.getElementById(_ids.btnUnlock).onclick=function(){
var x=new XMLHttpRequest();
x.open("POST","/api/ads/click",true);
x.setRequestHeader("Content-Type","application/json");
x.send(JSON.stringify({adId:_i}));
var w=window.open("https://otieu.com/4/9248013","_blank");
if(!w||w.closed||typeof w.closed=="undefined"){
document.getElementById(_ids.boxWarn).classList.remove("hd-cls");
return;
}
this.classList.add("hd-cls");
document.getElementById(_ids.step1).classList.remove("ac");
document.getElementById(_ids.step1).classList.add("dn");
document.getElementById(_ids.step2).classList.add("ac");
document.getElementById(_ids.progress).style.width="50%";
document.getElementById(_ids.btnDownload).classList.remove("hd-cls");
};

document.getElementById(_ids.btnDownload).onclick=function(){
var x=new XMLHttpRequest();
x.open("POST","/api/ads/click",true);
x.setRequestHeader("Content-Type","application/json");
x.send(JSON.stringify({adId:_i}));
window.open("https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5","_blank");
this.classList.add("hd-cls");
document.getElementById(_ids.step2).classList.remove("ac");
document.getElementById(_ids.step2).classList.add("dn");
document.getElementById(_ids.boxTime).classList.add("hd-cls");
document.getElementById(_ids.boxDone).classList.remove("hd-cls");
document.getElementById(_ids.progress).style.width="100%";
_unlocked=true;
setTimeout(function(){
var ov=document.getElementById(_ids.overlay);
if(ov)ov.classList.remove("sh");
if(_p){window.open(_p,"_blank");_p=null;}
},350);
};
}
o.classList.add("sh");
// Reset state
document.getElementById(_ids.boxWarn).classList.add("hd-cls");
document.getElementById(_ids.boxTime).classList.remove("hd-cls");
document.getElementById(_ids.boxDone).classList.add("hd-cls");
document.getElementById(_ids.btnUnlock).classList.remove("hd-cls");
document.getElementById(_ids.btnDownload).classList.add("hd-cls");
document.getElementById(_ids.progress).style.width="0";
document.getElementById(_ids.step1).classList.add("ac");
document.getElementById(_ids.step1).classList.remove("dn");
document.getElementById(_ids.step2).classList.remove("ac");
document.getElementById(_ids.step2).classList.remove("dn");
}

_bl();
})();
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "ALLOWALL",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
