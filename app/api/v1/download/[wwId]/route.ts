import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params

  console.log("[v0] Download route called with wwId:", wwId)

  const supabase = createAdminClient()

  const isDigitalContent =
    wwId.startsWith("ww-ebook-") ||
    wwId.startsWith("ww-music-") ||
    wwId.startsWith("ww-software-") ||
    wwId.startsWith("ww-game-")

  if (isDigitalContent) {
    const { data: digitalContent } = await supabase.from("digital_content").select("*").eq("ww_id", wwId).single()

    if (!digitalContent) {
      return NextResponse.json({ error: "Digital content not found" }, { status: 404 })
    }

    const { data: digitalLinks } = await supabase
      .from("digital_download_links")
      .select("*")
      .eq("content_id", digitalContent.id)
      .eq("is_active", true)
      .eq("status", "approved")
      .order("quality", { ascending: false })

    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""
    const adId = hasAds ? ads[0].id : ""
    const adCount = ads ? ads.length : 0

    const title = digitalContent.title
    const cover = digitalContent.cover_url || ""
    const contentType = digitalContent.content_type

    await supabase.from("embed_views").insert({
      ww_id: wwId,
      embed_type: "download",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    const links = digitalLinks || []
    const readerLinks = links.filter((l) => l.reader_url)
    const downloadLinks = links.filter((l) => l.source_url)

    const ids = {
      overlay: generateRandomId("m"),
      container: generateRandomId("c"),
      timer: generateRandomId("t"),
      progress: generateRandomId("g"),
      btnUnlock: generateRandomId("u"),
      btnDownload: generateRandomId("d"),
      boxTime: generateRandomId("bt"),
      boxHelp: generateRandomId("bh"),
      boxThanks: generateRandomId("bk"),
      boxDone: generateRandomId("bd"),
      step1: generateRandomId("s1"),
      step2: generateRandomId("s2"),
      step3: generateRandomId("s3"),
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - Téléchargements WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;padding:12px}
.hd{display:flex;gap:12px;margin-bottom:16px;align-items:center}
.ps{width:60px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0}
.tt{font-size:16px;font-weight:600;line-height:1.3}
.tg{font-size:12px;color:#14B8A6;text-transform:capitalize}
.sc{margin-bottom:16px}
.sc-title{font-size:13px;font-weight:600;color:#14B8A6;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.sc-title svg{width:16px;height:16px}
.lk{background:#162230;border-radius:8px;overflow:hidden;border:1px solid #1e3a4f}
.li{display:flex;flex-direction:column;gap:8px;padding:12px;border-bottom:1px solid #1e3a4f}
.li:last-child{border-bottom:none}
.ln{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.nm{font-weight:500;font-size:14px}
.bg{padding:2px 6px;background:#1e3a4f;border-radius:4px;font-size:10px;color:#8ba3b5}
.db{padding:10px 16px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;width:100%;transition:background 0.2s}
.db:active{background:#0d9488;transform:scale(0.98)}
.db.rd{background:#8b5cf6}
.db.rd:active{background:#7c3aed}
.em{color:#5a7a8a;padding:20px;text-align:center;font-size:14px}
.ft{text-align:center;color:#5a7a8a;font-size:11px;margin-top:16px}
.ft a{color:#14B8A6}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px)}
.mo.sh{display:flex}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:24px;max-width:400px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4)}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:clamp(16px,4vw,20px);font-weight:700}
.mc-sub{color:#6b7280;font-size:clamp(11px,3vw,13px);margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px}
.bx-content{min-width:0}
.bx-content b{display:block;font-size:clamp(12px,3.5vw,14px);margin-bottom:2px}
.bx-content span{font-size:clamp(10px,2.8vw,12px);opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:clamp(12px,3.5vw,14px);font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bt:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.bt:active{transform:scale(0.98)}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 4px 14px rgba(102,126,234,0.4)}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,0.4)}
.hi{display:none}
.cf{margin-top:12px;font-size:clamp(9px,2.5vw,11px);color:#9ca3af}
.cf a{color:#667eea;text-decoration:none;font-weight:500}
.tag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:600}
@media(max-height:500px){
.mc{padding:16px;border-radius:12px}
.bx{padding:10px;margin:6px 0}
.steps{margin-bottom:12px}
.pb{margin:10px 0}
.bt{padding:10px}
}
@media(max-width:360px){
.mo{padding:8px}
.mc{padding:16px;border-radius:12px}
.bx{padding:10px;gap:8px}
.bx svg{width:16px;height:16px}
}
@media(min-width:480px){
.ps{width:80px;height:120px}
.tt{font-size:18px}
.li{display:flex;flex-direction:row;justify-content:space-between;align-items:center}
.db{width:auto;padding:8px 20px}
}
</style>
</head>
<body>
<div class="hd">
${cover ? `<img src="${cover}" alt="${title}" class="ps">` : ""}
<div>
<div class="tt">${title}</div>
<div class="tg">${contentType}</div>
</div>
</div>
</div>

${
  readerLinks.length > 0
    ? `
<div class="sc">
<div class="sc-title">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
Lire en ligne
</div>
<div class="lk">
${readerLinks
  .map(
    (l) => `
<div class="li">
<div class="ln">
<span class="nm">${l.source_name}</span>
${l.quality ? `<span class="bg">${l.quality}</span>` : ""}
${l.language ? `<span class="bg">${l.language}</span>` : ""}
</div>
<button class="db rd" onclick="window.open('${l.reader_url}','_blank')">Lire</button>
</div>
`,
  )
  .join("")}
</div>
</div>
`
    : ""
}

<div class="sc">
<div class="sc-title">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
Téléchargements
</div>
<div class="lk" id="${ids.container}">
${
  downloadLinks.length === 0
    ? '<div class="em">Aucun lien de téléchargement disponible</div>'
    : downloadLinks
        .map(
          (l) => `
<div class="li">
<div class="ln">
<span class="nm">${l.source_name}</span>
${l.quality ? `<span class="bg">${l.quality}</span>` : ""}
${l.file_size ? `<span class="bg">${l.file_size}</span>` : ""}
${l.file_format ? `<span class="bg">${l.file_format}</span>` : ""}
${l.language ? `<span class="bg">${l.language}</span>` : ""}
</div>
<button class="db" data-url="${encodeURIComponent(l.source_url)}">Télécharger</button>
</div>
`,
        )
        .join("")
}
</div>
</div>

<div class="ft">par <a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a></div>

<div class="mo" id="${ids.overlay}">
<div class="mc">
<h2>Votre téléchargement est prêt</h2>
<div class="mc-sub">Une dernière étape pour accéder au fichier</div>
<div class="steps">
<div class="step active" id="${ids.step1}"></div>
<div class="step" id="${ids.step2}"></div>
<div class="step" id="${ids.step3}"></div>
</div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="bx bh" id="${ids.boxHelp}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-106a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<div class="bx bi" id="${ids.boxTime}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
<div class="bx-content"><b>Temps restant: <span id="${ids.timer}">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div>
</div>
<div class="bx bo hi" id="${ids.boxThanks}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div class="bx-content"><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div>
</div>
<div class="bx bo hi" id="${ids.boxDone}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
<div class="bx-content"><b>Tout est prêt !</b><span>Cliquez pour télécharger</span></div>
</div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">Continuer<span class="tag">PUB</span></button>
<button class="bt bn hi" id="${ids.btnDownload}">Télécharger</button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>

<script>
(function(){
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};

var bs=document.querySelectorAll(".db:not(.rd)");
for(var j=0;j<bs.length;j++){
bs[j].onclick=function(){
var url=this.getAttribute("data-url");
if(_h&&_u){_sa(url);}else{window.open(decodeURIComponent(url),"_blank");}
};
}

function _sa(url){
_p=url;
var o=document.getElementById(_ids.overlay);
var bt=document.getElementById(_ids.boxTime);
var bh=document.getElementById(_ids.boxHelp);
var bk=document.getElementById(_ids.boxThanks);
var bd=document.getElementById(_ids.boxDone);
var pr=document.getElementById(_ids.progress);
var tm=document.getElementById(_ids.timer);
var bu=document.getElementById(_ids.btnUnlock);
var dn=document.getElementById(_ids.btnDownload);
var s1=document.getElementById(_ids.step1);
var s2=document.getElementById(_ids.step2);
var s3=document.getElementById(_ids.step3);
if(bt)bt.classList.remove("hi");
if(bh)bh.classList.remove("hi");
if(bk)bk.classList.add("hi");
if(bd)bd.classList.add("hi");
if(pr)pr.style.width="0";
if(tm)tm.textContent="3";
if(bu)bu.classList.remove("hi");
if(dn)dn.classList.add("hi");
if(s1){s1.classList.add("active");s1.classList.remove("done");}
if(s2){s2.classList.remove("active");s2.classList.remove("done");}
if(s3){s3.classList.remove("active");s3.classList.remove("done");}
o.classList.add("sh");

bu.onclick=function(){
var xhr=new XMLHttpRequest();
xhr.open("POST","/api/ads/click",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(JSON.stringify({adId:_i}));
window.open(_u,"_blank");
bu.classList.add("hi");
if(s1){s1.classList.remove("active");s1.classList.add("done");}
if(s2)s2.classList.add("active");
var s=3,pg=0;
var iv=setInterval(function(){
s--;pg+=33.33;
if(tm)tm.textContent=s+" seconde(s)";
if(pr)pr.style.width=pg+"%";
if(s<=0){
clearInterval(iv);
if(s2){s2.classList.remove("active");s2.classList.add("done");}
if(s3)s3.classList.add("active");
if(bt)bt.classList.add("hi");
if(bh)bh.classList.add("hi");
if(bk)bk.classList.remove("hi");
if(bd)bd.classList.remove("hi");
if(pr)pr.style.width="100%";
if(dn)dn.classList.remove("hi");
}
},1000);
};

dn.onclick=function(){
o.classList.remove("sh");
if(_p){window.open(_p,"_blank");_p=null;}
};
}
)();
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

  // Original media download logic
  const parsed = parseWWId(wwId)

  if (!parsed) {
    return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })
  }

  const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed

  const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
  const hasAds = ads && ads.length > 0
  const adUrl = hasAds ? ads[0].ad_url : ""
  const adId = hasAds ? ads[0].id : ""
  const adCount = ads ? ads.length : 0

  const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)
  const title = tmdbData ? ("title" in tmdbData ? tmdbData.title : tmdbData.name) : "Unknown"
  const posterPath = tmdbData?.poster_path
  const posterUrl = posterPath ? getPosterUrl(posterPath, "w185") : ""

  let query = supabase
    .from("download_links")
    .select(`
      *,
      profiles:submitted_by (username)
    `)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .eq("is_active", true)
    .eq("status", "approved")

  if (mediaType === "tv") {
    if (seasonNumber !== undefined && episodeNumber !== undefined) {
      query = query.eq("season_number", seasonNumber).eq("episode_number", episodeNumber)
    } else if (seasonNumber !== undefined) {
      query = query.eq("season_number", seasonNumber)
    }
  }

  const { data: links } = await query
    .order("season_number", { ascending: true })
    .order("episode_number", { ascending: true })
    .order("quality", { ascending: false })

  await supabase.from("embed_views").insert({
    ww_id: wwId,
    tmdb_id: tmdbId,
    media_type: mediaType,
    season_number: seasonNumber ?? null,
    episode_number: episodeNumber ?? null,
    embed_type: "download",
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  const ids = {
    overlay: generateRandomId("m"),
    timer: generateRandomId("t"),
    progress: generateRandomId("g"),
    btnUnlock: generateRandomId("u"),
    btnDownload: generateRandomId("d"),
    boxTime: generateRandomId("bt"),
    boxHelp: generateRandomId("bh"),
    boxThanks: generateRandomId("bk"),
    boxDone: generateRandomId("bd"),
    step1: generateRandomId("s1"),
    step2: generateRandomId("s2"),
    step3: generateRandomId("s3"),
    sortBtns: generateRandomId("sb"),
    linksContainer: generateRandomId("lc"),
  }

  const linksJson = JSON.stringify(links || [])
    .replace(/'/g, "\\'")
    .replace(/</g, "\\u003c")

  const isSeries = mediaType === "tv"
  const showSeasonGroups = isSeries && seasonNumber === undefined

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>Téléchargement - ${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;min-height:100%;min-height:100dvh}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1a 0%,#111827 50%,#0f172a 100%);color:#e5e7eb;padding:16px;overflow-x:hidden;overflow-y:auto}

.hd{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:rgba(30,58,79,0.3);border-radius:12px;border:1px solid rgba(30,58,79,0.5)}
.ps{width:70px;height:100px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3)}
.tt{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
.tg{font-size:13px;color:#14B8A6;font-weight:500}

.sb{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;padding:12px;background:rgba(30,58,79,0.2);border-radius:10px}
.sb-btn{padding:8px 14px;background:rgba(30,58,79,0.5);border:1px solid #1e3a4f;border-radius:8px;color:#8ba3b5;font-size:12px;cursor:pointer;transition:all 0.2s;font-weight:500}
.sb-btn:hover{background:rgba(20,184,166,0.2);border-color:#14B8A6;color:#14B8A6}
.sb-btn.ac{background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border-color:#14B8A6;font-weight:600}

.sg{margin-bottom:12px}
.sg-hd{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(139,92,246,0.1));border:1px solid rgba(139,92,246,0.3);border-radius:10px;cursor:pointer;font-weight:600;color:#a78bfa;transition:all 0.2s}
.sg-hd:hover{background:linear-gradient(135deg,rgba(139,92,246,0.3),rgba(139,92,246,0.2))}
.sg-hd svg{width:18px;height:18px;transition:transform 0.3s}
.sg-hd.cl svg{transform:rotate(180deg)}
.sg-ct{margin-top:8px}
.sg-ct.hd{display:none}

.lk{background:transparent}
.li{background:rgba(22,34,48,0.8);border-radius:12px;overflow:hidden;border:1px solid rgba(30,58,79,0.6);margin-bottom:12px;transition:all 0.2s}
.li:hover{border-color:rgba(20,184,166,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.2)}

.li-top{padding:16px;border-bottom:1px solid rgba(30,58,79,0.4)}
.li-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.li-ep{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.li-nm{font-weight:600;font-size:15px;color:#fff;flex:1;min-width:200px;word-break:break-word}
.li-up{font-size:12px;color:#6b7280;background:rgba(107,114,128,0.1);padding:4px 10px;border-radius:6px}

.li-meta{display:flex;flex-wrap:wrap;gap:8px}
.li-tag{padding:6px 10px;background:rgba(30,58,79,0.6);border-radius:6px;font-size:11px;color:#94a3b8;font-weight:500;border:1px solid rgba(30,58,79,0.8)}
.li-tag.quality{background:linear-gradient(135deg,rgba(20,184,166,0.2),rgba(20,184,166,0.1));color:#14B8A6;border-color:rgba(20,184,166,0.3)}
.li-tag.resolution{background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.1));color:#3b82f6;border-color:rgba(59,130,246,0.3)}
.li-tag.codec{background:linear-gradient(135deg,rgba(168,85,247,0.2),rgba(168,85,247,0.1));color:#a855f7;border-color:rgba(168,85,247,0.3)}
.li-tag.audio{background:linear-gradient(135deg,rgba(236,72,153,0.2),rgba(236,72,153,0.1));color:#ec4899;border-color:rgba(236,72,153,0.3)}
.li-tag.size{background:linear-gradient(135deg,rgba(251,191,36,0.2),rgba(251,191,36,0.1));color:#fbbf24;border-color:rgba(251,191,36,0.3)}
.li-tag.lang{background:rgba(255,255,255,0.1);color:#e5e7eb;border-color:rgba(255,255,255,0.2)}
.li-tag.sub{background:rgba(107,114,128,0.2);color:#9ca3af;border-color:rgba(107,114,128,0.3)}
.li-tag.ad{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border-color:#ef4444;font-weight:700}

.li-nfo{background:rgba(12,21,32,0.8);border-radius:8px;padding:12px;font-family:'Fira Code',monospace;font-size:11px;color:#6b7280;max-height:80px;overflow:auto;margin-top:12px;white-space:pre-wrap;border:1px solid rgba(30,58,79,0.4)}

.li-bottom{padding:12px 16px;background:rgba(30,58,79,0.2)}
.li-btn{padding:12px 20px;background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;width:100%;transition:all 0.2s;text-transform:uppercase;letter-spacing:0.5px}
.li-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(20,184,166,0.4)}
.li-btn:active{transform:scale(0.98)}

.em{color:#6b7280;padding:40px 20px;text-align:center;font-size:15px;background:rgba(22,34,48,0.5);border-radius:12px;border:1px dashed rgba(30,58,79,0.6)}
.ft{text-align:center;color:#4b5563;font-size:12px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(30,58,79,0.3)}
.ft a{color:#14B8A6;text-decoration:none;font-weight:500}
.ft a:hover{text-decoration:underline}

.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;backdrop-filter:blur(8px)}
.mo.sh{display:flex}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:28px;max-width:420px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4)}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:20px;font-weight:700}
.mc-sub{color:#6b7280;font-size:14px;margin-bottom:20px}
.steps{display:flex;justify-content:center;gap:10px;margin-bottom:20px}
.step{width:12px;height:12px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:12px;padding:14px;margin:10px 0;text-align:left;display:flex;align-items:flex-start;gap:12px}
.bx svg{flex-shrink:0;width:20px;height:20px}
.bx-content{min-width:0}
.bx-content b{display:block;font-size:14px;margin-bottom:3px}
.bx-content span{font-size:12px;opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:6px;background:#e5e7eb;border-radius:3px;margin:16px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:14px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bt:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.bt:active{transform:scale(0.98)}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 4px 14px rgba(102,126,234,0.4)}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,0.4)}
.hi{display:none}
.cf{margin-top:14px;font-size:11px;color:#9ca3af}
.cf a{color:#667eea;text-decoration:none;font-weight:500}
.tag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;margin-left:8px;font-weight:600}

@media(max-width:480px){
.hd{flex-direction:column;text-align:center}
.ps{width:60px;height:90px}
.li-nm{min-width:100%}
}
</style>
</head>
<body>
<div class="hd">
${posterUrl ? `<img src="${posterUrl}" alt="${title}" class="ps">` : ""}
<div>
<div class="tt">${title}</div>
<div class="tg">${mediaType === "movie" ? "Film" : "Série"}${seasonNumber !== undefined ? ` - Saison ${seasonNumber}` : ""}${episodeNumber !== undefined ? ` Épisode ${episodeNumber}` : ""}</div>
</div>
</div>

<div class="sb" id="${ids.sortBtns}">
<button class="sb-btn ac" data-sort="default">Défaut</button>
<button class="sb-btn" data-sort="quality">Qualité</button>
<button class="sb-btn" data-sort="resolution">Résolution</button>
<button class="sb-btn" data-sort="codec">Codec</button>
<button class="sb-btn" data-sort="size">Taille</button>
<button class="sb-btn" data-sort="uploader">Uploadeur</button>
</div>

<div id="${ids.linksContainer}"></div>

<div class="ft">par <a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a></div>

<div class="mo" id="${ids.overlay}">
<div class="mc">
<h2>Votre téléchargement est prêt</h2>
<div class="mc-sub">Une dernière étape pour accéder au fichier</div>
<div class="steps">
<div class="step active" id="${ids.step1}"></div>
<div class="step" id="${ids.step2}"></div>
<div class="step" id="${ids.step3}"></div>
</div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="bx bh" id="${ids.boxHelp}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-106a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<div class="bx bi" id="${ids.boxTime}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
<div class="bx-content"><b>Temps restant: <span id="${ids.timer}">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div>
</div>
<div class="bx bo hi" id="${ids.boxThanks}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div class="bx-content"><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div>
</div>
<div class="bx bo hi" id="${ids.boxDone}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
<div class="bx-content"><b>Tout est prêt !</b><span>Cliquez pour télécharger</span></div>
</div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">Continuer<span class="tag">PUB</span></button>
<button class="bt bn hi" id="${ids.btnDownload}">Télécharger</button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>

<script>
(function(){
var _lks=${linksJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};
var _isSeries=${isSeries};
var _showGroups=${showSeasonGroups};
var _sort="default";
var _sortDir=1;

function _renderLinks(){
var c=document.getElementById(_ids.linksContainer);
if(!c)return;
if(_lks.length===0){
c.innerHTML='<div class="em">Aucun lien de téléchargement disponible</div>';
return;
}
var sorted=[].concat(_lks);
if(_sort!=="default"){
sorted.sort(function(a,b){
var va,vb;
if(_sort==="quality"){va=a.quality||"";vb=b.quality||"";}
else if(_sort==="resolution"){va=a.resolution||"";vb=b.resolution||"";}
else if(_sort==="codec"){va=a.codec_video||"";vb=b.codec_video||"";}
else if(_sort==="size"){va=a.file_size||"";vb=b.file_size||"";}
else if(_sort==="uploader"){va=(a.profiles&&a.profiles.username)||"";vb=(b.profiles&&b.profiles.username)||"";}
if(va<vb)return -1*_sortDir;
if(va>vb)return 1*_sortDir;
return 0;
});
}
if(_showGroups){
var groups={};
for(var i=0;i<sorted.length;i++){
var sn=sorted[i].season_number||0;
if(!groups[sn])groups[sn]=[];
groups[sn].push(sorted[i]);
}
var html="";
var seasons=Object.keys(groups).sort(function(a,b){return parseInt(a)-parseInt(b);});
for(var j=0;j<seasons.length;j++){
var s=seasons[j];
var g=groups[s];
html+='<div class="sg"><div class="sg-hd" data-s="'+s+'">Saison '+s+' ('+g.length+' liens)<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="sg-ct" data-sc="'+s+'">';
for(var k=0;k<g.length;k++){html+=_renderLink(g[k]);}
html+='</div></div>';
}
c.innerHTML=html;
var hds=c.querySelectorAll(".sg-hd");
for(var h=0;h<hds.length;h++){
hds[h].onclick=function(){
var sn=this.getAttribute("data-s");
var ct=document.querySelector('[data-sc="'+sn+'"]');
if(ct){ct.classList.toggle("hd");this.classList.toggle("cl");}
};
}
}else{
var html='';
for(var i=0;i<sorted.length;i++){html+=_renderLink(sorted[i]);}
c.innerHTML=html;
}
_bindBtns();
}

function _renderLink(l){
var ep="";
if(_isSeries){
if(l.is_full_season){ep='<span class="li-ep">Saison '+l.season_number+' Complete</span>';}
else if(l.episode_number){ep='<span class="li-ep">S'+l.season_number+'E'+l.episode_number+'</span>';}
}
var up=(l.profiles&&l.profiles.username)?'<a href="/profile/'+encodeURIComponent(l.profiles.username)+'" target="_blank" class="li-up">par '+l.profiles.username+'</a>':"";
var release=l.release_name||l.source_name||"Téléchargement";
var url=l.source_url||"";
if(url&&!url.startsWith("http://")&&!url.startsWith("https://")){url="https://"+url;}

var meta='<div class="li-meta">';
if(l.quality)meta+='<span class="li-tag quality">'+l.quality+'</span>';
if(l.resolution)meta+='<span class="li-tag resolution">'+l.resolution+'</span>';
if(l.codec_video)meta+='<span class="li-tag codec">'+l.codec_video+'</span>';
if(l.codec_audio)meta+='<span class="li-tag audio">'+l.codec_audio+'</span>';
if(l.file_size)meta+='<span class="li-tag size">'+l.file_size+'</span>';
if(l.language)meta+='<span class="li-tag lang">'+l.language+'</span>';
if(l.subtitle)meta+='<span class="li-tag sub">ST: '+l.subtitle+'</span>';
if(l.has_audio_description)meta+='<span class="li-tag ad">AD</span>';
meta+='</div>';

var nfo=l.nfo?'<div class="li-nfo">'+l.nfo.replace(/</g,"&lt;").replace(/>/g,"&gt;")+'</div>':"";

return '<div class="li"><div class="li-top"><div class="li-header">'+ep+'<div class="li-nm">'+release+'</div>'+up+'</div>'+meta+nfo+'</div><div class="li-bottom"><button class="li-btn" data-url="'+encodeURIComponent(url)+'">Télécharger</button></div></div>';
}

function _bindBtns(){
var bs=document.querySelectorAll(".li-btn");
for(var j=0;j<bs.length;j++){
bs[j].onclick=function(){
var url=decodeURIComponent(this.getAttribute("data-url"));
if(_h&&_u){_sa(url);}else{window.open(url,"_blank");}
};
}
}

function _sa(url){
_p=url;
var o=document.getElementById(_ids.overlay);
var bt=document.getElementById(_ids.boxTime);
var bh=document.getElementById(_ids.boxHelp);
var bk=document.getElementById(_ids.boxThanks);
var bd=document.getElementById(_ids.boxDone);
var pr=document.getElementById(_ids.progress);
var tm=document.getElementById(_ids.timer);
var bu=document.getElementById(_ids.btnUnlock);
var dn=document.getElementById(_ids.btnDownload);
var s1=document.getElementById(_ids.step1);
var s2=document.getElementById(_ids.step2);
var s3=document.getElementById(_ids.step3);
if(bt)bt.classList.remove("hi");
if(bh)bh.classList.remove("hi");
if(bk)bk.classList.add("hi");
if(bd)bd.classList.add("hi");
if(pr)pr.style.width="0";
if(tm)tm.textContent="3";
if(bu)bu.classList.remove("hi");
if(dn)dn.classList.add("hi");
if(s1){s1.classList.add("active");s1.classList.remove("done");}
if(s2){s2.classList.remove("active");s2.classList.remove("done");}
if(s3){s3.classList.remove("active");s3.classList.remove("done");}
o.classList.add("sh");

bu.onclick=function(){
var xhr=new XMLHttpRequest();
xhr.open("POST","/api/ads/click",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(JSON.stringify({adId:_i}));
window.open(_u,"_blank");
bu.classList.add("hi");
if(s1){s1.classList.remove("active");s1.classList.add("done");}
if(s2)s2.classList.add("active");
var s=3,pg=0;
var iv=setInterval(function(){
s--;pg+=33.33;
if(tm)tm.textContent=s+" seconde(s)";
if(pr)pr.style.width=pg+"%";
if(s<=0){
clearInterval(iv);
if(s2){s2.classList.remove("active");s2.classList.add("done");}
if(s3)s3.classList.add("active");
if(bt)bt.classList.add("hi");
if(bh)bh.classList.add("hi");
if(bk)bk.classList.remove("hi");
if(bd)bd.classList.remove("hi");
if(pr)pr.style.width="100%";
if(dn)dn.classList.remove("hi");
}
},1000);
};

dn.onclick=function(){
o.classList.remove("sh");
if(_p){window.open(_p,"_blank");_p=null;}
};
}

var sbs=document.querySelectorAll(".sb-btn");
for(var k=0;k<sbs.length;k++){
sbs[k].onclick=function(){
var ns=this.getAttribute("data-sort");
if(_sort===ns){_sortDir*=-1;}else{_sort=ns;_sortDir=1;}
for(var m=0;m<sbs.length;m++)sbs[m].classList.remove("ac");
this.classList.add("ac");
_renderLinks();
};
}

_renderLinks();
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
