import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: { wwId: string } }) {
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
.ext-host{display:flex;align-items:center;gap:6px;margin:8px 0}
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
var _title="${title.replace(/"/g, '\\"').replace(/\\/g, "\\\\")}";
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
if(bu){bu.classList.remove("hi");bu.disabled=false;bu.textContent="Continuer";bu.innerHTML='Continuer<span class="tag">PUB</span>';}
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
}).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";});
}).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur de recherche</div>';countBadge.textContent="0";});
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
html+='<div class="ext-card"><div class="ext-card-body">';
html+='<div class="ext-provider">'+(l.provider||"Inconnu")+'</div>';
html+='<span class="ext-quality">'+(l.quality||"N/A")+'</span>';
html+='<div class="ext-info">'+(l.language||"N/A")+'</div>';
if(l.host_name)html+='<div class="ext-host"><span>'+l.host_name+'</span></div>';
html+='<div class="ext-stats">';
html+='<div class="ext-stat"><div class="ext-stat-label">Taille</div><div class="ext-stat-value">'+_formatSize(l.file_size)+'</div></div>';
html+='<div class="ext-stat"><div class="ext-stat-label">Provider</div><div class="ext-stat-value">'+(l.provider||"Inconnu")+'</div></div>';
html+='</div>';
html+='<button class="ext-btn" data-linkid="'+l.id+'">Télécharger<span class="tag" style="margin-left:6px">PUB</span></button>';
html+='</div></div>';
});
content.innerHTML=html;
var btns=content.querySelectorAll(".ext-btn");
for(var i=0;i<btns.length;i++){
(function(btn){
btn.onclick=function(){
var linkId=btn.getAttribute("data-linkid");
_unlockExternal(linkId);
};
})(btns[i]);
}
}

function _unlockExternal(linkId){
fetch("https://api.movix.site/api/darkiworld/decode/"+linkId)
.then(function(r){return r.json();})
.then(function(decoded){
var finalUrl=(decoded&&decoded.embed_url&&decoded.embed_url.lien)?decoded.embed_url.lien:null;
if(!finalUrl){alert("Impossible de décoder le lien");return;}
if(_h&&_u){_showAdModal(finalUrl);}
else{window.open(finalUrl,"_blank");}
}).catch(function(){alert("Erreur lors du décodage");});
}

document.getElementById("extCloseBtn").onclick=function(){
document.getElementById(_extIds.details).classList.remove("show");
};

_bindButtons();
_loadExternal();
})();
</script>
</body>
</html>`

    return new Response(digitalHtml, {
      headers: { "Content-Type": "text/html" },
    })
  }

  // ============================================
  // FILM / SERIE DOWNLOAD
  // ============================================
  const isMovie = wwId.startsWith("ww-movie-")
  const isSeries = wwId.startsWith("ww-series-")

  if (!isMovie && !isSeries) {
    return NextResponse.json({ error: "Content type not supported" }, { status: 400 })
  }

  const contentType = isMovie ? "movie" : "series"
  const { data: content } = await supabase
    .from(isMovie ? "movies" : "series")
    .select("*")
    .eq("ww_id", wwId)
    .single()

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 })
  }

  const { data: downloadLinks } = await supabase
    .from("download_links")
    .select("*")
    .eq("ww_id", wwId)
    .eq("is_active", true)
    .eq("status", "approved")
    .order("quality", { ascending: false })

  const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
  const hasAds = ads && ads.length > 0
  const adUrl = hasAds ? ads[0].ad_url : ""
  const adId = hasAds ? ads[0].id : ""

  const title = content.title || content.name || "Sans titre"
  const poster = content.poster_path ? `https://image.tmdb.org/t/p/w200${content.poster_path}` : ""
  const tmdbId = content.tmdb_id
  const internalLinks = downloadLinks || []

  await supabase.from("embed_views").insert({
    ww_id: wwId,
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
    extContainer: generateRandomId("ec"),
    extLoading: generateRandomId("el"),
    extContent: generateRandomId("ex"),
    extCount: generateRandomId("en"),
    extFilters: generateRandomId("ef"),
    extDetails: generateRandomId("ed"),
    extDetailsContent: generateRandomId("edc"),
  }

  // Escape links JSON safely
  const linksJsonSafe = JSON.stringify(internalLinks)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")

  const movieHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - Téléchargements WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;padding:12px}
