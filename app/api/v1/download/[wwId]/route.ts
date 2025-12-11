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
    wwId.startsWith("ww-game-")

  // ============================================
  // DIGITAL CONTENT DOWNLOAD
  // ============================================
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
    }

    const digitalHtml = `<!DOCTYPE html>
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
.db:hover{background:#0d9488}
.db:active{transform:scale(0.98)}
.em{color:#5a7a8a;padding:20px;text-align:center;font-size:14px}
.ft{text-align:center;color:#5a7a8a;font-size:11px;margin-top:16px}
.ft a{color:#14B8A6}
.sec-title{font-size:14px;font-weight:600;color:#14B8A6;margin:20px 0 12px;display:flex;align-items:center;gap:8px}
.sec-title svg{width:18px;height:18px}
.badge{background:#14B8A6;color:#0c1520;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
.ext-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#5a7a8a;font-size:13px}
.ext-loading svg{width:20px;height:20px;animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ext-filters{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.ext-select{background:#162230;border:1px solid #1e3a4f;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer}
.ext-grid{display:grid;gap:10px}
.ext-card{background:#162230;border:1px solid #1e3a4f;border-radius:8px;overflow:hidden;transition:border-color 0.2s}
.ext-card:hover{border-color:#14B8A6}
.ext-card-body{padding:12px}
.ext-provider{font-size:11px;color:#14B8A6;margin-bottom:4px}
.ext-quality{display:inline-block;background:#14B8A6;color:#0c1520;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;margin-bottom:8px}
.ext-info{display:flex;align-items:center;gap:4px;margin-bottom:4px}
.ext-info svg{width:14px;height:14px}
.ext-host{display:flex;align-items:center;gap:6px;margin:8px 0}
.ext-host img{width:16px;height:16px;border-radius:2px}
.ext-host span{font-size:12px;color:#fff}
.ext-stats{display:flex;gap:12px;margin:8px 0}
.ext-stat{display:flex;flex-direction:column}
.ext-stat-label{font-size:10px;color:#5a7a8a}
.ext-stat-value{font-size:12px;color:#fff}
.ext-btn{width:100%;padding:10px;background:transparent;border:1px solid #14B8A6;color:#14B8A6;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.2s}
.ext-btn:hover{background:#14B8A6;color:#0c1520}
.ext-details{position:fixed;inset:0;background:rgba(0,0,0,0.8);display:none;align-items:center;justify-content:center;z-index:1000;padding:12px;backdrop-filter:blur(8px)}
.ext-details.show{display:flex}
.ext-details-inner{background:#0c1520;border:1px solid #1e3a4f;border-radius:12px;max-width:400px;width:100%;max-height:80vh;overflow:auto}
.ext-details-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #1e3a4f}
.ext-details-header h3{font-size:14px;color:#fff}
.ext-close{background:none;border:none;color:#5a7a8a;font-size:24px;cursor:pointer;line-height:1}
.ext-details-body{padding:16px}
.ext-detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e3a4f}
.ext-detail-row:last-child{border-bottom:none}
.ext-detail-label{color:#5a7a8a;font-size:12px}
.ext-detail-value{color:#fff;font-size:12px;text-align:right}
.ext-unlock-btn{width:100%;padding:12px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;margin-top:16px}
.ext-link-result{margin-top:12px;padding:12px;background:#162230;border-radius:6px;word-break:break-all}
.ext-link-result a{color:#14B8A6;font-size:12px}
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
.bx-content b{display:block;font-size:clamp(12px,3.5vw,14px);margin-bottom:2px}
.bx-content span{font-size:clamp(10px,2.8vw,12px);opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:clamp(12px,3.5vw,14px);font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:clamp(9px,2.5vw,11px);color:#9ca3af}
.cf a{color:#667eea}
.tag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:600}
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

<div class="sc">
<div class="sc-title">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
Téléchargements
</div>
<div class="lk">
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
${l.language ? `<span class="bg">${l.language}</span>` : ""}
</div>
<button class="db" data-url="${encodeURIComponent(l.source_url || "")}">Télécharger</button>
</div>
`,
        )
        .join("")
}
</div>
</div>

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
var _extIds=${JSON.stringify(externalIds)};
var _title="${title.replace(/"/g, '\\"')}";
var _wwId="${digitalContent.ww_id}";
var _allExtLinks=[];

function _bindButtons(){
var buttons=document.querySelectorAll(".db");
for(var i=0;i<buttons.length;i++){
(function(btn){
btn.onclick=function(e){
e.preventDefault();
var url=btn.getAttribute("data-url");
if(!url||url===""||url==="undefined"){alert("Lien non disponible");return;}
if(_h&&_u){_showAdModal(decodeURIComponent(url));}
else{
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"digital",wwId:_wwId})});
window.open(decodeURIComponent(url),"_blank");
}
};
})(buttons[i]);
}
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
if(s2)s2.classList.add("active");
var sec=3,prog=0;
var iv=setInterval(function(){
sec--;prog+=33.33;
if(tm)tm.textContent=sec;
if(pr)pr.style.width=prog+"%";
if(sec<=0){
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
if(_p){
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"digital",wwId:_wwId})});
window.open(_p,"_blank");_p=null;
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

