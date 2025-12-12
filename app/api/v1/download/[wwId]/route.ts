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
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
<div class="bx-content"><b>Cliquez sur le bouton ci-dessous</b><span>Une pub s'ouvrira dans un nouvel onglet</span></div>
</div>
<div class="bx bi" id="${ids.boxTime}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
<div class="bx-content"><b>Temps restant: <span id="${ids.timer}">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div>
</div>
<div class="bx bo hi" id="${ids.boxThanks}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
<div class="bx-content"><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div>
</div>
<div class="bx bo hi" id="${ids.boxDone}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  }

  // ============================================
  // FILM / SERIE DOWNLOAD
  // ============================================
  const isMovie = wwId.startsWith("ww-movie-")
  const isSeries = wwId.startsWith("ww-series-")

  if (!isMovie && !isSeries) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
  }

  const table = isMovie ? "movies" : "series"
  const { data: content, error: contentError } = await supabase.from(table).select("*").eq("ww_id", wwId).single()

  if (contentError || !content) {
    console.error("[v0] Content not found:", contentError)
    return NextResponse.json({ error: "Content not found" }, { status: 404 })
  }

  const { data: downloadLinks, error: linksError } = await supabase
    .from("download_links")
    .select("*")
    .eq("ww_id", wwId)
    .eq("is_active", true)
    .eq("status", "approved")
    .order("quality", { ascending: false })

  if (linksError) {
    console.error("[v0] Error fetching download links:", linksError)
  }

  const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
  const hasAds = ads && ads.length > 0
  const adUrl = hasAds ? ads[0].ad_url : ""
  const adId = hasAds ? ads[0].id : ""

  const title = content.title
  const cover = content.poster_url || ""
  const contentType = isMovie ? "Film" : "Série"
  const internalLinks = downloadLinks?.filter((l) => l.source_url) || []

  await supabase.from("embed_views").insert({
    ww_id: wwId,
    embed_type: "download",
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  const linksJsonData = internalLinks.map((link) => ({
    id: link.id,
    url: link.source_url,
    quality: link.quality,
    resolution: link.resolution,
    language: link.language,
    video_codec: link.video_codec,
    audio_codec: link.audio_codec,
    file_size: link.file_size,
    source_type: link.source_type,
  }))
  const linksJsonBase64 = Buffer.from(JSON.stringify(linksJsonData)).toString("base64")
  const titleEscaped = title.replace(/'/g, "\\'")

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

  const externalIds = {
    container: generateRandomId("ext"),
    loading: generateRandomId("extl"),
    content: generateRandomId("extc"),
    details: generateRandomId("extd"),
    detailsContent: generateRandomId("extdc"),
  }

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
.ps{width:60px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0}
.tt{font-size:16px;font-weight:600;line-height:1.3}
.tg{font-size:12px;color:#14B8A6;text-transform:capitalize}
.sc{margin-bottom:16px}
.sc-title{font-size:13px;font-weight:600;color:#14B8A6;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.lk{background:#162230;border-radius:8px;overflow:hidden;border:1px solid #1e3a4f}
.li{display:flex;flex-direction:column;gap:8px;padding:12px;border-bottom:1px solid #1e3a4f}
.li:last-child{border-bottom:none}
.ln{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.nm{font-weight:500;font-size:14px}
.li-meta{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.li-tag{padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600}
.tag-quality{background:rgba(20,184,166,0.2);color:#14B8A6;border:1px solid rgba(20,184,166,0.3)}
.tag-resolution{background:rgba(168,85,247,0.2);color:#a855f7;border:1px solid rgba(168,85,247,0.3)}
.tag-language{background:rgba(59,130,246,0.2);color:#3b82f6;border:1px solid rgba(59,130,246,0.3)}
.tag-video{background:rgba(236,72,153,0.2);color:#ec4899;border:1px solid rgba(236,72,153,0.3)}
.tag-audio{background:rgba(251,146,60,0.2);color:#fb923c;border:1px solid rgba(251,146,60,0.3)}
.tag-size{background:rgba(34,197,94,0.2);color:#22c55e;border:1px solid rgba(34,197,94,0.3)}
.tag-source{background:rgba(239,68,68,0.2);color:#ef4444;border:1px solid rgba(239,68,68,0.3)}
.db{padding:10px 16px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;width:100%;transition:background 0.2s}
.db:hover{background:#0d9488}
.db:active{transform:scale(0.98)}
.em{color:#5a7a8a;padding:20px;text-align:center;font-size:14px}
.ft{text-align:center;color:#5a7a8a;font-size:11px;margin-top:16px}
.ft a{color:#14B8A6}
.sec-title{font-size:14px;font-weight:600;color:#14B8A6;margin:20px 0 12px;display:flex;align-items:center;gap:8px}
.badge{background:#14B8A6;color:#0c1520;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
.ext-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#5a7a8a;font-size:13px}
.ext-loading svg{width:20px;height:20px;animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ext-grid{display:grid;gap:10px}
.ext-card{background:#162230;border:1px solid #1e3a4f;border-radius:8px;overflow:hidden;transition:border-color 0.2s}
.ext-card:hover{border-color:#14B8A6}
.ext-card-body{padding:12px}
.ext-provider{font-size:11px;color:#14B8A6;margin-bottom:4px}
.ext-quality{display:inline-block;background:#14B8A6;color:#0c1520;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;margin-bottom:8px}
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
.bg{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.bp{background:linear-gradient(135deg,#ddd6fe,#c4b5fd);border:1px solid #8b5cf6;color:#5b21b6}
.btn-primary{padding:12px 24px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:clamp(12px,3.5vw,14px);width:100%;transition:all 0.3s;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 15px -3px rgba(0,0,0,0.2)}
.btn-primary:active{transform:translateY(0)}
.timer-display{font-size:clamp(32px,10vw,48px);font-weight:700;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:16px 0}
.progress-ring{transform:rotate(-90deg)}
.progress-ring-circle{transition:stroke-dashoffset 0.3s;transform-origin:center}
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

<h2 class="sec-title">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
Sources externes
<span class="badge">PUB</span>
</h2>
<div id="${externalIds.container}">
<div id="${externalIds.loading}" class="ext-loading">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
<span>Recherche de sources externes...</span>
</div>
<div id="${externalIds.content}" class="ext-grid" style="display:none"></div>
</div>

<div id="${externalIds.details}" class="ext-details">
<div class="ext-details-inner">
<div class="ext-details-header">
<h3>Détails du lien</h3>
<button id="extCloseBtn" class="ext-close">&times;</button>
</div>
<div id="${externalIds.detailsContent}" class="ext-details-body"></div>
</div>
</div>

<div id="${ids.overlay}" class="mo">
<div class="mc">
<h2>🎬 Déblocage en cours...</h2>
<p class="mc-sub">Suivez ces étapes pour accéder à votre téléchargement</p>
<div class="steps">
<div id="${ids.step1}" class="step active"></div>
<div id="${ids.step2}" class="step"></div>
<div id="${ids.step3}" class="step"></div>
</div>
<div id="${ids.boxTime}" class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
<div class="bx-content"><b>Attendez le compte à rebours</b><span>Le bouton se débloquera automatiquement</span></div>
</div>
<div id="${ids.boxHelp}" class="bx bg" style="display:none">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
<div class="bx-content"><b>Cliquez sur le bouton ci-dessous</b><span>Une pub s'ouvrira dans un nouvel onglet</span></div>
</div>
<div id="${ids.boxThanks}" class="bx bp" style="display:none">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
<div class="bx-content"><b>Merci pour votre soutien!</b><span>Retournez sur cette page pour continuer</span></div>
</div>
<svg width="120" height="120" style="margin:16px auto;display:block">
<circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" stroke-width="8"/>
<circle id="${ids.progress}" class="progress-ring-circle" cx="60" cy="60" r="54" fill="none" stroke="url(#gradient)" stroke-width="8" stroke-dasharray="339.292" stroke-dashoffset="339.292" stroke-linecap="round"/>
<defs><linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea"/><stop offset="100%" style="stop-color:#764ba2"/></linearGradient></defs>
</svg>
<div id="${ids.timer}" class="timer-display">10</div>
<button id="${ids.btnUnlock}" class="btn-primary" disabled style="opacity:0.5;cursor:not-allowed">Débloquer maintenant</button>
<div id="${ids.boxDone}" style="display:none;margin-top:16px">
<button id="${ids.btnDownload}" class="btn-primary">Télécharger maintenant</button>
</div>
</div>
</div>

<div class="ft">Propulsé par <a href="https://wavewatch.xyz">wavewatch.xyz</a></div>

<script>
(function(){
try{
var _h=${hasAds ? "true" : "false"};
var _u="${adUrl}";
var _ai="${adId}";
var _t="${titleEscaped}";
var _w="${wwId}";
var _ids=${JSON.stringify(ids)};
var _extIds=${JSON.stringify(externalIds)};
var _lks=JSON.parse(atob("${linksJsonBase64}"));

function _renderLinks(){
var container=document.getElementById(_ids.linksContainer);
if(!_lks||_lks.length===0){
container.innerHTML='<div class="em">Aucun lien de téléchargement disponible pour le moment</div>';
return;
}
var html='<div class="sc"><h2 class="sc-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Téléchargements directs <span class="badge">PUB</span></h2><div class="lk">';
for(var i=0;i<_lks.length;i++){
var link=_lks[i];
var name="Téléchargement "+(i+1);
html+='<div class="li"><div class="ln"><span class="nm">'+name+'</span></div>';
html+='<div class="li-meta">';
if(link.quality)html+='<span class="li-tag tag-quality">'+link.quality+'</span>';
if(link.resolution)html+='<span class="li-tag tag-resolution">'+link.resolution+'</span>';
if(link.language)html+='<span class="li-tag tag-language">'+link.language+'</span>';
if(link.video_codec)html+='<span class="li-tag tag-video">'+link.video_codec+'</span>';
if(link.audio_codec)html+='<span class="li-tag tag-audio">'+link.audio_codec+'</span>';
if(link.file_size)html+='<span class="li-tag tag-size">'+link.file_size+'</span>';
if(link.source_type)html+='<span class="li-tag tag-source">'+link.source_type+'</span>';
html+='</div>';
html+='<button class="db" data-url="'+link.url+'">Télécharger</button></div>';
}
html+='</div></div>';
container.innerHTML=html;
var btns=container.querySelectorAll(".db");
for(var j=0;j<btns.length;j++){
(function(btn){
btn.onclick=function(){
var url=btn.getAttribute("data-url");
if(_h&&_u){_showAdModal(url);}
else{window.open(url,"_blank");}
};
})(btns[j]);
}
}

function _showAdModal(finalUrl){
var overlay=document.getElementById(_ids.overlay);
overlay.classList.add("sh");
var timeLeft=10;
var progressCircle=document.getElementById(_ids.progress);
var timerEl=document.getElementById(_ids.timer);
var unlockBtn=document.getElementById(_ids.btnUnlock);
var downloadBtn=document.getElementById(_ids.btnDownload);
var boxTime=document.getElementById(_ids.boxTime);
var boxHelp=document.getElementById(_ids.boxHelp);
var boxThanks=document.getElementById(_ids.boxThanks);
var boxDone=document.getElementById(_ids.boxDone);
var step1=document.getElementById(_ids.step1);
var step2=document.getElementById(_ids.step2);
var step3=document.getElementById(_ids.step3);
var circumference=339.292;
var interval=setInterval(function(){
timeLeft--;
timerEl.textContent=timeLeft;
var offset=circumference-(timeLeft/10)*circumference;
progressCircle.style.strokeDashoffset=offset;
if(timeLeft===0){
clearInterval(interval);
unlockBtn.disabled=false;
unlockBtn.style.opacity="1";
unlockBtn.style.cursor="pointer";
boxTime.style.display="none";
boxHelp.style.display="flex";
step1.classList.remove("active");
step1.classList.add("done");
step2.classList.add("active");
}
},1000);
unlockBtn.onclick=function(){
if(unlockBtn.disabled)return;
window.open(_u,"_blank");
if(_ai){
fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_ai})}).catch(function(){});
}
boxHelp.style.display="none";
boxThanks.style.display="flex";
step2.classList.remove("active");
step2.classList.add("done");
step3.classList.add("active");
setTimeout(function(){
boxThanks.style.display="none";
boxDone.style.display="block";
step3.classList.remove("active");
step3.classList.add("done");
},2000);
};
downloadBtn.onclick=function(){
window.open(finalUrl,"_blank");
overlay.classList.remove("sh");
};
}

function _loadExternal(){
fetch("https://api.movix.site/api/darkiworld/providers?id="+encodeURIComponent(_w))
.then(function(r){return r.json();})
.then(function(data){
var loading=document.getElementById(_extIds.loading);
var content=document.getElementById(_extIds.content);
loading.style.display="none";
if(!data||!data.providers||data.providers.length===0){
content.innerHTML='<div class="em">Aucune source externe disponible</div>';
content.style.display="block";
return;
}
var html="";
for(var i=0;i<data.providers.length;i++){
var p=data.providers[i];
html+='<div class="ext-card"><div class="ext-card-body">';
html+='<div class="ext-provider">'+p.provider+'</div>';
if(p.quality)html+='<span class="ext-quality">'+p.quality+'</span>';
html+='<button class="ext-btn" data-linkid="'+p.id+'">Voir le lien</button>';
html+='</div></div>';
}
content.innerHTML=html;
content.style.display="grid";
_bindExtButtons();
}).catch(function(){
var loading=document.getElementById(_extIds.loading);
var content=document.getElementById(_extIds.content);
loading.style.display="none";
content.innerHTML='<div class="em">Erreur lors du chargement des sources externes</div>';
content.style.display="block";
});
}

function _bindExtButtons(){
var btns=document.querySelectorAll("[data-linkid]");
for(var i=0;i<btns.length;i++){
(function(btn){
btn.onclick=function(){
var linkId=btn.getAttribute("data-linkid");
_showExtDetails(linkId);
};
})(btns[i]);
}
}

function _showExtDetails(linkId){
var details=document.getElementById(_extIds.details);
var detailsBody=document.getElementById(_extIds.detailsContent);
details.classList.add("show");
detailsBody.innerHTML='<div class="ext-loading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg><span>Chargement...</span></div>';
fetch("https://api.movix.site/api/darkiworld/decode/"+linkId)
.then(function(r){return r.json();})
.then(function(decoded){
var finalUrl=(decoded&&decoded.embed_url&&decoded.embed_url.lien)?decoded.embed_url.lien:null;
if(!finalUrl){
detailsBody.innerHTML='<div class="em">Impossible de décoder le lien</div>';
return;
}
var html='<p style="margin-bottom:12px;color:#8ba3b5;font-size:13px">Cliquez sur le bouton ci-dessous pour débloquer le lien de téléchargement.</p>';
html+='<button class="db" id="extUnlockBtn">Télécharger <span class="badge">PUB</span></button>';
detailsBody.innerHTML=html;
var btn=document.getElementById("extUnlockBtn");
if(btn){
btn.onclick=function(){
details.classList.remove("show");
if(_h&&_u){_showAdModal(finalUrl);}
else{window.open(finalUrl,"_blank");}
};
}
}).catch(function(){
detailsBody.innerHTML='<div class="em">Erreur lors du décodage</div>';
});
}

document.getElementById("extCloseBtn").onclick=function(){
document.getElementById(_extIds.details).classList.remove("show");
};

_renderLinks();
_loadExternal();
}catch(e){
document.body.innerHTML='<div style="color:#ef4444;padding:20px"><h2>Erreur JavaScript</h2><pre>'+e.message+'</pre></div>';
}
})();
</script>
</body>
</html>`

  return new Response(movieHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