.hd{display:flex;gap:12px;margin-bottom:16px;align-items:center}
.ps{width:60px;height:90px;object-fit:cover;border-radius:6px;flex-shrink:0}
.tt{font-size:16px;font-weight:600;line-height:1.3}
.tg{font-size:12px;color:#14B8A6;text-transform:capitalize}
.sc{margin-bottom:16px}
.sc-title{font-size:13px;font-weight:600;color:#14B8A6;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.sc-title svg{width:16px;height:16px}
.lk{background:#162230;border-radius:8px;overflow:hidden;border:1px solid #1e3a4f}
.li{display:flex;flex-direction:column;gap:8px;padding:12px;border-bottom:1px solid #1e3a4f}
.li:last-child{border-bottom:none}
.li-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.li-name{font-weight:500;font-size:14px;flex:1}
.li-meta{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.li-tag{padding:2px 6px;border-radius:4px;font-size:10px}
.tag-quality{background:rgba(20,184,166,0.2);color:#14B8A6;border:1px solid rgba(20,184,166,0.3)}
.tag-resolution{background:rgba(139,92,246,0.2);color:#a78bfa;border:1px solid rgba(139,92,246,0.3)}
.tag-lang{background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid rgba(59,130,246,0.3)}
.tag-video{background:rgba(236,72,153,0.2);color:#f472b6;border:1px solid rgba(236,72,153,0.3)}
.tag-audio{background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)}
.tag-size{background:rgba(34,197,94,0.2);color:#4ade80;border:1px solid rgba(34,197,94,0.3)}
.tag-source{background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.3)}
.db{padding:8px 16px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;white-space:nowrap;transition:background 0.2s}
.db:hover{background:#0d9488}
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
.ext-info{display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:12px;color:#8ba3b5}
.ext-host{display:flex;align-items:center;gap:6px;margin:8px 0}
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
.li-top{flex-direction:row}
.db{width:auto}
}
</style>
</head>
<body>
<div class="hd">
${poster ? `<img src="${poster}" alt="${title}" class="ps">` : ""}
<div>
<div class="tt">${title}</div>
<div class="tg">${contentType === "movie" ? "Film" : "Série"}</div>
</div>
</div>

<div class="sc">
<div class="sc-title">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
Liens internes
</div>
<div class="lk" id="${ids.linksContainer}"></div>
</div>

<div class="sec-title">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
Sources externes
<span class="badge" id="${ids.extCount}">...</span>
</div>

<div id="${ids.extContainer}">
<div class="ext-loading" id="${ids.extLoading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources externes...
</div>
<div id="${ids.extFilters}" class="ext-filters" style="display:none">
<select id="extQualityFilter" class="ext-select"><option value="">Qualité</option></select>
<select id="extLanguageFilter" class="ext-select"><option value="">Langue</option></select>
<select id="extProviderFilter" class="ext-select"><option value="">Provider</option></select>
</div>
<div id="${ids.extContent}" class="ext-grid"></div>
</div>

<div id="${ids.extDetails}" class="ext-details">
<div class="ext-details-inner">
<div class="ext-details-header">
<h3>Détails du lien</h3>
<button class="ext-close" id="extCloseBtn">&times;</button>
</div>
<div class="ext-details-body" id="${ids.extDetailsContent}"></div>
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
try{
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};
var _links=${linksJsonSafe};
var _tmdbId=${tmdbId || "null"};
var _contentType="${contentType}";
var _wwId="${wwId}";
var _allExtLinks=[];

function _renderLinks(){
var container=document.getElementById(_ids.linksContainer);
if(!_links||_links.length===0){
container.innerHTML='<div class="em">Aucun lien interne disponible</div>';
return;
}
var html="";
_links.forEach(function(l,idx){
html+='<div class="li">';
html+='<div class="li-top">';
html+='<span class="li-name">'+(l.source_name||"Lien "+(idx+1))+'</span>';
html+='<button class="db" data-idx="'+idx+'">Télécharger'+((_h&&_u)?'<span class="tag">PUB</span>':'')+'</button>';
html+='</div>';
html+='<div class="li-meta">';
if(l.quality)html+='<span class="li-tag tag-quality">'+l.quality+'</span>';
if(l.resolution)html+='<span class="li-tag tag-resolution">'+l.resolution+'</span>';
if(l.language)html+='<span class="li-tag tag-lang">'+l.language+'</span>';
if(l.video_codec)html+='<span class="li-tag tag-video">'+l.video_codec+'</span>';
if(l.audio_codec)html+='<span class="li-tag tag-audio">'+l.audio_codec+'</span>';
if(l.file_size)html+='<span class="li-tag tag-size">'+l.file_size+'</span>';
if(l.source_type)html+='<span class="li-tag tag-source">'+l.source_type+'</span>';
html+='</div>';
html+='</div>';
});
container.innerHTML=html;

var btns=container.querySelectorAll(".db");
for(var i=0;i<btns.length;i++){
(function(btn){
btn.onclick=function(){
var idx=parseInt(btn.getAttribute("data-idx"));
var link=_links[idx];
var url=link.download_url||link.source_url;
if(!url){alert("Lien non disponible");return;}
if(_h&&_u){_showAdModal(url);}
else{
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:_contentType,wwId:_wwId})});
window.open(url,"_blank");
}
};
})(btns[i]);
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
if(bu){bu.classList.remove("hi");bu.innerHTML='Continuer<span class="tag">PUB</span>';}
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
fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:_contentType,wwId:_wwId})});
window.open(_p,"_blank");_p=null;
}
};
}