function _showExtDetails(link){
var details=document.getElementById(_extIds.details);
var body=document.getElementById(_extIds.detailsContent);
var html='<div class="ext-detail-row"><span class="ext-detail-label">Provider</span><span class="ext-detail-value">'+(link.provider||"N/A")+'</span></div>';
html+='<div class="ext-detail-row"><span class="ext-detail-label">Qualité</span><span class="ext-detail-value">'+(link.quality||"N/A")+'</span></div>';
html+='<div class="ext-detail-row"><span class="ext-detail-label">Langue</span><span class="ext-detail-value">'+(link.language||"N/A")+'</span></div>';
html+='<div class="ext-detail-row"><span class="ext-detail-label">Taille</span><span class="ext-detail-value">'+_formatSize(link.size)+'</span></div>';
html+='<button class="ext-unlock-btn" id="extUnlockBtn">Débloquer le lien</button>';
html+='<div class="ext-link-result" id="extLinkResult" style="display:none"></div>';
body.innerHTML=html;
details.classList.add("show");

document.getElementById("extUnlockBtn").onclick=function(){
var btn=this;btn.textContent="Ouverture...";btn.style.opacity="0.7";
if(_h&&_u){
window.open(_u,"_blank");
fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_i})});
}
setTimeout(function(){
var result=document.getElementById("extLinkResult");
result.style.display="block";
var linkUrl=link.url||link.link||link.download_url||"#";
result.innerHTML='<a href="'+linkUrl+'" target="_blank" onclick="fetch(\\'/api/link-click\\',{method:\\'POST\\',headers:{\\'Content-Type\\':\\'application/json\\'},body:JSON.stringify({linkType:\\'external\\',wwId:\\'${digitalContent.ww_id}\\'})})">Accéder au lien</a>';
btn.textContent="Lien débloqué !";
btn.style.background="#10b981";
},500);
};
}

document.getElementById("extCloseBtn").onclick=function(){document.getElementById(_extIds.details).classList.remove("show");};

_bindButtons();
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
.li{background:rgba(22,34,48,0.8);border-radius:12px;border:1px solid rgba(30,58,79,0.6);margin-bottom:12px;overflow:hidden}
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
.li-btn:hover{transform:translateY(-1px)}
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
.ext-details{margin-top:16px;background:rgba(22,34,48,0.9);border-radius:12px;border:1px solid rgba(102,126,234,0.4);overflow:hidden;display:none}
.ext-details.show{display:block}
.ext-details-header{display:flex;justify-content:space-between;align-items:center;padding:16px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.ext-details-header h3{font-size:16px;font-weight:700}
.ext-close{background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:18px}
.ext-details-body{padding:20px}
.ext-unlock-btn{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;width:100%;margin-top:16px}
.ext-link-result{margin-top:12px;padding:12px;background:rgba(30,58,79,0.3);border-radius:6px}
.ext-link-result a{color:#14B8A6;font-size:12px}
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
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}
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
var ep="";
if(_isSeries){
if(l.is_full_season){ep='<span class="li-ep">Saison '+l.season_number+' Complete</span>';}
else if(l.episode_number){ep='<span class="li-ep">S'+l.season_number+'E'+l.episode_number+'</span>';}
}
var up=(l.profiles&&l.profiles.username)?'<a href="/profile/'+encodeURIComponent(l.profiles.username)+'" target="_blank" class="li-up">par '+l.profiles.username+'</a>':"";
var release=l.release_name||l.source_name||"Téléchargement";
var url=l.source_url||l.download_url||"";
if(url&&!url.startsWith("http")){url="https://"+url;}

var meta='<div class="li-meta">';
if(l.quality)meta+='<span class="li-tag quality">'+l.quality+'</span>';
if(l.resolution)meta+='<span class="li-tag">'+l.resolution+'</span>';
if(l.file_size)meta+='<span class="li-tag">'+l.file_size+'</span>';
if(l.language)meta+='<span class="li-tag">'+l.language+'</span>';
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
if(s2)s2.classList.add("active");
var s=3,pg=0;
var iv=setInterval(function(){
s--;pg+=33.33;
if(tm)tm.textContent=s;
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
if(_p){
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"download",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType})});
window.open(_p,"_blank");_p=null;
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

function _showExtDetails(link){
var details=document.getElementById(_extIds.details);
var body=document.getElementById(_extIds.detailsContent);
var html='<div style="margin-bottom:16px"><strong>Provider:</strong> '+(link.provider||"N/A")+'</div>';
html+='<div style="margin-bottom:16px"><strong>Qualité:</strong> '+(link.quality||"N/A")+'</div>';
html+='<div style="margin-bottom:16px"><strong>Langue:</strong> '+(link.language||"N/A")+'</div>';
html+='<div style="margin-bottom:16px"><strong>Taille:</strong> '+_formatSize(link.size)+'</div>';
html+='<button class="ext-unlock-btn" id="extUnlockBtn">Débloquer le lien</button>';
html+='<div class="ext-link-result" id="extLinkResult" style="display:none"></div>';
body.innerHTML=html;
details.classList.add("show");

document.getElementById("extUnlockBtn").onclick=function(){
var btn=this;btn.textContent="Ouverture...";btn.style.opacity="0.7";
if(_h&&_u){
window.open(_u,"_blank");
fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_i})});
}
setTimeout(function(){
var result=document.getElementById("extLinkResult");
result.style.display="block";
var linkUrl=link.url||link.link||link.download_url||"#";
result.innerHTML='<a href="'+linkUrl+'" target="_blank">Accéder au lien</a>';
btn.textContent="Lien débloqué !";
btn.style.background="#10b981";
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"external",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType})});
},500);
};
}

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
