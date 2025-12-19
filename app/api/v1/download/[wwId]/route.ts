import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params
  const supabase = createAdminClient()

  const isDigitalContent =
    wwId.startsWith("ww-ebook-") ||
    wwId.startsWith("ww-music-") ||
    wwId.startsWith("ww-software-") ||
    wwId.startsWith("ww-soft-") ||
    wwId.startsWith("ww-game-")

  // ============================================
  // DIGITAL CONTENT DOWNLOAD
  // ============================================
  if (isDigitalContent) {
    let digitalContent = null
    const { data: content1 } = await supabase.from("digital_content").select("*").eq("ww_id", wwId).single()

    if (content1) {
      digitalContent = content1
    } else if (wwId.startsWith("ww-soft-")) {
      // Try with ww-software- prefix instead
      const alternateWwId = wwId.replace("ww-soft-", "ww-software-")
      const { data: content2 } = await supabase.from("digital_content").select("*").eq("ww_id", alternateWwId).single()
      if (content2) {
        digitalContent = content2
      }
    } else if (wwId.startsWith("ww-software-")) {
      // Try with ww-soft- prefix instead
      const alternateWwId = wwId.replace("ww-software-", "ww-soft-")
      const { data: content2 } = await supabase.from("digital_content").select("*").eq("ww_id", alternateWwId).single()
      if (content2) {
        digitalContent = content2
      }
    }

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

    const title = digitalContent.title
    const cover = digitalContent.cover_url || ""
    const contentType = digitalContent.content_type
    const downloadLinks = digitalLinks?.filter((l) => l.source_url) || []

    await supabase.from("embed_views").insert({
      ww_id: wwId,
      embed_type: "download",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    const externalIds = {
      container: generateRandomId("ext"),
      loading: generateRandomId("extl"),
      content: generateRandomId("extc"),
      filters: generateRandomId("extf"),
      count: generateRandomId("extn"),
      details: generateRandomId("extd"),
      detailsContent: generateRandomId("extdc"),
    }

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
      linksContainer: generateRandomId("lc"),
    }

    const linksJson = JSON.stringify(downloadLinks || [])
      .replace(/'/g, "\\'")
      .replace(/</g, "\\u003c")

    const digitalHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - Téléchargements WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1a 0%,#111827 50%,#0f172a 100%);color:#e5e7eb;padding:16px;min-height:100vh}
.hd{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:rgba(30,58,79,0.3);border-radius:12px;border:1px solid rgba(30,58,79,0.5)}
.ps{width:70px;height:100px;object-fit:cover;border-radius:8px}
.tt{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
.tg{font-size:13px;color:#14B8A6;text-transform:capitalize}
.li{background:rgba(22,34,48,0.8);border-radius:12px;margin-bottom:12px;overflow:hidden}
.li-top{padding:16px;border-bottom:1px solid rgba(30,58,79,0.4)}
.li-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.li-nm{font-weight:600;font-size:15px;color:#fff;flex:1}
.li-meta{display:flex;flex-wrap:wrap;gap:8px}
.li-tag{padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600}
.li-bottom{padding:12px 16px;background:rgba(30,58,79,0.2)}
.li-btn{padding:12px 20px;background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;width:100%}
.em{color:#6b7280;padding:40px 20px;text-align:center;font-size:15px;background:rgba(22,34,48,0.5);border-radius:12px}
.ft{text-align:center;color:#4b5563;font-size:12px;margin-top:20px}
.ft a{color:#14B8A6}
.sec-title{display:flex;align-items:center;gap:10px;padding:16px;background:linear-gradient(135deg,rgba(102,126,234,0.2),rgba(118,75,162,0.2));border:1px solid rgba(102,126,234,0.3);border-radius:12px;margin:24px 0 16px;font-weight:700;color:#a78bfa}
.sec-title svg{width:20px;height:20px}
.sec-title .badge{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;margin-left:auto}
.ext-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:30px;color:#8ba3b5}
.ext-loading svg{animation:spin 1s linear infinite;width:24px;height:24px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ext-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:rgba(30,58,79,0.2);border-radius:10px}
.ext-select{padding:8px 12px;background:rgba(30,58,79,0.5);border:1px solid #1e3a4f;border-radius:8px;color:#e5e7eb;font-size:12px}
.ext-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.ext-card{background:rgba(22,34,48,0.8);border-radius:12px;border:1px solid rgba(102,126,234,0.3);overflow:hidden;transition:all 0.2s}
.ext-card:hover{border-color:rgba(102,126,234,0.6);transform:translateY(-2px)}
.ext-card-body{padding:16px}
.ext-provider{font-size:11px;color:#667eea;font-weight:600;text-transform:uppercase;margin-bottom:8px}
.ext-quality{display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:10px}
.ext-info{font-size:12px;color:#94a3b8;margin-bottom:6px}
.ext-host{padding:10px 0;border-top:1px solid rgba(30,58,79,0.4);margin-top:10px}
.ext-host span{font-size:12px;color:#8ba3b5}
.ext-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.ext-stat{text-align:center;padding:8px;background:rgba(30,58,79,0.3);border-radius:6px}
.ext-stat-label{font-size:10px;color:#6b7280}
.ext-stat-value{font-size:13px;font-weight:600;color:#e5e7eb}
.ext-btn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;margin-top:12px}
.ext-details{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px)}
.ext-details.show{display:flex}
.ext-details-inner{background:linear-gradient(135deg,#0c1520,#162230);border:1px solid rgba(102,126,234,0.4);border-radius:16px;max-width:420px;width:100%;max-height:85vh;overflow:auto}
.ext-details-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px 16px 0 0}
.ext-details-header h3{font-size:16px;font-weight:700;color:#fff}
.ext-close{background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center}
.ext-close:hover{background:rgba(255,255,255,0.3)}
.ext-details-body{padding:20px}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px)}
.mo.sh{display:flex}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:24px;max-width:400px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4)}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:20px;font-weight:700}
.mc-sub{color:#6b7280;font-size:13px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px}
.bx-content b{display:block;font-size:14px;margin-bottom:2px}
.bx-content span{font-size:12px;opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:11px;color:#9ca3af}
.cf a{color:#667eea}
.tag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:600}
.link-display{background:rgba(20,184,166,0.1);border:1px solid rgba(20,184,166,0.3);border-radius:12px;padding:16px;margin-top:16px;text-align:center}
.link-display-title{font-size:14px;color:#14B8A6;margin-bottom:12px;font-weight:600}
.link-display-url{background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;word-break:break-all;font-family:monospace;font-size:12px;color:#e5e7eb;margin-bottom:12px}
.link-display-btn{display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
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

<div id="${ids.linksContainer}"></div>

<div class="sec-title">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
Sources externes
<span class="badge" id="${externalIds.count}">...</span>
</div>

<div id="${externalIds.container}">
<div class="ext-loading" id="${externalIds.loading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources externes...
</div>
<div id="${externalIds.filters}" class="ext-filters" style="display:none">
<select id="extQualityFilter" class="ext-select"><option value="">Qualité</option></select>
<select id="extLanguageFilter" class="ext-select"><option value="">Langue</option></select>
<select id="extProviderFilter" class="ext-select"><option value="">Provider</option></select>
</div>
<div id="${externalIds.content}" class="ext-grid"></div>
</div>

<div id="${externalIds.details}" class="ext-details">
<div class="ext-details-inner">
<div class="ext-details-header">
<h3>Détails du lien</h3>
<button class="ext-close" id="extCloseBtn">&times;</button>
</div>
<div class="ext-details-body" id="${externalIds.detailsContent}"></div>
</div>
</div>

<!-- Added linkDisplayArea for digital section -->
<div class="link-display-area" id="linkDisplayArea"></div>

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
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
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
<div class="bx-content"><b>Tout est prêt !</b><span>Cliquez pour voir le lien</span></div>
</div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">Continuer<span class="tag">PUB</span></button>
<button class="bt bn hi" id="${ids.btnDownload}">Voir le lien</button>
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
var _extIds=${JSON.stringify(externalIds)};
var _title="${title.replace(/"/g, '\\"')}";
var _wwId="${digitalContent.ww_id}";
var _allExtLinks=[];

function _renderLink(l){
var url=l.source_url||"";
var release=l.release_name||l.source_name||"Fichier téléchargeable";

var meta='<div class="li-meta">';
if(l.quality)meta+='<span class="li-tag" style="background:#0d9488;color:#ffffff">'+l.quality+'</span>';
if(l.resolution)meta+='<span class="li-tag" style="background:#7c3aed;color:#ffffff">'+l.resolution+'</span>';
if(l.file_size)meta+='<span class="li-tag" style="background:#059669;color:#ffffff">'+l.file_size+'</span>';
if(l.language)meta+='<span class="li-tag" style="background:#2563eb;color:#ffffff">'+l.language+'</span>';
if(l.codec_video)meta+='<span class="li-tag" style="background:#db2777;color:#ffffff">'+l.codec_video+'</span>';
if(l.codec_audio)meta+='<span class="li-tag" style="background:#ea580c;color:#ffffff">'+l.codec_audio+'</span>';
if(l.source_type)meta+='<span class="li-tag" style="background:#dc2626;color:#ffffff">'+l.source_type+'</span>';
meta+='</div>';

var btnText=url?'Télécharger':'Lien indisponible';
var btnDisabled=!url?' disabled style="opacity:0.5;cursor:not-allowed"':'';

return '<div class="li"><div class="li-top"><div class="li-header"><div class="li-nm">'+release+'</div></div>'+meta+'</div><div class="li-bottom"><button class="li-btn"'+btnDisabled+' data-url="'+encodeURIComponent(url)+'">'+btnText+'</button></div></div>';
}

function _renderLinks(){
var c=document.getElementById(_ids.linksContainer);
if(!c)return;
if(_lks.length===0){c.innerHTML='<div class="em">Aucun lien direct disponible</div>';return;}
var html='';
for(var i=0;i<_lks.length;i++){html+=_renderLink(_lks[i]);}
c.innerHTML=html;
_bindBtns();
}

function _bindBtns(){
var bs=document.querySelectorAll(".li-btn");
for(var j=0;j<bs.length;j++){
(function(btn){
btn.onclick=function(e){
e.preventDefault();
var url=btn.getAttribute("data-url");
if(!url||url==="undefined"){alert("Lien non disponible");return;}
if(_h&&_u){_showAdModal(decodeURIComponent(url));}
else{
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"digital",wwId:_wwId})});
_displayLink(decodeURIComponent(url));
}
};
})(bs[j]);
}
}

function _displayLink(url){
var area=document.getElementById("linkDisplayArea");
area.style.display="block";
area.innerHTML='<div class="link-display"><div class="link-display-title">Votre lien est prêt !</div><div class="link-display-url">'+url+'</div><a href="'+url+'" target="_blank" class="link-display-btn">Ouvrir le lien</a></div>';
area.scrollIntoView({behavior:"smooth"});
}

function _showAdModal(downloadUrl){
_p=downloadUrl;
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
if(o)o.classList.add("sh");

bu.onclick=function(){
fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_i})});
window.open(_u,"_blank");
bu.classList.add("hi");
if(s1){s1.classList.remove("active");s1.classList.add("done");}
if(s2){s2.classList.remove("active");s2.classList.add("done");}
if(s3)s3.classList.add("active");
if(bt)bt.classList.add("hi");
if(bh)bh.classList.add("hi");
if(bk)bk.classList.remove("hi");
if(bd)bd.classList.remove("hi");
if(pr)pr.style.width="100%";
if(dn)dn.classList.remove("hi");
};

dn.onclick=function(){
o.classList.remove("sh");
if(_p){
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"digital",wwId:_wwId})});
_displayLink(_p);
_p=null;
}
};
}

function _loadExternal(){
var loading=document.getElementById(_extIds.loading);
var content=document.getElementById(_extIds.content);
var filters=document.getElementById(_extIds.filters);
var countBadge=document.getElementById(_extIds.count);

fetch("https://api.movix.site/api/search?title="+encodeURIComponent(_title))
.then(function(r){return r.json();})
.then(function(data){
var results=data;
if(data&&typeof data==="object"&&!Array.isArray(data)){
if(data.results)results=data.results;
else if(data.data)results=data.data;
}
if(!Array.isArray(results)||results.length===0){
loading.style.display="none";
content.innerHTML='<div class="em">Aucune source externe trouvée</div>';
countBadge.textContent="0";
return;
}
var first=results[0];
var movieId=first.id||first.movie_id||first.tmdb_id;
fetch("https://api.movix.site/api/darkiworld/download/movie/"+movieId)
.then(function(r){return r.json();})
.then(function(dlData){
loading.style.display="none";
var links=(dlData&&dlData.success&&dlData.all)?dlData.all:null;
if(!links||links.length===0){
content.innerHTML='<div class="em">Aucun lien externe disponible</div>';
countBadge.textContent="0";
return;
}
_allExtLinks=links;
countBadge.textContent=links.length;
_populateFilters(links);
filters.style.display="flex";
_renderExtLinks(links);
}).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur</div>';countBadge.textContent="0";});
}).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur</div>';countBadge.textContent="0";});
}

function _populateFilters(links){
var qualities=new Set(),languages=new Set(),providers=new Set();
links.forEach(function(l){if(l.quality)qualities.add(l.quality);if(l.language)languages.add(l.language);if(l.provider)providers.add(l.provider);});
var qf=document.getElementById("extQualityFilter"),lf=document.getElementById("extLanguageFilter"),pf=document.getElementById("extProviderFilter");
qualities.forEach(function(q){var o=document.createElement("option");o.value=q;o.textContent=q;qf.appendChild(o);});
languages.forEach(function(l){var o=document.createElement("option");o.value=l;o.textContent=l;lf.appendChild(o);});
providers.forEach(function(p){var o=document.createElement("option");o.value=p;o.textContent=p;pf.appendChild(o);});
qf.onchange=lf.onchange=pf.onchange=_applyFilters;
}

function _applyFilters(){
var qf=document.getElementById("extQualityFilter").value,lf=document.getElementById("extLanguageFilter").value,pf=document.getElementById("extProviderFilter").value;
var filtered=_allExtLinks.filter(function(l){
if(qf&&l.quality!==qf)return false;
if(lf&&l.language!==lf)return false;
if(pf&&l.provider!==pf)return false;
return true;
});
_renderExtLinks(filtered);
}

function _formatSize(bytes){if(!bytes)return"N/A";var gb=bytes/(1024*1024*1024);if(gb>=1)return gb.toFixed(2)+" GB";var mb=bytes/(1024*1024);return mb.toFixed(0)+" MB";}

function _renderExtLinks(links){
var content=document.getElementById(_extIds.content);
if(links.length===0){content.innerHTML='<div class="em">Aucun résultat</div>';return;}
var html="";
links.forEach(function(l,idx){
html+='<div class="ext-card" data-idx="'+idx+'"><div class="ext-card-body">';
html+='<div class="ext-provider">'+(l.provider||"Inconnu")+'</div>';
html+='<span class="ext-quality">'+(l.quality||"N/A")+'</span>';
html+='<div class="ext-info">'+(l.language||"N/A")+'</div>';
if(l.host_name)html+='<div class="ext-host"><span>'+l.host_name+'</span></div>';
if(l.size)html+='<div class="ext-stats"><div class="ext-stat"><span class="ext-stat-label">Taille</span><span class="ext-stat-value">'+_formatSize(l.size)+'</span></div></div>';
html+='<button class="ext-btn">Télécharger</button></div></div>';
});
content.innerHTML=html;
content.querySelectorAll(".ext-card").forEach(function(card){
card.querySelector(".ext-btn").onclick=function(e){
e.stopPropagation();
var idx=parseInt(card.getAttribute("data-idx"));
_showExtDetails(_allExtLinks[idx]);
};
});
}

function _showExtDetails(link){
var details=document.getElementById(_extIds.details);
var body=document.getElementById(_extIds.detailsContent);

body.innerHTML='<div style="text-align:center;padding:30px;color:#8ba3b5"><svg style="animation:spin 1s linear infinite;width:32px;height:32px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><p style="margin-top:12px">Chargement du lien...</p></div>';
details.classList.add("show");

fetch("https://api.movix.site/api/darkiworld/decode/"+link.id)
.then(function(r){return r.json();})
.then(function(data){
if(!data||!data.success){
body.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444"><p>Lien indisponible</p></div>';
return;
}

var finalUrl = null;
if(data.embed_url){
  if(typeof data.embed_url === 'string') finalUrl = data.embed_url;
  else if(data.embed_url.lien) finalUrl = data.embed_url.lien;
  else if(data.embed_url.url) finalUrl = data.embed_url.url;
  else if(data.embed_url.link) finalUrl = data.embed_url.link;
}
if(!finalUrl && data.url) finalUrl = data.url;
if(!finalUrl && data.link) finalUrl = data.link;
if(!finalUrl && data.lien) finalUrl = data.lien;
if(!finalUrl && data.direct_link) finalUrl = data.direct_link;

if(!finalUrl){
body.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444"><p>Lien indisponible</p></div>';
return;
}

details.classList.remove("show");

fetch("/api/link-click",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
    linkType:"external",
    wwId:_wwId,
    isExternal:true,
    provider:link.provider||null,
    hostName:link.host_name||null,
    quality:link.quality||null,
    language:link.language||null,
    fileSize:link.size||null,
    externalLinkId:link.id||null
  })
});

if(_h&&_u){
  _showAdModal(finalUrl);
}else{
  _displayLink(finalUrl);
}
})
.catch(function(err){
body.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444"><p>Erreur de décodage</p></div>';
});
}

