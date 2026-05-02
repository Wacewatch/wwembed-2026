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
      const alternateWwId = wwId.replace("ww-soft-", "ww-software-")
      const { data: content2 } = await supabase.from("digital_content").select("*").eq("ww_id", alternateWwId).single()
      if (content2) digitalContent = content2
    } else if (wwId.startsWith("ww-software-")) {
      const alternateWwId = wwId.replace("ww-software-", "ww-soft-")
      const { data: content2 } = await supabase.from("digital_content").select("*").eq("ww_id", alternateWwId).single()
      if (content2) digitalContent = content2
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
      altContent: generateRandomId("exa"),
      altLoading: generateRandomId("exal"),
      altCount: generateRandomId("exac"),
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
.ext-tabs{display:flex;gap:8px;margin-bottom:16px}
.ext-tab{flex:1;padding:10px 14px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.ext-tab.active{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 4px 12px rgba(102,126,234,0.4)}
.ext-tab:not(.active){background:rgba(30,58,79,0.4);color:#94a3b8;border:1px solid rgba(30,58,79,0.6)}
.ext-tab:not(.active):hover{background:rgba(30,58,79,0.7);color:#e5e7eb}
.ext-tab-badge{background:rgba(255,255,255,0.2);padding:2px 7px;border-radius:10px;font-size:11px}
.ext-tab.active .ext-tab-badge{background:rgba(255,255,255,0.25)}
.ext-tab:not(.active) .ext-tab-badge{background:rgba(102,126,234,0.3);color:#a78bfa}
.ext-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:30px;color:#8ba3b5}
.ext-loading svg{animation:spin 1s linear infinite;width:24px;height:24px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ext-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:rgba(30,58,79,0.2);border-radius:10px}
.ext-select{padding:8px 12px;background:rgba(30,58,79,0.5);border:1px solid #1e3a4f;border-radius:8px;color:#e5e7eb;font-size:12px}
.ext-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.ext-card{background:rgba(22,34,48,0.8);border-radius:12px;border:1px solid rgba(102,126,234,0.3);overflow:hidden;transition:all 0.2s}
.ext-card:hover{border-color:rgba(102,126,234,0.6);transform:translateY(-2px)}
.ext-card.alt-card{border-color:rgba(245,158,11,0.3)}
.ext-card.alt-card:hover{border-color:rgba(245,158,11,0.6)}
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
.alt-badge{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:0.5px;vertical-align:middle}
.alt-filename{font-size:11px;color:#94a3b8;word-break:break-word;margin-top:6px;line-height:1.4;max-height:3.2em;overflow:hidden}
.ext-btn.alt-btn{background:linear-gradient(135deg,#f59e0b,#d97706)}
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
.decode-loading{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99999}
.decode-loading-box{background:#1e293b;border-radius:12px;padding:32px 24px;text-align:center;color:#e2e8f0;min-width:200px}
.decode-loading-box svg{animation:spin 1s linear infinite;width:36px;height:36px;margin-bottom:14px;color:#667eea}
.decode-loading-box p{font-size:14px;color:#94a3b8}
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
</div>

<div class="ext-tabs">
<button class="ext-tab active" id="tabMovix" onclick="switchTab('movix')">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  Sources externes
  <span class="ext-tab-badge" id="${externalIds.count}">...</span>
</button>
<button class="ext-tab" id="tabAlt" onclick="switchTab('alt')">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  Sources Alt
  <span class="ext-tab-badge" id="${externalIds.altCount}">...</span>
</button>
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

<div id="${externalIds.altContent}_wrap" style="display:none">
<div class="ext-loading" id="${externalIds.altLoading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources alternatives...
</div>
<div id="${externalIds.altContent}" class="ext-grid"></div>
</div>

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
<a href="${adUrl}" target="_blank" rel="noopener" class="bt bp" id="${ids.btnUnlock}">CONTINUER<span class="tag">PUB</span></a>
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
var _contentType="${contentType}";
var _allExtLinks=[];
var _currentExtLinks=[];
var _allAltLinks=[];
var _altLoaded=false;
var _movixContentId=null;
var _BASE="https://still-wood-a206.wavewatchcontact.workers.dev/https://api.movix.cash/api";
var AD_URL_EXT="https://foreignabnormality.com/q7jywq0h?key=6eb56670c09233e007f1bfb9cf0e1b55";

window.switchTab=function(tab){
  var movixWrap=document.getElementById(_extIds.container);
  var altWrap=document.getElementById(_extIds.altContent+"_wrap");
  var tabMovix=document.getElementById("tabMovix");
  var tabAlt=document.getElementById("tabAlt");
  if(tab==="movix"){
    movixWrap.style.display="block";altWrap.style.display="none";
    tabMovix.classList.add("active");tabAlt.classList.remove("active");
  }else{
    movixWrap.style.display="none";altWrap.style.display="block";
    tabAlt.classList.add("active");tabMovix.classList.remove("active");
    if(!_altLoaded){_altLoaded=true;_loadAltExternal();}
  }
};

function _getExpectedTypes(){
  if(_contentType==="game")return["games","game"];
  if(_contentType==="music")return["music","album","titre"];
  if(_contentType==="ebook")return["doc","ebook","book","livre"];
  if(_contentType==="software")return["software","logiciel","app"];
  return null;
}

function _getDownloadEndpoint(resultType){
  var t=(resultType||"").toLowerCase();
  if(t==="games"||t==="game")return"game";
  if(t==="music"||t==="album"||t==="titre")return"music";
  if(t==="doc"||t==="ebook"||t==="book"||t==="livre")return"ebook";
  if(t==="software"||t==="logiciel"||t==="app")return"software";
  if(t==="series"||t==="tv")return"tv";
  return"movie";
}

function openAdPopup() {
  if(!_u)return;
  var link=document.createElement('a');
  link.href=_u;link.target='_blank';link.rel='noopener noreferrer';
  document.body.appendChild(link);link.click();document.body.removeChild(link);
}

function _renderLink(l){
  var url=l.source_url||"";
  var release=l.release_name||l.source_name||"Fichier téléchargeable";
  var meta='<div class="li-meta">';
  if(l.quality)meta+='<span class="li-tag" style="background:#0d9488;color:#fff">'+l.quality+'</span>';
  if(l.resolution)meta+='<span class="li-tag" style="background:#7c3aed;color:#fff">'+l.resolution+'</span>';
  if(l.file_size)meta+='<span class="li-tag" style="background:#059669;color:#fff">'+l.file_size+'</span>';
  if(l.language)meta+='<span class="li-tag" style="background:#2563eb;color:#fff">'+l.language+'</span>';
  if(l.codec_video)meta+='<span class="li-tag" style="background:#db2777;color:#fff">'+l.codec_video+'</span>';
  if(l.codec_audio)meta+='<span class="li-tag" style="background:#ea580c;color:#fff">'+l.codec_audio+'</span>';
  if(l.source_type)meta+='<span class="li-tag" style="background:#dc2626;color:#fff">'+l.source_type+'</span>';
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
  c.innerHTML=html;_bindBtns();
}

function _bindBtns(){
  var bs=document.querySelectorAll(".li-btn");
  for(var j=0;j<bs.length;j++){
    (function(btn){
      btn.onclick=function(e){
        e.preventDefault();
        var url=btn.getAttribute("data-url");
        if(!url||url==="undefined"){alert("Lien non disponible");return;}
        if(_h&&_u){openAdPopup();_showAdModal(decodeURIComponent(url));}
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
  var buClone=bu.cloneNode(true);bu.parentNode.replaceChild(buClone,bu);bu=buClone;
  bu.addEventListener("click",function(){
    setTimeout(function(){
      if(s1){s1.classList.remove("active");s1.classList.add("done");}
      if(s2){s2.classList.add("active");s2.classList.add("done");}
      if(bt)bt.classList.add("hi");
      if(bh)bh.classList.add("hi");
      if(bk)bk.classList.add("hi");
      if(bd)bd.classList.remove("hi");
      if(pr)pr.style.width="100%";
      bu.classList.add("hi");
      if(dn)dn.classList.remove("hi");
      fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_i})}).catch(function(){});
    },150);
  });
  dn=document.getElementById(_ids.btnDownload);
  var dnClone=dn.cloneNode(true);dn.parentNode.replaceChild(dnClone,dn);
  dnClone.onclick=function(){
    o.classList.remove("sh");
    if(_p){
      fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"digital",wwId:_wwId})});
      _displayLink(_p);_p=null;
    }
  };
}

function _loadExternal(){
  var loading=document.getElementById(_extIds.loading);
  var content=document.getElementById(_extIds.content);
  var filters=document.getElementById(_extIds.filters);
  var countBadge=document.getElementById(_extIds.count);

  fetch(_BASE+"/search?title="+encodeURIComponent(_title))
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
      countBadge.textContent="0";return;
    }
    var expectedTypes=_getExpectedTypes();
    var best=null;
    if(expectedTypes){
      for(var i=0;i<results.length;i++){
        var t=(results[i].type||"").toLowerCase();
        for(var j=0;j<expectedTypes.length;j++){
          if(t===expectedTypes[j]){best=results[i];break;}
        }
        if(best)break;
      }
    }
    if(!best)best=results[0];
    var itemId=best.id||best.movie_id;
    _movixContentId=itemId;
    var endpoint=_getDownloadEndpoint(best.type||"movie");
    var dlUrl=_BASE+"/darkiworld/download/"+endpoint+"/"+itemId;

    function _fetchLinks(url,useFallback){
      fetch(url).then(function(r){return r.json();})
      .then(function(dlData){
        var links=(dlData&&dlData.success&&dlData.all)?dlData.all.filter(function(l){return l.id;}):null;
        if((!links||links.length===0)&&useFallback){
          _fetchLinks(_BASE+"/darkiworld/download/movie/"+itemId,false);return;
        }
        loading.style.display="none";
        if(!links||links.length===0){
          content.innerHTML='<div class="em">Aucun lien externe disponible</div>';
          countBadge.textContent="0";return;
        }
        _allExtLinks=links;countBadge.textContent=links.length;
        _populateFilters(links);filters.style.display="flex";_renderExtLinks(links);
      }).catch(function(){
        if(useFallback){_fetchLinks(_BASE+"/darkiworld/download/movie/"+itemId,false);return;}
        loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";
      });
    }
    _fetchLinks(dlUrl,endpoint!=="movie");
  }).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";});
}

function _loadAltExternal(){
  var altLoading=document.getElementById(_extIds.altLoading);
  var altContent=document.getElementById(_extIds.altContent);
  var altCountBadge=document.getElementById(_extIds.altCount);
  var altUrl="https://apis.wavewatch.top/wawa.php?_route=api&type=search&q="+encodeURIComponent(_title);
  fetch(altUrl)
  .then(function(r){return r.json();})
  .then(function(data){
    altLoading.style.display="none";
    var links=_extractAndFilterAltLinks(data);
    _allAltLinks=links;
    altCountBadge.textContent=links.length;
    if(links.length===0){altContent.innerHTML='<div class="em">Aucune source alternative disponible</div>';return;}
    _renderAltLinks(links,altContent);
  }).catch(function(){
    altLoading.style.display="none";
    altContent.innerHTML='<div class="em">Erreur de chargement</div>';
    altCountBadge.textContent="0";
  });
}

// ── Parse quality & language from filename ────────────────────────────────
function _parseFilename(fname){
  if(!fname)return{quality:"",lang:""};
  var up=fname.toUpperCase();
  var quality="";
  var lang="";
  // Quality tokens (order matters: check more specific first)
  var qualities=["2160P","4K","1080P","720P","480P","576P","1080I","720I",
    "BDRIP","BLURAY","BLU-RAY","BDREMUX","REMUX","WEBDL","WEB-DL","WEBRIP",
    "WEB-RIP","HDRIP","HDTV","DVDSCR","DVDRIP","DVD","TVRIP","VHSRIP",
    "HDCAM","CAM","TS","R5","SCR","VODRIP"];
  for(var i=0;i<qualities.length;i++){
    if(up.indexOf(qualities[i])!==-1){quality=qualities[i].replace("-","");break;}
  }
  // Language tokens
  var langs=[
    ["MULTI","MULTI"],["TRUEFRENCH","TRUEFRENCH"],["FRENCH","FR"],
    ["VOSTFR","VOSTFR"],["VOSTSUB","VOSTSUB"],["VOST","VOST"],
    ["VFF","VFF"],["VFQ","VFQ"],["VF","VF"],
    ["FANSUB","FANSUB"],
    ["ENGLISH","EN"],["ENGLISH","EN"],["ENG","EN"],
    ["SPANISH","ES"],["SPANISH","ES"],["SPA","ES"],
    ["GERMAN","DE"],["GER","DE"],["DEUTSCH","DE"],
    ["ITALIAN","IT"],["ITA","IT"],
    ["PORTUGUESE","PT"],["POR","PT"],
    ["ARABIC","AR"],["ARA","AR"],
    ["RUSSIAN","RU"],["RUS","RU"],
    ["JAPANESE","JA"],["JPN","JA"],
    ["KOREAN","KO"],["KOR","KO"],
    ["CHINESE","ZH"],["CHI","ZH"]
  ];
  for(var j=0;j<langs.length;j++){
    if(up.indexOf(langs[j][0])!==-1){lang=langs[j][1];break;}
  }
  return{quality:quality,lang:lang};
}

function _extractAndFilterAltLinks(data){
  var raw=[];
  if(Array.isArray(data)){
    raw=data;
  } else if(data&&Array.isArray(data.links)){
    raw=data.links;
  } else if(data&&Array.isArray(data.downloadLinks)){
    raw=data.downloadLinks;
  } else if(data&&Array.isArray(data.results)){
    raw=data.results;
  } else if(data&&Array.isArray(data.data)){
    raw=data.data;
  } else if(data&&Array.isArray(data.qualities)){
    data.qualities.forEach(function(q){
      if(Array.isArray(q.downloadLinks)){
        q.downloadLinks.forEach(function(l){
          raw.push(Object.assign({},l,{quality:l.protection||q.quality||"",_qualityGroup:q.quality||""}));
        });
      }
    });
  }
  return _filterAltLinks(raw);
}

function _filterAltLinks(raw){
  return (raw||[]).filter(function(l){
    var u=l.url||l.lien||l.link||"";
    var fname=(l.filename||l.name||"").toLowerCase();
    var host=(l.host||l.provider||"").toLowerCase();
    var prot=l.protection||l.quality||l._qualityGroup||"";
    if(!u)return false;
    if(u.indexOf("rqts-url")!==-1)return false;
    if(u.indexOf("wawacity.news")!==-1)return false;
    if(u.indexOf("/pub/")!==-1)return false;
    if(host==="wawacity")return false;
    if(host==="mamot")return false;
    var badFilenames=["vod(+18)","webcams","rencontres sexe","boutique","rencontres","adulte","xxx"];
    for(var i=0;i<badFilenames.length;i++){
      if(fname.indexOf(badFilenames[i])!==-1)return false;
    }
    if(!fname&&!prot)return false;
    return true;
  });
}

function _renderAltLinks(links,container){
  if(links.length===0){container.innerHTML='<div class="em">Aucun résultat</div>';return;}
  var html="";
  links.forEach(function(l,idx){
    var u=l.url||l.lien||l.link||"";
    var host=l.host||l.provider||"";
    var fname=l.filename||l.name||"";
    var size=l.size||"";
    var prot=l.protection||l.quality||l._qualityGroup||"";
    var parsed=_parseFilename(fname);
    var dispQuality=prot||parsed.quality||"N/A";
    var dispLang=l.language||parsed.lang||"";
    html+='<div class="ext-card alt-card" data-alt-idx="'+idx+'"><div class="ext-card-body">';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
    html+='<span class="ext-quality">'+dispQuality+'</span>';
    if(dispLang)html+='<span style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700">'+dispLang+'</span>';
    html+='<span class="alt-badge">ALT</span>';
    html+='</div>';
    if(host)html+='<div class="ext-provider">'+host+'</div>';
    if(fname)html+='<div class="alt-filename">'+fname+'</div>';
    if(size)html+='<div class="ext-info" style="margin-top:6px">Taille: '+size+'</div>';
    html+=(u
      ?'<button class="ext-btn alt-btn">Télécharger</button>'
      :'<button class="ext-btn alt-btn" disabled style="opacity:0.4;cursor:not-allowed">Indisponible</button>');
    html+='</div></div>';
  });
  container.innerHTML=html;
  container.querySelectorAll(".alt-card").forEach(function(card){
    var btn=card.querySelector(".ext-btn");
    if(btn.disabled)return;
    btn.onclick=function(e){
      e.stopPropagation();
      var idx=parseInt(card.getAttribute("data-alt-idx"));
      var l=_allAltLinks[idx];
      var u=l.url||l.lien||l.link||"";
      if(!u){alert("Lien non disponible");return;}
      _openExtAdModal(u,{provider:l.host,quality:l.protection||l._qualityGroup});
    };
  });
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

function _formatSize(bytes){
  if(!bytes)return"N/A";
  var gb=bytes/(1024*1024*1024);
  if(gb>=1)return gb.toFixed(2)+" GB";
  return(bytes/(1024*1024)).toFixed(0)+" MB";
}

function _renderExtLinks(links){
  _currentExtLinks=links;
  var content=document.getElementById(_extIds.content);
  if(links.length===0){content.innerHTML='<div class="em">Aucun résultat</div>';return;}
  var html="";
  links.forEach(function(l,idx){
    html+='<div class="ext-card" data-idx="'+idx+'"><div class="ext-card-body">';
    html+='<div class="ext-provider">'+(l.provider||"Inconnu")+'</div>';
    html+='<span class="ext-quality">'+(l.quality||"N/A")+'</span>';
    if(l.sub)html+='<div class="ext-info">Sub: '+l.sub+'</div>';
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
      _showExtDetails(_currentExtLinks[idx]);
    };
  });
}

function _openExtAdModal(finalUrl, extLink){
  fetch("/api/link-click",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({linkType:"external",wwId:_wwId,provider:(extLink&&extLink.provider)||null,hostName:(extLink&&extLink.host_name)||null,quality:(extLink&&extLink.quality)||null,language:(extLink&&extLink.language)||null,fileSize:(extLink&&extLink.size)||null})
  }).catch(function(){});

  window._extFinalUrl=finalUrl;
  var existingModal=document.getElementById("extAdModal");
  if(existingModal)existingModal.remove();

  var modal=document.createElement("div");
  modal.id="extAdModal";
  modal.style.cssText="position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95),rgba(118,75,162,0.95));display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px";
  var box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center";
  var title=document.createElement("h2");
  title.style.cssText="color:#1a1a2e;margin-bottom:6px;font-size:18px";
  title.textContent="Votre lien est prêt";
  var subtitle=document.createElement("p");
  subtitle.style.cssText="color:#666;font-size:12px;margin-bottom:14px";
  subtitle.textContent="Cliquez pour accéder au téléchargement";
  var warning=document.createElement("div");
  warning.style.cssText="border-radius:8px;padding:10px;margin:6px 0;text-align:left;display:flex;align-items:flex-start;gap:8px;background:#fef3c7;border:1px solid #f59e0b;color:#92400e";
  warning.innerHTML='<svg style="width:16px;height:16px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div><b style="display:block;font-size:12px;margin-bottom:2px">Popup requis</b><span style="font-size:10px;opacity:0.8">Autorisez les popups pour continuer</span></div>';
  var support=document.createElement("div");
  support.style.cssText="border-radius:8px;padding:10px;margin:6px 0;text-align:left;display:flex;align-items:flex-start;gap:8px;background:#ede9fe;border:1px solid #8b5cf6;color:#5b21b6";
  support.innerHTML='<svg style="width:16px;height:16px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><div><b style="display:block;font-size:12px;margin-bottom:2px">Soutenez le service gratuit</b><span style="font-size:10px;opacity:0.8">Votre clic nous aide à rester en ligne</span></div>';
  var adBtn=document.createElement("a");
  adBtn.href=AD_URL_EXT;adBtn.target="_blank";adBtn.rel="noopener";
  adBtn.style.cssText="display:block;width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;text-align:center;margin-top:8px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;cursor:pointer";
  adBtn.innerHTML='CONTINUER <span style="background:#fff;color:#667eea;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px">PUB</span>';
  var startBtn=document.createElement("button");
  startBtn.style.cssText="display:none;width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff";
  startBtn.textContent="VOIR LE LIEN";
  adBtn.onclick=function(){this.style.display="none";startBtn.style.display="block";};
  startBtn.onclick=function(){modal.remove();_displayLink(window._extFinalUrl);};
  var footer=document.createElement("p");
  footer.style.cssText="margin-top:10px;font-size:10px;color:#999";
  footer.innerHTML='Propulsé par <a href="https://wavewatch.xyz" target="_blank" style="color:#667eea">WaveWatch</a>';
  box.appendChild(title);box.appendChild(subtitle);box.appendChild(warning);box.appendChild(support);
  box.appendChild(adBtn);box.appendChild(startBtn);box.appendChild(footer);
  modal.appendChild(box);document.body.appendChild(modal);
}

function _showExtDetails(extLink){
  if(!extLink)return;
  if(extLink.lien){_openExtAdModal(extLink.lien,extLink);return;}
  if(!extLink.id){alert("Lien non disponible pour ce fichier");return;}
  var tmpLoader=document.createElement("div");
  tmpLoader.className="decode-loading";tmpLoader.id="decodeLoader";
  tmpLoader.innerHTML='<div class="decode-loading-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><p>Décodage du lien...</p></div>';
  document.body.appendChild(tmpLoader);
  var decodeUrl=_BASE+"/darkiworld/decode/"+extLink.id+"?title_id="+_movixContentId;
  fetch(decodeUrl).then(function(r){return r.json();})
  .then(function(data){
    var loader=document.getElementById("decodeLoader");if(loader)loader.remove();
    var finalUrl=null;
    if(data&&data.lien)finalUrl=data.lien;
    else if(data&&data.embed_url&&data.embed_url.lien)finalUrl=data.embed_url.lien;
    if(!finalUrl){alert("Lien non disponible pour ce fichier");return;}
    _openExtAdModal(finalUrl,extLink);
  }).catch(function(){
    var loader=document.getElementById("decodeLoader");if(loader)loader.remove();
    alert("Erreur lors du décodage du lien");
  });
}

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
    altContent: generateRandomId("exa"),
    altLoading: generateRandomId("exal"),
    altCount: generateRandomId("exac"),
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
.li-bottom{padding:12px 16px;background:rgba(30,58,79,0.2)}
.li-btn{padding:12px 20px;background:linear-gradient(135deg,#14B8A6,#0d9488);color:#0c1520;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;width:100%}
.em{color:#6b7280;padding:40px 20px;text-align:center;font-size:15px;background:rgba(22,34,48,0.5);border-radius:12px}
.ft{text-align:center;color:#4b5563;font-size:12px;margin-top:20px}
.ft a{color:#14B8A6}
.sec-title{display:flex;align-items:center;gap:10px;padding:16px;background:linear-gradient(135deg,rgba(102,126,234,0.2),rgba(118,75,162,0.2));border:1px solid rgba(102,126,234,0.3);border-radius:12px;margin:24px 0 16px;font-weight:700;color:#a78bfa}
.sec-title svg{width:20px;height:20px}
.ext-tabs{display:flex;gap:8px;margin-bottom:16px}
.ext-tab{flex:1;padding:10px 14px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.ext-tab.active{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 4px 12px rgba(102,126,234,0.4)}
.ext-tab:not(.active){background:rgba(30,58,79,0.4);color:#94a3b8;border:1px solid rgba(30,58,79,0.6)}
.ext-tab:not(.active):hover{background:rgba(30,58,79,0.7);color:#e5e7eb}
.ext-tab-badge{background:rgba(255,255,255,0.2);padding:2px 7px;border-radius:10px;font-size:11px}
.ext-tab.active .ext-tab-badge{background:rgba(255,255,255,0.25)}
.ext-tab:not(.active) .ext-tab-badge{background:rgba(102,126,234,0.3);color:#a78bfa}
.ext-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:30px;color:#8ba3b5}
.ext-loading svg{animation:spin 1s linear infinite;width:24px;height:24px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ext-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:rgba(30,58,79,0.2);border-radius:10px}
.ext-select{padding:8px 12px;background:rgba(30,58,79,0.5);border:1px solid #1e3a4f;border-radius:8px;color:#e5e7eb;font-size:12px}
.ext-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.ext-card{background:rgba(22,34,48,0.8);border-radius:12px;border:1px solid rgba(102,126,234,0.3);overflow:hidden;transition:all 0.2s}
.ext-card:hover{border-color:rgba(102,126,234,0.6);transform:translateY(-2px)}
.ext-card.alt-card{border-color:rgba(245,158,11,0.3)}
.ext-card.alt-card:hover{border-color:rgba(245,158,11,0.6)}
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
.alt-badge{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:0.5px;vertical-align:middle}
.alt-filename{font-size:11px;color:#94a3b8;word-break:break-word;margin-top:6px;line-height:1.4;max-height:3.2em;overflow:hidden}
.ext-btn.alt-btn{background:linear-gradient(135deg,#f59e0b,#d97706)}
.link-display-area{display:none;margin:20px 0;padding:20px;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(20,184,166,0.1));border:2px solid #10b981;border-radius:12px}
.link-display-title{font-size:16px;font-weight:700;color:#10b981;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.link-display-url{background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-family:monospace;font-size:12px;color:#5eead4;word-break:break-all;margin-bottom:16px;border:1px solid rgba(94,234,212,0.3)}
.link-display-btns{display:flex;gap:10px;flex-wrap:wrap}
.link-display-btn{flex:1;min-width:140px;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;text-align:center;text-decoration:none;transition:all 0.2s}
.link-display-btn.primary{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none}
.link-display-btn.secondary{background:transparent;color:#5eead4;border:2px solid #5eead4;cursor:pointer}
.copy-success{color:#10b981;font-size:12px;margin-top:8px;display:none}
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
.decode-loading{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99999}
.decode-loading-box{background:#1e293b;border-radius:12px;padding:32px 24px;text-align:center;color:#e2e8f0;min-width:200px}
.decode-loading-box svg{animation:spin 1s linear infinite;width:36px;height:36px;margin-bottom:14px;color:#667eea}
.decode-loading-box p{font-size:14px;color:#94a3b8}
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
</div>

<div class="ext-tabs">
<button class="ext-tab active" id="tabMovix" onclick="switchTab('movix')">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  Sources externes
  <span class="ext-tab-badge" id="${externalIds.count}">...</span>
</button>
<button class="ext-tab" id="tabAlt" onclick="switchTab('alt')">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  Sources Alt
  <span class="ext-tab-badge" id="${externalIds.altCount}">...</span>
</button>
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

<div id="${externalIds.altContent}_wrap" style="display:none">
<div class="ext-loading" id="${externalIds.altLoading}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
Recherche de sources alternatives...
</div>
<div id="${externalIds.content}_altfilters" class="ext-filters" style="display:none">
<select id="altQualityFilter" class="ext-select"><option value="">Qualité</option></select>
<select id="altHostFilter" class="ext-select"><option value="">Host</option></select>
</div>
<div id="${externalIds.altContent}" class="ext-grid"></div>
</div>

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
var _currentExtLinks=[];
var _allAltLinks=[];
var _currentAltLinks=[];
var _altLoaded=false;
var _movixMovieId=null;
var _BASE="https://still-wood-a206.wavewatchcontact.workers.dev/https://api.movix.cash/api";
var AD_URL_EXT="https://foreignabnormality.com/q7jywq0h?key=6eb56670c09233e007f1bfb9cf0e1b55";
var ALT_BASE="https://apis.wavewatch.top/wawa.php";

window.switchTab=function(tab){
  var movixWrap=document.getElementById(_extIds.container);
  var altWrap=document.getElementById(_extIds.altContent+"_wrap");
  var tabMovix=document.getElementById("tabMovix");
  var tabAlt=document.getElementById("tabAlt");
  if(tab==="movix"){
    movixWrap.style.display="block";altWrap.style.display="none";
    tabMovix.classList.add("active");tabAlt.classList.remove("active");
  }else{
    movixWrap.style.display="none";altWrap.style.display="block";
    tabAlt.classList.add("active");tabMovix.classList.remove("active");
    if(!_altLoaded){_altLoaded=true;_loadAltExternal();}
  }
};

// ── Parse quality & language from filename ────────────────────────────────
function _parseFilename(fname){
  if(!fname)return{quality:"",lang:""};
  var up=fname.toUpperCase();
  var quality="";
  var lang="";
  var qualities=["2160P","4K","1080P","720P","480P","576P","1080I","720I",
    "BDRIP","BLURAY","BLU-RAY","BDREMUX","REMUX","WEBDL","WEB-DL","WEBRIP",
    "WEB-RIP","HDRIP","HDTV","DVDSCR","DVDRIP","DVD","TVRIP","VHSRIP",
    "HDCAM","CAM","TS","R5","SCR","VODRIP"];
  for(var i=0;i<qualities.length;i++){
    if(up.indexOf(qualities[i])!==-1){quality=qualities[i].replace("-","");break;}
  }
  var langs=[
    ["MULTI","MULTI"],["TRUEFRENCH","TRUEFRENCH"],["FRENCH","FR"],
    ["VOSTFR","VOSTFR"],["VOSTSUB","VOSTSUB"],["VOST","VOST"],
    ["VFF","VFF"],["VFQ","VFQ"],["VF","VF"],
    ["FANSUB","FANSUB"],
    ["ENGLISH","EN"],["ENG","EN"],
    ["SPANISH","ES"],["SPA","ES"],
    ["GERMAN","DE"],["GER","DE"],["DEUTSCH","DE"],
    ["ITALIAN","IT"],["ITA","IT"],
    ["PORTUGUESE","PT"],["POR","PT"],
    ["ARABIC","AR"],["ARA","AR"],
    ["RUSSIAN","RU"],["RUS","RU"],
    ["JAPANESE","JA"],["JPN","JA"],
    ["KOREAN","KO"],["KOR","KO"],
    ["CHINESE","ZH"],["CHI","ZH"]
  ];
  for(var j=0;j<langs.length;j++){
    if(up.indexOf(langs[j][0])!==-1){lang=langs[j][1];break;}
  }
  return{quality:quality,lang:lang};
}

function _normaliseAltLinks(data){
  var raw=[];
  if(Array.isArray(data)){
    raw=data;
  } else if(data&&Array.isArray(data.links)){
    raw=data.links;
  } else if(data&&Array.isArray(data.downloadLinks)){
    raw=data.downloadLinks;
  } else if(data&&Array.isArray(data.results)){
    raw=data.results;
  } else if(data&&Array.isArray(data.data)){
    raw=data.data;
  } else if(data&&Array.isArray(data.qualities)){
    data.qualities.forEach(function(q){
      if(Array.isArray(q.downloadLinks)){
        q.downloadLinks.forEach(function(l){
          raw.push(Object.assign({},l,{
            quality: l.protection||q.quality||"",
            _qualityGroup: q.quality||""
          }));
        });
      }
    });
  }
  return raw;
}

function _filterAltLinks(raw){
  return (raw||[]).filter(function(l){
    var u=l.url||l.lien||l.link||"";
    var fname=(l.filename||l.name||"").toLowerCase();
    var host=(l.host||l.provider||"").toLowerCase();
    var prot=l.protection||l.quality||l._qualityGroup||"";
    if(!u)return false;
    if(u.indexOf("rqts-url")!==-1)return false;
    if(u.indexOf("wawacity.news")!==-1)return false;
    if(u.indexOf("/pub/")!==-1)return false;
    if(host==="wawacity")return false;
    if(host==="mamot")return false;
    var badFilenames=["vod(+18)","webcams","rencontres sexe","boutique","rencontres","adulte","xxx"];
    for(var i=0;i<badFilenames.length;i++){
      if(fname.indexOf(badFilenames[i])!==-1)return false;
    }
    if(!fname&&!prot)return false;
    return true;
  });
}

function _loadAltExternal(){
  var altLoading=document.getElementById(_extIds.altLoading);
  var altContent=document.getElementById(_extIds.altContent);
  var altFilters=document.getElementById(_extIds.content+"_altfilters");
  var altCountBadge=document.getElementById(_extIds.altCount);

  var url;
  if(_mediaType==="tv"){
    var s=_seasonNum||1;
    var e=_episodeNum||1;
    url=ALT_BASE+"?_route=api&type=tv&id="+_tmdbId+"&s="+s+"&e="+e;
  }else{
    url=ALT_BASE+"?_route=api&type=movie&id="+_tmdbId;
  }

  fetch(url)
  .then(function(r){return r.json();})
  .then(function(data){
    altLoading.style.display="none";
    var raw=_normaliseAltLinks(data);
    var links=_filterAltLinks(raw);
    _allAltLinks=links;
    _currentAltLinks=links;
    altCountBadge.textContent=links.length;

    if(links.length===0){
      altContent.innerHTML='<div class="em">Aucune source alternative disponible</div>';
      return;
    }
    _populateAltFilters(links,altFilters);
    altFilters.style.display="flex";
    _renderAltLinks(links);
  }).catch(function(){
    altLoading.style.display="none";
    altContent.innerHTML='<div class="em">Erreur de chargement</div>';
    altCountBadge.textContent="0";
  });
}

function _populateAltFilters(links,filtersEl){
  var qualities=new Set(),hosts=new Set();
  links.forEach(function(l){
    var q=l.protection||l.quality||l._qualityGroup||"";
    var h=l.host||l.provider||"";
    if(q)qualities.add(q);
    if(h)hosts.add(h);
  });
  var qf=document.getElementById("altQualityFilter");
  var hf=document.getElementById("altHostFilter");
  qualities.forEach(function(q){var o=document.createElement("option");o.value=q;o.textContent=q;qf.appendChild(o);});
  hosts.forEach(function(h){var o=document.createElement("option");o.value=h;o.textContent=h;hf.appendChild(o);});
  qf.onchange=hf.onchange=_applyAltFilters;
}

function _applyAltFilters(){
  var qf=document.getElementById("altQualityFilter").value;
  var hf=document.getElementById("altHostFilter").value;
  var filtered=_allAltLinks.filter(function(l){
    var q=l.protection||l.quality||l._qualityGroup||"";
    var h=l.host||l.provider||"";
    if(qf&&q!==qf)return false;
    if(hf&&h!==hf)return false;
    return true;
  });
  _currentAltLinks=filtered;
  _renderAltLinks(filtered);
}

function _renderAltLinks(links){
  var content=document.getElementById(_extIds.altContent);
  if(!links||links.length===0){content.innerHTML='<div class="em">Aucun résultat</div>';return;}
  var html="";
  links.forEach(function(l,idx){
    var u=l.url||l.lien||l.link||"";
    var host=l.host||l.provider||"";
    var fname=l.filename||l.name||"";
    var size=l.size||"";
    var prot=l.protection||l.quality||l._qualityGroup||"";
    var parsed=_parseFilename(fname);
    var dispQuality=prot||parsed.quality||"N/A";
    var dispLang=l.language||parsed.lang||"";
    html+='<div class="ext-card alt-card" data-alt-idx="'+idx+'"><div class="ext-card-body">';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
    html+='<span class="ext-quality">'+dispQuality+'</span>';
    if(dispLang)html+='<span style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700">'+dispLang+'</span>';
    html+='<span class="alt-badge">ALT</span>';
    html+='</div>';
    if(host)html+='<div class="ext-provider">'+host+'</div>';
    if(fname)html+='<div class="alt-filename">'+fname+'</div>';
    if(size)html+='<div class="ext-info" style="margin-top:6px">Taille: '+size+'</div>';
    html+=(u
      ?'<button class="ext-btn alt-btn">Voir le lien</button>'
      :'<button class="ext-btn alt-btn" disabled style="opacity:0.4;cursor:not-allowed">Indisponible</button>');
    html+='</div></div>';
  });
  content.innerHTML=html;
  content.querySelectorAll(".alt-card").forEach(function(card){
    var btn=card.querySelector(".ext-btn");
    if(btn.disabled)return;
    btn.onclick=function(e){
      e.stopPropagation();
      var idx=parseInt(card.getAttribute("data-alt-idx"));
      var l=_currentAltLinks[idx];
      var u=l.url||l.lien||l.link||"";
      if(!u){alert("Lien non disponible");return;}
      _openExtAdModal(u,{provider:l.host||l.provider,quality:l.protection||l.quality||l._qualityGroup});
    };
  });
}

function _renderLink(l){
  var url=l.source_url||"";
  var release=l.release_name||l.source_name||"Fichier téléchargeable";
  var up=l.username?'<div class="li-up">par <span>'+l.username+'</span></div>':"";
  var ep="";
  if(_mediaType==="tv"){
    var sNum=l.season_number||_seasonNum||1;
    var eNum=l.episode_number||_episodeNum||1;
    ep='<div class="li-ep">S'+String(sNum).padStart(2,"0")+'E'+String(eNum).padStart(2,"0")+'</div>';
  }
  var meta='<div class="li-meta">';
  if(l.quality)meta+='<span class="li-tag" style="background:#0d9488;color:#fff">'+l.quality+'</span>';
  if(l.resolution)meta+='<span class="li-tag" style="background:#7c3aed;color:#fff">'+l.resolution+'</span>';
  if(l.file_size)meta+='<span class="li-tag" style="background:#059669;color:#fff">'+l.file_size+'</span>';
  if(l.language)meta+='<span class="li-tag" style="background:#2563eb;color:#fff">'+l.language+'</span>';
  if(l.codec_video)meta+='<span class="li-tag" style="background:#db2777;color:#fff">'+l.codec_video+'</span>';
  if(l.codec_audio)meta+='<span class="li-tag" style="background:#ea580c;color:#fff">'+l.codec_audio+'</span>';
  if(l.source_name)meta+='<span class="li-tag" style="background:#dc2626;color:#fff">'+l.source_name+'</span>';
  if(l.subtitle)meta+='<span class="li-tag" style="background:#4f46e5;color:#fff">'+l.subtitle+'</span>';
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
  c.innerHTML=html;_bindBtns();
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
          _displayLink(decodeURIComponent(url));
        }
      };
    })(bs[j]);
  }
}

function _displayLink(url){
  var area=document.getElementById("linkDisplayArea");
  area.style.display="block";
  area.innerHTML='<div class="link-display-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Votre lien est prêt !</div><div class="link-display-url" id="linkUrlText">'+url+'</div><div class="link-display-btns"><a href="'+url+'" target="_blank" class="link-display-btn primary">Ouvrir le lien</a><button class="link-display-btn secondary" onclick="_copyLink()">Copier le lien</button></div><div class="copy-success" id="copySuccess">Lien copié !</div>';
  area.scrollIntoView({behavior:"smooth"});
}

window._copyLink=function(){
  var urlText=document.getElementById("linkUrlText").textContent;
  navigator.clipboard.writeText(urlText).then(function(){
    var msg=document.getElementById("copySuccess");
    msg.style.display="block";
    setTimeout(function(){msg.style.display="none";},2000);
  });
};

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
  var buClone=bu.cloneNode(true);bu.parentNode.replaceChild(buClone,bu);
  buClone.addEventListener("click",function(){
    var adLink=document.createElement("a");
    adLink.href=_u;adLink.target="_blank";adLink.rel="noopener noreferrer";
    document.body.appendChild(adLink);adLink.click();document.body.removeChild(adLink);
    setTimeout(function(){
      if(s1){s1.classList.remove("active");s1.classList.add("done");}
      if(s2){s2.classList.add("active");s2.classList.add("done");}
      if(bt)bt.classList.add("hi");
      if(bh)bh.classList.add("hi");
      if(bk)bk.classList.add("hi");
      if(bd)bd.classList.remove("hi");
      if(pr)pr.style.width="100%";
      buClone.classList.add("hi");
      var dnEl=document.getElementById(_ids.btnDownload);
      if(dnEl)dnEl.classList.remove("hi");
      fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_i})}).catch(function(){});
    },150);
  });
  var dnEl=document.getElementById(_ids.btnDownload);
  var dnClone=dnEl.cloneNode(true);dnEl.parentNode.replaceChild(dnClone,dnEl);
  dnClone.onclick=function(){
    o.classList.remove("sh");
    if(_p){
      fetch("/api/link-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({linkType:"download",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType})});
      _displayLink(_p);_p=null;
    }
  };
}

function _loadExternal(){
  var loading=document.getElementById(_extIds.loading);
  var content=document.getElementById(_extIds.content);
  var filters=document.getElementById(_extIds.filters);
  var countBadge=document.getElementById(_extIds.count);

  fetch(_BASE+"/search?title="+encodeURIComponent(_title))
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
      countBadge.textContent="0";return;
    }
    var first=results[0];
    for(var i=0;i<results.length;i++){
      if(results[i].tmdb_id===_tmdbId||results[i].tmdb_id===String(_tmdbId)){
        first=results[i];break;
      }
    }
    var movieId=first.id||first.movie_id||first.tmdb_id;
    _movixMovieId=movieId;
    var isTv=(_mediaType==="tv")||first.is_series||(first.type==="series");
    var dlUrl;
    if(isTv){
      var s=_seasonNum||1;
      var e=_episodeNum||1;
      dlUrl=_BASE+"/darkiworld/download/tv/"+movieId+"?season="+s+"&episode="+e+"&tmdbId="+_tmdbId;
    }else{
      dlUrl=_BASE+"/darkiworld/download/movie/"+movieId+"?tmdbdId="+_tmdbId;
    }
    fetch(dlUrl)
    .then(function(r){return r.json();})
    .then(function(dlData){
      loading.style.display="none";
      var links=(dlData&&dlData.success&&dlData.all)?dlData.all.filter(function(l){return l.id;}):null;
      if(!links||links.length===0){
        content.innerHTML='<div class="em">Aucun lien externe disponible</div>';
        countBadge.textContent="0";return;
      }
      _allExtLinks=links;
      countBadge.textContent=links.length;
      _populateExtFilters(links);
      filters.style.display="flex";
      _renderExtLinks(links);
    }).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";});
  }).catch(function(){loading.style.display="none";content.innerHTML='<div class="em">Erreur de chargement</div>';countBadge.textContent="0";});
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

function _formatSize(bytes){
  if(!bytes)return"N/A";
  var gb=bytes/(1024*1024*1024);
  if(gb>=1)return gb.toFixed(2)+" GB";
  return(bytes/(1024*1024)).toFixed(0)+" MB";
}

function _renderExtLinks(links){
  _currentExtLinks=links;
  var content=document.getElementById(_extIds.content);
  if(links.length===0){content.innerHTML='<div class="em">Aucun résultat</div>';return;}
  var html="";
  links.forEach(function(l,idx){
    html+='<div class="ext-card" data-idx="'+idx+'"><div class="ext-card-body">';
    html+='<div class="ext-provider">'+(l.provider||"Inconnu")+'</div>';
    html+='<span class="ext-quality">'+(l.quality||"N/A")+'</span>';
    if(l.sub)html+='<div class="ext-info">Sub: '+l.sub+'</div>';
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
      _showExtDetails(_currentExtLinks[idx]);
    };
  });
}

function _openExtAdModal(finalUrl,extLink){
  fetch("/api/link-click",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      linkType:"external",wwId:_wwId,tmdbId:_tmdbId,mediaType:_mediaType,
      seasonNumber:_seasonNum||null,episodeNumber:_episodeNum||null,
      provider:(extLink&&extLink.provider)||null,hostName:(extLink&&extLink.host_name)||null,
      quality:(extLink&&extLink.quality)||null,language:(extLink&&extLink.language)||null,
      fileSize:(extLink&&extLink.size)||null
    })
  }).catch(function(){});

  window._extFinalUrl=finalUrl;
  var existingModal=document.getElementById("extAdModal");
  if(existingModal)existingModal.remove();

  var modal=document.createElement("div");
  modal.id="extAdModal";
  modal.style.cssText="position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95),rgba(118,75,162,0.95));display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px";
  var box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center";
  var title=document.createElement("h2");
  title.style.cssText="color:#1a1a2e;margin-bottom:6px;font-size:18px";title.textContent="Votre lien est prêt";
  var subtitle=document.createElement("p");
  subtitle.style.cssText="color:#666;font-size:12px;margin-bottom:14px";subtitle.textContent="Cliquez pour accéder au téléchargement";
  var warning=document.createElement("div");
  warning.style.cssText="border-radius:8px;padding:10px;margin:6px 0;text-align:left;display:flex;align-items:flex-start;gap:8px;background:#fef3c7;border:1px solid #f59e0b;color:#92400e";
  warning.innerHTML='<svg style="width:16px;height:16px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div><b style="display:block;font-size:12px;margin-bottom:2px">Popup requis</b><span style="font-size:10px;opacity:0.8">Autorisez les popups pour continuer</span></div>';
  var support=document.createElement("div");
  support.style.cssText="border-radius:8px;padding:10px;margin:6px 0;text-align:left;display:flex;align-items:flex-start;gap:8px;background:#ede9fe;border:1px solid #8b5cf6;color:#5b21b6";
  support.innerHTML='<svg style="width:16px;height:16px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><div><b style="display:block;font-size:12px;margin-bottom:2px">Soutenez le service gratuit</b><span style="font-size:10px;opacity:0.8">Votre clic nous aide à rester en ligne</span></div>';
  var adBtn=document.createElement("a");
  adBtn.href=AD_URL_EXT;adBtn.target="_blank";adBtn.rel="noopener";
  adBtn.style.cssText="display:block;width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;text-align:center;margin-top:8px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;cursor:pointer";
  adBtn.innerHTML='CONTINUER <span style="background:#fff;color:#667eea;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px">PUB</span>';
  var startBtn=document.createElement("button");
  startBtn.style.cssText="display:none;width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff";
  startBtn.textContent="VOIR LE LIEN";
  adBtn.onclick=function(){this.style.display="none";startBtn.style.display="block";};
  startBtn.onclick=function(){modal.remove();_displayLink(window._extFinalUrl);};
  var footer=document.createElement("p");
  footer.style.cssText="margin-top:10px;font-size:10px;color:#999";
  footer.innerHTML='Propulsé par <a href="https://wavewatch.xyz" target="_blank" style="color:#667eea">WaveWatch</a>';
  box.appendChild(title);box.appendChild(subtitle);box.appendChild(warning);box.appendChild(support);
  box.appendChild(adBtn);box.appendChild(startBtn);box.appendChild(footer);
  modal.appendChild(box);document.body.appendChild(modal);
}

function _showExtDetails(extLink){
  if(!extLink)return;
  if(extLink.lien){_openExtAdModal(extLink.lien,extLink);return;}
  if(!extLink.id){alert("Lien non disponible pour ce fichier");return;}
  var tmpLoader=document.createElement("div");
  tmpLoader.className="decode-loading";tmpLoader.id="decodeLoader";
  tmpLoader.innerHTML='<div class="decode-loading-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><p>Décodage du lien...</p></div>';
  document.body.appendChild(tmpLoader);
  var decodeUrl=_BASE+"/darkiworld/decode/"+extLink.id+"?title_id="+_movixMovieId;
  fetch(decodeUrl).then(function(r){return r.json();})
  .then(function(data){
    var loader=document.getElementById("decodeLoader");if(loader)loader.remove();
    var finalUrl=null;
    if(data&&data.lien)finalUrl=data.lien;
    else if(data&&data.embed_url&&data.embed_url.lien)finalUrl=data.embed_url.lien;
    if(!finalUrl){alert("Lien non disponible pour ce fichier");return;}
    _openExtAdModal(finalUrl,extLink);
  }).catch(function(){
    var loader=document.getElementById("decodeLoader");if(loader)loader.remove();
    alert("Erreur lors du décodage du lien");
  });
}

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