function _loadExternal(){
var loading=document.getElementById(_ids.extLoading);
var content=document.getElementById(_ids.extContent);
var filters=document.getElementById(_ids.extFilters);
var countBadge=document.getElementById(_ids.extCount);
if(!_tmdbId){
loading.style.display="none";
content.innerHTML='<div class="em">ID TMDB manquant</div>';
countBadge.textContent="0";
return;
}
var endpoint=_contentType==="movie"?"movie":"serie";
fetch("https://api.movix.site/api/darkiworld/download/"+endpoint+"/"+_tmdbId)
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
}).catch(function(e){
loading.style.display="none";
content.innerHTML='<div class="em">Erreur de chargement</div>';
countBadge.textContent="0";
});
}

function _populateFilters(links){
var qualities=new Set(),languages=new Set(),providers=new Set();
links.forEach(function(l){if(l.quality)qualities.add(l.quality);if(l.language)languages.add(l.language);if(l.provider)providers.add(l.provider);});
var qf=document.getElementById("extQualityFilter"),lf=document.getElementById("extLanguageFilter"),pf=document.getElementById("extProviderFilter");
if(qf)qualities.forEach(function(q){var o=document.createElement("option");o.value=q;o.textContent=q;qf.appendChild(o);});
if(lf)languages.forEach(function(l){var o=document.createElement("option");o.value=l;o.textContent=l;lf.appendChild(o);});
if(pf)providers.forEach(function(p){var o=document.createElement("option");o.value=p;o.textContent=p;pf.appendChild(o);});
if(qf)qf.onchange=_applyFilters;
if(lf)lf.onchange=_applyFilters;
if(pf)pf.onchange=_applyFilters;
}

function _applyFilters(){
var qf=document.getElementById("extQualityFilter"),lf=document.getElementById("extLanguageFilter"),pf=document.getElementById("extProviderFilter");
var qv=qf?qf.value:"",lv=lf?lf.value:"",pv=pf?pf.value:"";
var filtered=_allExtLinks.filter(function(l){
if(qv&&l.quality!==qv)return false;
if(lv&&l.language!==lv)return false;
if(pv&&l.provider!==pv)return false;
return true;
});
_renderExtLinks(filtered);
}

function _formatSize(bytes){if(!bytes)return"N/A";var gb=bytes/(1024*1024*1024);if(gb>=1)return gb.toFixed(2)+" GB";var mb=bytes/(1024*1024);return mb.toFixed(0)+" MB";}

function _renderExtLinks(links){
var content=document.getElementById(_ids.extContent);
if(!links||links.length===0){content.innerHTML='<div class="em">Aucun résultat</div>';return;}
var html="";
links.forEach(function(l){
html+='<div class="ext-card"><div class="ext-card-body">';
html+='<div class="ext-provider">'+(l.provider||"Inconnu")+'</div>';
html+='<span class="ext-quality">'+(l.quality||"N/A")+'</span>';
html+='<div class="ext-info">'+(l.language||"N/A")+'</div>';
if(l.host_name)html+='<div class="ext-host"><span>'+l.host_name+'</span></div>';
html+='<div class="ext-stats">';
html+='<div class="ext-stat"><div class="ext-stat-label">Taille</div><div class="ext-stat-value">'+_formatSize(l.file_size)+'</div></div>';
html+='<div class="ext-stat"><div class="ext-stat-label">Provider</div><div class="ext-stat-value">'+(l.provider||"Inconnu")+'</div></div>';
html+='</div>';
html+='<button class="ext-btn" data-linkid="'+l.id+'">Télécharger'+(_h&&_u?'<span class="tag" style="margin-left:6px">PUB</span>':'')+'</button>';
html+='</div></div>';
});
content.innerHTML=html;
var btns=content.querySelectorAll(".ext-btn");
for(var i=0;i<btns.length;i++){
(function(btn){
btn.onclick=function(){
var linkId=btn.getAttribute("data-linkid");
_unlockExternal(linkId);
};
})(btns[i]);
}
}

function _unlockExternal(linkId){
fetch("https://api.movix.site/api/darkiworld/decode/"+linkId)
.then(function(r){return r.json();})
.then(function(decoded){
var finalUrl=(decoded&&decoded.embed_url&&decoded.embed_url.lien)?decoded.embed_url.lien:null;
if(!finalUrl){alert("Impossible de décoder le lien");return;}
if(_h&&_u){_showAdModal(finalUrl);}
else{window.open(finalUrl,"_blank");}
}).catch(function(){alert("Erreur lors du décodage");});
}

var closeBtn=document.getElementById("extCloseBtn");
if(closeBtn){
closeBtn.onclick=function(){
document.getElementById(_ids.extDetails).classList.remove("show");
};
}

_renderLinks();
_loadExternal();
}catch(e){
document.body.innerHTML='<div style="color:red;padding:20px;">Erreur: '+e.message+'</div>';
}
})();
</script>
</body>
</html>`

  return new Response(movieHtml, {
    headers: { "Content-Type": "text/html" },
  })
}