document.getElementById("extCloseBtn").onclick=function(){document.getElementById(_extIds.details).classList.remove("show");};

_renderLinks();
_loadExternal();
})();
</script>
</body>
</html>`

    return new NextResponse(digitalHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "ALLOWALL",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }

  // ============================================
  // FILM / SERIE DOWNLOAD
  // ============================================
  const parsed = parseWWId(wwId)

  if (!parsed) {
    return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })
  }

  const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed

  const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
  const hasAds = ads && ads.length > 0
  const adUrl = hasAds ? ads[0].ad_url : ""
  const adId = hasAds ? ads[0].id : ""

  const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)
  const title = tmdbData ? ("title" in tmdbData ? tmdbData.title : tmdbData.name) : "Unknown"
  const posterPath = tmdbData?.poster_path
  const posterUrl = posterPath ? getPosterUrl(posterPath, "w185") : ""

  let query = supabase
    .from("download_links")
    .select(`*, profiles:submitted_by (username)`)
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
    linksContainer: generateRandomId("lc"),
  }

  const linksJson = JSON.stringify(links || [])
    .replace(/'/g, "\\'")
    .replace(/</g, "\\u003c")
  const isSeries = mediaType === "tv"

  const externalIds = {
    container: generateRandomId("ext"),
    content: generateRandomId("exc"),
    loading: generateRandomId("exl"),
    filters: generateRandomId("exf"),
    count: generateRandomId("exn"),
    details: generateRandomId("exd"),
    detailsContent: generateRandomId("exdc"),
  }

  const movieHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Téléchargement - ${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1a 0%,#111827 50%,#0f172a 100%);color:#e5e7eb;padding:16px;min-height:100vh}
.hd{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:rgba(30,58,79,0.3);border-radius:12px;border:1px solid rgba(30,58,79,0.5)}
.ps{width:70px;height:100px;object-fit:cover;border-radius:8px}
.tt{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
.tg{font-size:13px;color:#14B8A6}
.li{background:rgba(22,34,48,0.8);border-radius:12px;margin-bottom:12px;overflow:hidden}
.li-top{padding:16px;border-bottom:1px solid rgba(30,58,79,0.4)}
.li-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.li-ep{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700}
.li-nm{font-weight:600;font-size:15px;color:#fff;flex:1}
.li-up{font-size:12px;color:#6b7280;background:rgba(107,114,128,0.1);padding:4px 10px;border-radius:6px}
.li-meta{display:flex;flex-wrap:wrap;gap:8px}
.li-tag{padding:6px 10px;background:rgba(30,58,79,0.6);border-radius:6px;font-size:11px;color:#94a3b8;border:1px solid rgba(30,58,79,0.8)}
.li-tag.quality{background:linear-gradient(135deg,rgba(20,184,166,0.2),rgba(20,184,166,0.1));color:#14B8A6;border-color:rgba(20,184,166,0.3)}
.li-bottom{padding:12px 16px;background:rgba(30,58,79,0.2)}
.li-btn{padding:12px 20px;background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;width:100%}
.em{color:#6b7280;padding:40px 20px;text-align:center;font-size:15px;background:rgba(22,34,48,0.5);border-radius:12px}
.ft{text-align:center;color:#4b5563;font-size:12px;margin-top:20px}
.ft a{color:#14B8A6}
.sec-title{display:flex;align-items:center;gap:10px;padding:16px;background:linear-gradient(135deg,rgba(102,126,234,0.2),rgba(118,75,162,0.2));border:1px solid rgba(102,126,234,0.3);border-radius:12px;margin:24px 0 16px;font-weight:700;color:#a78bfa}
.sec-title svg{width:20px;height:20px}
.sec-title .badge{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;margin-left:auto}
.ext-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:30px;color:#8ba3b5}
.ext-loading svg{animation:spin 1s linear infinite;width:24px;height:24px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ext-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:rgba(30,58,79,0.2);border-radius:10px}
.ext-select{padding:8px 12px;background:rgba(30,58,79,0.5);border:1px solid #1e3a4f;border-radius:8px;color:#e5e7eb;font-size:12px}
.ext-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.ext-card{background:rgba(22,34,48,0.8);border-radius:12px;border:1px solid rgba(102,126,234,0.3);overflow:hidden;transition:all 0.2s}
.ext-card:hover{border-color:rgba(102,126,234,0.6);transform:translateY(-2px)}
.ext-card-body{padding:16px}
.ext-provider{font-size:11px;color:#667eea;font-weight:600;text-transform:uppercase;margin-bottom:8px}
.ext-quality{display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:10px}
.ext-info{display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8;margin-bottom:6px}
.ext-host{display:flex;align-items:center;gap:8px;padding:10px 0;border-top:1px solid rgba(30,58,79,0.4);margin-top:10px}
.ext-host img{width:20px;height:20px;border-radius:4px}
.ext-host span{font-size:12px;color:#8ba3b5}
.ext-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.ext-stat{text-align:center;padding:8px;background:rgba(30,58,79,0.3);border-radius:6px}
.ext-stat-label{font-size:10px;color:#6b7280}
.ext-stat-value{font-size:13px;font-weight:600;color:#e5e7eb}
.ext-btn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;margin-top:12px}
/* Fixed modal CSS to be centered overlay like digital */
.ext-details{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px)}
.ext-details.show{display:flex}
.ext-details-inner{background:linear-gradient(135deg,#0c1520,#162230);border:1px solid rgba(102,126,234,0.4);border-radius:16px;max-width:420px;width:100%;max-height:85vh;overflow:auto}
.ext-details-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px 16px 0 0}
.ext-details-header h3{font-size:16px;font-weight:700;color:#fff}
.ext-close{background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center}
.ext-close:hover{background:rgba(255,255,255,0.3)}
.ext-details-body{padding:20px}
.ext-unlock-btn{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;width:100%;margin-top:16px}
.ext-link-result{margin-top:12px;padding:12px;background:rgba(30,58,79,0.3);border-radius:6px}
.ext-link-result a{color:#14B8A6;font-size:12px}
/* Added link display styles for film/serie */
.link-display-area{display:none;margin:20px 0;padding:20px;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(20,184,166,0.1));border:2px solid #10b981;border-radius:12px}
.link-display-title{font-size:16px;font-weight:700;color:#10b981;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.link-display-url{background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-family:monospace;font-size:12px;color:#5eead4;word-break:break-all;margin-bottom:16px;border:1px solid rgba(94,234,212,0.3)}
.link-display-btns{display:flex;gap:10px;flex-wrap:wrap}
.link-display-btn{flex:1;min-width:140px;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;text-align:center;text-decoration:none;transition:all 0.2s}
.link-display-btn.primary{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none}
.link-display-btn.primary:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(16,185,129,0.4)}
.link-display-btn.secondary{background:transparent;color:#5eead4;border:2px solid #5eead4}
.link-display-btn.secondary:hover{background:rgba(94,234,212,0.1)}
.copy-success{color:#10b981;font-size:12px;margin-top:8px;display:none}
/* Added modal styles for internal links pub system */
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px)}
.mo.sh{display:flex}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:24px;max-width:400px;width:100%;text-align:center}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:20px;font-weight:700}
.mc-sub{color:#6b7280;font-size:13px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px}
.bx-content b{display:block;font-size:14px;margin-bottom:2px}
.bx-content span{font-size:12px;opacity:0.8}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:11px;color:#9ca3af}
.cf a{color:#667eea}
.tag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:600}
</style>
</head>
<body>
<div class="hd">
${posterUrl ? `<img src="${posterUrl}" alt="${title}" class="ps">` : ""}
<div>
<div class="tt">${title}</div>
<div class="tg">${mediaType === "movie" ? "Film" : "Série"}</div>
</div>
</div>

<div id="${ids.linksContainer}"></div>

<div class="sec-title">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
Sources externes
<span class="badge" id="${externalIds.count}">...</span>
</div>

<div id="${externalIds.container}">
<div class="ext-loading" id="${externalIds.loading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources externes...
</div>
<div id="${externalIds.filters}" class="ext-filters" style="display:none">
<select id="extQualityFilter" class="ext-select"><option value="">Qualité</option></select>
<select id="extLanguageFilter" class="ext-select"><option value="">Langue</option></select>
<select id="extProviderFilter" class="ext-select"><option value="">Provider</option></select>
</div>
<div id="${externalIds.content}" class="ext-grid"></div>
</div>

<div id="${externalIds.details}" class="ext-details">
<div class="ext-details-inner">
<div class="ext-details-header">
<h3>Détails du lien</h3>
<button class="ext-close" id="extCloseBtn">&times;</button>
</div>
<div class="ext-details-body" id="${externalIds.detailsContent}"></div>
</div>
</div>

<!-- Removed visible JS comment, using HTML comment instead -->
<div class="link-display-area" id="linkDisplayArea"></div>

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
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
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
<div class="bx-content"><b>Tout est prêt !</b><span>Cliquez pour voir le lien</span></div>
</div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">Continuer<span class="tag">PUB</span></button>
<button class="bt bn hi" id="${ids.btnDownload}">Voir le lien</button>
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
var _extIds=${JSON.stringify(externalIds)};
var _isSeries=${isSeries};
var _title="${title.replace(/"/g, '\\"')}";
var _mediaType="${mediaType}";
var _tmdbId=${tmdbId};
var _seasonNum=${seasonNumber !== undefined ? seasonNumber : "null"};
var _episodeNum=${episodeNumber !== undefined ? episodeNumber : "null"};
var _wwId="${wwId}";
var _allExtLinks=[];

function _renderLink(l){
var url=l.source_url||"";
var release=l.release_name||l.source_name||"Fichier téléchargeable";
var up=l.username?'<div class="li-up">par <span>'+l.username+'</span></div>':"";

var ep="";
if(_mediaType==="series"||_mediaType==="tv"){
var sNum=l.season_number||_seasonNum||1;
var eNum=l.episode_number||_episodeNum||1;
ep='<div class="li-ep">S'+sNum.toString().padStart(2,"0")+'E'+eNum.toString().padStart(2,"0")+'</div>';
}

var meta='<div class="li-meta">';
if(l.quality)meta+='<span class="li-tag" style="background:#0d9488;color:#ffffff">'+l.quality+'</span>';
if(l.resolution)meta+='<span class="li-tag" style="background:#7c3aed;color:#ffffff">'+l.resolution+'</span>';
if(l.file_size)meta+='<span class="li-tag" style="background:#059669;color:#ffffff">'+l.file_size+'</span>';
if(l.language)meta+='<span class="li-tag" style="background:#2563eb;color:#ffffff">'+l.language+'</span>';
if(l.codec_video)meta+='<span class="li-tag" style="background:#db2777;color:#ffffff">'+l.codec_video+'</span>';
if(l.codec_audio)meta+='<span class="li-tag" style="background:#ea580c;color:#ffffff">'+l.codec_audio+'</span>';
if(l.source_name)meta+='<span class="li-tag" style="background:#dc2626;color:#ffffff">'+l.source_name+'</span>';
if(l.subtitle)meta+='<span class="li-tag" style="background:#4f46e5;color:#ffffff">'+l.subtitle+'</span>';
meta+='</div>';

var btnText=url?'Télécharger':'Lien indisponible';
var btnDisabled=!url?' disabled style="opacity:0.5;cursor:not-allowed"':'';

return '<div class="li"><div class="li-top"><div class="li-header">'+ep+'<div class="li-nm">'+release+'</div>'+up+'</div>'+meta+'</div><div class="li-bottom"><button class="li-btn"'+btnDisabled+' data-url="'+encodeURIComponent(url)+'">'+btnText+'</button></div></div>';
}

function _renderLinks(){
var c=document.getElementById(_ids.linksContainer);
if(!c)return;
if(_lks.length===0){c.innerHTML='<div class="em">Aucun lien direct disponible</div>';return;}
var html='';
for(var i=0;i<_lks.length;i++){html+=_renderLink(_lks[i]);}
c.innerHTML=html;
_bindBtns();
}

function _bindBtns(){
var bs=document.querySelectorAll(".li-btn");
for(var j=0;j<bs.length;j++){
(function(btn){
btn.onclick=function(e){
e.preventDefault();
var url=btn.getAttribute("data-url");
if(!url||url==="undefined"){alert("Lien non disponible");return;}
if(_h&&_u){_sa(decodeURIComponent(url));}
else{
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"download",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType})});
window.open(decodeURIComponent(url),"_blank");
}
};
})(bs[j]);
}
}

function _displayLink(url){
var area=document.getElementById("linkDisplayArea");
area.style.display="block";
area.innerHTML='<div class="link-display-title"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Votre lien est prêt !</div><div class="link-display-url" id="linkUrlText">'+url+'</div><div class="link-display-btns"><a href="'+url+'" target="_blank" class="link-display-btn primary">Ouvrir le lien</a><button class="link-display-btn secondary" onclick="_copyLink()">Copier le lien</button></div><div class="copy-success" id="copySuccess">Lien copié !</div>';
area.scrollIntoView({behavior:"smooth"});
}

function _copyLink(){
var urlText=document.getElementById("linkUrlText").textContent;
navigator.clipboard.writeText(urlText).then(function(){
var msg=document.getElementById("copySuccess");
msg.style.display="block";
setTimeout(function(){msg.style.display="none";},2000);
});
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
fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_i})});
window.open(_u,"_blank");
bu.classList.add("hi");
if(s1){s1.classList.remove("active");s1.classList.add("done");}
if(s2){s2.classList.remove("active");s2.classList.add("done");}
if(s3)s3.classList.add("active");
if(bt)bt.classList.add("hi");
if(bh)bh.classList.add("hi");
if(bk)bk.classList.remove("hi");
if(bd)bd.classList.remove("hi");
if(pr)pr.style.width="100%";
if(dn)dn.classList.remove("hi");
};

dn.onclick=function(){
o.classList.remove("sh");
if(_p){
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"download",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType})});
_displayLink(_p);
_p=null;
}
};
}

function _loadExternal(){
var loading=document.getElementById(_extIds.loading);
var content=document.getElementById(_extIds.content);
var filters=document.getElementById(_extIds.filters);
var countBadge=document.getElementById(_extIds.count);

fetch("https://api.movix.site/api/search?title="+encodeURIComponent(_title))
.then(function(r){return r.json();})
.then(function(data){
var results=data;
if(data&&typeof data==="object"&&!Array.isArray(data)){
if(data.results)results=data.results;
else if(data.data)results=data.data;
}
if(!Array.isArray(results)||results.length===0){
loading.style.display="none";
content.innerHTML='<div class="em">Aucune source externe trouvée</div>';
countBadge.textContent="0";
return;
}
var first=results[0];
var movieId=first.id||first.movie_id||first.tmdb_id||_tmdbId;
var isSeries=first.is_series||first.type==="series"||_mediaType==="tv";
var dlUrl;
if(isSeries){
var s=_seasonNum||1;
var e=_episodeNum||1;
dlUrl="https://api.movix.site/api/darkiworld/download/tv/"+movieId+"?season="+s+"&episode="+e;
}else{
dlUrl="https://api.movix.site/api/darkiworld/download/movie/"+movieId;
}
fetch(dlUrl).then(function(r){return r.json();}).then(function(dlData){
loading.style.display="none";
var links=(dlData&&dlData.success&&dlData.all)?dlData.all:null;
if(!links||links.length===0){
content.innerHTML='<div class="em">Aucun lien externe disponible</div>';
countBadge.textContent="0";
return;
}
_allExtLinks=links;
countBadge.textContent=links.length;
_populateExtFilters(links);
filters.style.display="flex";
_renderExtLinks(links);
}).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur</div>';countBadge.textContent="0";});
}).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur</div>';countBadge.textContent="0";});
}

function _populateExtFilters(links){
var qualities=new Set(),languages=new Set(),providers=new Set();
links.forEach(function(l){if(l.quality)qualities.add(l.quality);if(l.language)languages.add(l.language);if(l.provider)providers.add(l.provider);});
var qf=document.getElementById("extQualityFilter"),lf=document.getElementById("extLanguageFilter"),pf=document.getElementById("extProviderFilter");
qualities.forEach(function(q){var o=document.createElement("option");o.value=q;o.textContent=q;qf.appendChild(o);});
languages.forEach(function(l){var o=document.createElement("option");o.value=l;o.textContent=l;lf.appendChild(o);});
providers.forEach(function(p){var o=document.createElement("option");o.value=p;o.textContent=p;pf.appendChild(o);});
qf.onchange=lf.onchange=pf.onchange=_applyExtFilters;
}

function _applyExtFilters(){
var qf=document.getElementById("extQualityFilter").value,lf=document.getElementById("extLanguageFilter").value,pf=document.getElementById("extProviderFilter").value;
var filtered=_allExtLinks.filter(function(l){
if(qf&&l.quality!==qf)return false;
if(lf&&l.language!==lf)return false;
if(pf&&l.provider!==pf)return false;
return true;
});
_renderExtLinks(filtered);
}

function _formatSize(bytes){if(!bytes)return"N/A";var gb=bytes/(1024*1024*1024);if(gb>=1)return gb.toFixed(2)+" GB";return(bytes/(1024*1024)).toFixed(0)+" MB";}

function _renderExtLinks(links){
var content=document.getElementById(_extIds.content);
if(links.length===0){content.innerHTML='<div class="em">Aucun résultat</div>';return;}
var html="";
links.forEach(function(l,idx){
html+='<div class="ext-card" data-idx="'+idx+'"><div class="ext-card-body">';
html+='<div class="ext-provider">'+(l.provider||"Inconnu")+'</div>';
html+='<span class="ext-quality">'+(l.quality||"N/A")+'</span>';
html+='<div class="ext-info">'+(l.language||"N/A")+'</div>';
if(l.host_name)html+='<div class="ext-host"><span>'+l.host_name+'</span></div>';
if(l.size)html+='<div class="ext-stats"><div class="ext-stat"><span class="ext-stat-label">Taille</span><span class="ext-stat-value">'+_formatSize(l.size)+'</span></div></div>';
html+='<button class="ext-btn">Voir le lien</button></div></div>';
});
content.innerHTML=html;
content.querySelectorAll(".ext-card").forEach(function(card){
card.querySelector(".ext-btn").onclick=function(e){
e.stopPropagation();
var idx=parseInt(card.getAttribute("data-idx"));
_showExtDetails(_allExtLinks[idx]);
};
});
}

// ** START OF UPDATES FOR FILM/SERIES CONTENT **
function _showExtDetails(link){
var details=document.getElementById(_extIds.details);
var body=document.getElementById(_extIds.detailsContent);

// Show loading first
body.innerHTML='<div style="text-align:center;padding:30px;color:#8ba3b5"><svg style="animation:spin 1s linear infinite;width:32px;height:32px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><p style="margin-top:12px">Chargement du lien...</p></div>';
details.classList.add("show");

// Decode the link via Movix API
fetch("https://api.movix.site/api/darkiworld/decode/"+link.id)
.then(function(r){return r.json();})
.then(function(data){
if(!data||!data.success||!data.embed_url){
body.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444"><p>Lien indisponible</p></div>';
return;
}
var embed=data.embed_url;
var finalUrl=embed.lien||"#";

details.classList.remove("show");

// ** CHANGE ** Track external link click with full info
fetch("/api/link-click",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
    linkType:"external",
    wwId:_wwId,
    tmdbId:_tmdbId,
    mediaType:_mediaType,
    seasonNumber:_seasonNum||null,
    episodeNumber:_episodeNum||null,
    isExternal:true,
    provider:link.provider||null,
    hostName:link.host_name||null,
    quality:link.quality||null,
    language:link.language||null,
    fileSize:link.size||null,
    externalLinkId:link.id||null
  })
});

if(_h&&_u){
  _sa(finalUrl);
}else{
  _displayLink(finalUrl);
}
})
.catch(function(err){
body.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444"><p>Erreur de décodage</p></div>';
});
}
// ** END OF UPDATES FOR FILM/SERIES CONTENT **

document.getElementById("extCloseBtn").onclick=function(){document.getElementById(_extIds.details).classList.remove("show");};

_renderLinks();
_loadExternal();
})();
</script>
</body>
</html>`

  return new NextResponse(movieHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "ALLOWALL",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
