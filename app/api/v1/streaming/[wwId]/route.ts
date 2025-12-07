import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getEpisodeDetails } from "@/lib/tmdb"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  try {
    const { wwId } = await params

    if (!wwId) {
      return NextResponse.json({ error: "Missing WW ID" }, { status: 400 })
    }

    const parsed = parseWWId(wwId)

    if (!parsed) {
      return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })
    }

    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed
    const supabase = createAdminClient()

    // Fetch ads
    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""
    const adId = hasAds ? ads[0].id : ""

    // Get TMDB data for title
    const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)

    let episodeData = null
    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      episodeData = await getEpisodeDetails(tmdbId, seasonNumber, episodeNumber)
    }

    let title = tmdbData ? ("title" in tmdbData ? tmdbData.title : tmdbData.name) : "Unknown Media"
    if (episodeData) {
      title = title + " - S" + seasonNumber + "E" + episodeNumber
    }

    // Get streaming links
    let streamingQuery = supabase
      .from("streaming_links")
      .select("*")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("is_active", true)
      .eq("status", "approved")

    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      streamingQuery = streamingQuery.eq("season_number", seasonNumber).eq("episode_number", episodeNumber)
    }

    const { data: userLinks } = await streamingQuery

    // Get auto-generated from APIs
    const { data: apis } = await supabase
      .from("third_party_apis")
      .select("*, language, is_anonymous")
      .eq("api_type", "streaming")
      .eq("is_active", true)
      .order("priority", { ascending: true })

    let anonymousCounter = 0

    const autoLinks = (apis || [])
      .filter((api) => {
        if (mediaType === "movie") {
          return !!(api.url_pattern_movie || api.url_pattern)
        } else {
          return !!api.url_pattern_tv
        }
      })
      .map((api) => {
        const pattern =
          mediaType === "movie"
            ? api.url_pattern_movie || api.url_pattern || ""
            : api.url_pattern_tv || api.url_pattern || ""

        let url = pattern.replace(/{tmdb_id}/g, String(tmdbId)).replace(/{media_type}/g, mediaType)

        if (mediaType === "movie") {
          url = url
            .replace(/{season}/g, "")
            .replace(/{episode}/g, "")
            .replace(/{season_number}/g, "")
            .replace(/{episode_number}/g, "")
        } else {
          url = url
            .replace(/{season}/g, String(seasonNumber || 1))
            .replace(/{episode}/g, String(episodeNumber || 1))
            .replace(/{season_number}/g, String(seasonNumber || 1))
            .replace(/{episode_number}/g, String(episodeNumber || 1))
        }

        url = url.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/g, "")

        const isAnonymous = api.is_anonymous || false
        const language = api.language || "VO"

        if (isAnonymous) {
          anonymousCounter++
        }

        return {
          name: isAnonymous ? `Source #${anonymousCounter}` : api.name,
          url,
          quality: "HD",
          language: language,
        }
      })
      .filter((link) => link.url && link.url.length > 0)

    const allSources = [
      ...autoLinks,
      ...(userLinks || []).map((l, i) => ({
        name: l.source_name || "Source #" + (autoLinks.length + i + 1),
        url: l.source_url,
        quality: l.quality || "HD",
        language: l.language || "VO",
      })),
    ]

    // Log embed view
    await supabase.from("embed_views").insert({
      ww_id: wwId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      season_number: seasonNumber ?? null,
      episode_number: episodeNumber ?? null,
      embed_type: "streaming",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/'/g, "\\'")

    const ids = {
      overlay: generateRandomId("m"),
      player: generateRandomId("p"),
      sources: generateRandomId("s"),
      timer: generateRandomId("t"),
      progress: generateRandomId("g"),
      btnUnlock: generateRandomId("u"),
      btnPlay: generateRandomId("y"),
      boxTime: generateRandomId("bt"),
      boxHelp: generateRandomId("bh"),
      boxThanks: generateRandomId("bk"),
      boxDone: generateRandomId("bd"),
      step1: generateRandomId("s1"),
      step2: generateRandomId("s2"),
      step3: generateRandomId("s3"),
      srcModal: generateRandomId("sm"),
      srcBtn: generateRandomId("sb"),
      srcLabel: generateRandomId("sl"),
      header: generateRandomId("hd"),
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#fff;height:100%;overflow:hidden}

/* Main container */
.player-wrap{width:100%;height:100%;display:flex;flex-direction:column}

/* Header bar */
.header{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:linear-gradient(180deg,#12121a 0%,#0a0a0f 100%);border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:#fff}
.logo svg{width:24px;height:24px}
.logo span{background:linear-gradient(135deg,#a855f7,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.title{font-size:13px;font-weight:600;color:#e0e0e0;text-align:center;flex:1;margin:0 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.header-right{display:flex;align-items:center;gap:8px}

/* Source dropdown button */
.src-btn{display:flex;align-items:center;gap:8px;padding:8px 14px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s}
.src-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,0.4)}
.src-btn svg{width:16px;height:16px}
.src-btn .label{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.src-btn .arrow{transition:transform 0.2s}
.src-btn.open .arrow{transform:rotate(180deg)}

/* Report button */
.report-btn{padding:8px;background:linear-gradient(135deg,#ef4444,#dc2626);border:none;border-radius:8px;color:#fff;cursor:pointer;transition:all 0.2s}
.report-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(239,68,68,0.4)}
.report-btn svg{width:16px;height:16px;display:block}

/* Video frame */
.video-frame{flex:1;position:relative;background:#000;min-height:0}
.video-frame iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.no-source{display:flex;align-items:center;justify-content:center;height:100%;color:#666;font-size:14px;flex-direction:column;gap:8px}
.no-source svg{width:48px;height:48px;opacity:0.3}

/* Source Modal */
.src-modal{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:none;align-items:flex-start;justify-content:center;z-index:1000;padding:20px;overflow-y:auto;backdrop-filter:blur(8px)}
.src-modal.show{display:flex}
.src-modal-content{background:linear-gradient(180deg,#1a1a2e 0%,#12121a 100%);border-radius:16px;width:100%;max-width:800px;margin:auto;border:1px solid rgba(255,255,255,0.1);box-shadow:0 25px 50px rgba(0,0,0,0.5)}
.src-modal-header{padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between}
.src-modal-title{font-size:20px;font-weight:700;background:linear-gradient(135deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.src-modal-sub{font-size:13px;color:#888;margin-top:4px}
.src-modal-close{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
.src-modal-close:hover{background:rgba(255,255,255,0.2);transform:rotate(90deg)}
.src-modal-close svg{width:20px;height:20px}
.src-modal-body{padding:20px 24px;max-height:60vh;overflow-y:auto}
.src-modal-body::-webkit-scrollbar{width:6px}
.src-modal-body::-webkit-scrollbar-track{background:#12121a}
.src-modal-body::-webkit-scrollbar-thumb{background:#3a3a5a;border-radius:3px}

/* Source grid */
.src-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:600px){.src-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:400px){.src-grid{grid-template-columns:1fr}}

/* Source card */
.src-card{background:linear-gradient(135deg,#1e1e2e 0%,#16162a 100%);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden}
.src-card:hover{border-color:rgba(139,92,246,0.5);transform:translateY(-2px);box-shadow:0 8px 24px rgba(139,92,246,0.2)}
.src-card.active{border-color:#8b5cf6;background:linear-gradient(135deg,#2d1f4e 0%,#1a1a2e 100%)}
.src-card-icon{width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.src-card-icon svg{width:24px;height:24px;color:#fff}
.src-card-badge{position:absolute;top:12px;right:12px;padding:4px 8px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:6px;font-size:10px;font-weight:700;color:#fff}
.src-card-name{font-size:14px;font-weight:600;color:#fff;margin-bottom:8px}
.src-card-tags{display:flex;flex-wrap:wrap;gap:6px}
.src-tag{padding:4px 8px;border-radius:6px;font-size:10px;font-weight:600;text-transform:uppercase}
.src-tag.lang{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff}
.src-tag.vostfr{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff}
.src-tag.multi{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff}

/* Ad Modal */
.ad-modal{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px);overflow-y:auto}
.ad-modal.hidden{display:none}
.ad-content{background:rgba(255,255,255,0.98);border-radius:16px;padding:24px;max-width:400px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4)}
.ad-content h2{color:#1a1a2e;margin-bottom:8px;font-size:20px;font-weight:700}
.ad-sub{color:#6b7280;font-size:13px;margin-bottom:20px}
.steps{display:flex;justify-content:center;gap:10px;margin-bottom:20px}
.step{width:12px;height:12px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.info-box{border-radius:12px;padding:14px;margin:10px 0;text-align:left;display:flex;align-items:flex-start;gap:12px}
.info-box svg{flex-shrink:0;width:20px;height:20px}
.info-box b{display:block;font-size:14px;margin-bottom:2px}
.info-box span{font-size:12px;opacity:0.8}
.box-warn{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.box-heart{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.box-time{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.box-done{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.progress-bar{height:6px;background:#e5e7eb;border-radius:3px;margin:16px 0;overflow:hidden}
.progress-fill{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s;border-radius:3px}
.btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.btn-success{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hidden{display:none!important}
.pub-tag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;margin-left:8px;font-weight:600}
.footer-text{margin-top:16px;font-size:11px;color:#9ca3af}
.footer-text a{color:#667eea;text-decoration:none;font-weight:500}

/* Mobile optimizations */
@media(max-width:480px){
.header{padding:8px 12px}
.logo{font-size:12px}
.logo svg{width:20px;height:20px}
.title{font-size:11px}
.src-btn{padding:6px 10px;font-size:11px}
.src-btn .label{max-width:80px}
.report-btn{padding:6px}
.src-modal-content{border-radius:12px}
.src-modal-header{padding:16px}
.src-modal-title{font-size:18px}
.src-modal-body{padding:16px}
.src-card{padding:12px}
.src-card-icon{width:40px;height:40px}
.src-card-icon svg{width:20px;height:20px}
.src-card-name{font-size:13px}
.ad-content{padding:20px}
}
</style>
</head>
<body>
<div class="player-wrap">
  <!-- Header -->
  <div class="header" id="${ids.header}">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span>WWEMBED</span>
    </div>
    <div class="title">${title}</div>
    <div class="header-right">
      <button class="src-btn" id="${ids.srcBtn}" onclick="toggleSrcModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span class="label" id="${ids.srcLabel}">Sources</span>
        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <button class="report-btn" title="Signaler un problème">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Video frame -->
  <div class="video-frame" id="${ids.player}">
    <div class="no-source">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <span>Chargement...</span>
    </div>
  </div>
</div>

<!-- Source selection modal -->
<div class="src-modal" id="${ids.srcModal}">
  <div class="src-modal-content">
    <div class="src-modal-header">
      <div>
        <div class="src-modal-title">Choisissez votre source</div>
        <div class="src-modal-sub">Sélectionnez un serveur pour commencer la lecture</div>
      </div>
      <button class="src-modal-close" onclick="toggleSrcModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="src-modal-body">
      <div class="src-grid" id="${ids.sources}"></div>
    </div>
  </div>
</div>

<script>
(function(){
var sources=${sourcesJson};
var adUrl="${adUrl}";
var adId="${adId}";
var hasAds=${hasAds};
var currentIdx=0;
var ids=${JSON.stringify(ids)};
var adShown=false;

window.toggleSrcModal=function(){
  var modal=document.getElementById(ids.srcModal);
  var btn=document.getElementById(ids.srcBtn);
  if(modal.classList.contains('show')){
    modal.classList.remove('show');
    btn.classList.remove('open');
  }else{
    modal.classList.add('show');
    btn.classList.add('open');
  }
};

function buildSources(){
  var grid=document.getElementById(ids.sources);
  if(!grid)return;
  
  if(sources.length===0){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666">Aucune source disponible</div>';
    document.getElementById(ids.player).innerHTML='<div class="no-source"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Aucune source disponible</span></div>';
    return;
  }
  
  grid.innerHTML='';
  for(var i=0;i<sources.length;i++){
    var s=sources[i];
    var card=document.createElement('div');
    card.className='src-card'+(i===currentIdx?' active':'');
    card.setAttribute('data-idx',i);
    
    var lang=(s.language||'VO').toUpperCase();
    var langClass='lang';
    if(lang.includes('VOST'))langClass='vostfr';
    else if(lang.includes('MULTI'))langClass='multi';
    
    card.innerHTML='<div class="src-card-badge">'+(s.quality||'HD')+'</div>'+
      '<div class="src-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>'+
      '<div class="src-card-name">'+s.name+'</div>'+
      '<div class="src-card-tags"><span class="src-tag '+langClass+'">'+lang+'</span></div>';
    
    card.onclick=function(){
      var idx=parseInt(this.getAttribute('data-idx'));
      selectSource(idx);
    };
    
    grid.appendChild(card);
  }
}

function selectSource(idx){
  currentIdx=idx;
  var cards=document.querySelectorAll('.src-card');
  for(var i=0;i<cards.length;i++){
    cards[i].classList.remove('active');
    if(parseInt(cards[i].getAttribute('data-idx'))===idx){
      cards[i].classList.add('active');
    }
  }
  
  // Update button label
  var label=document.getElementById(ids.srcLabel);
  if(label&&sources[idx]){
    var lang=(sources[idx].language||'VO').toUpperCase();
    label.textContent=sources[idx].name+' ['+lang+']';
  }
  
  toggleSrcModal();
  loadPlayer();
}

function loadPlayer(){
  var player=document.getElementById(ids.player);
  if(!player||sources.length===0)return;
  
  var iframe=document.createElement('iframe');
  iframe.src=sources[currentIdx].url;
  iframe.setAttribute('allowfullscreen','true');
  iframe.setAttribute('allow','accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture');
  player.innerHTML='';
  player.appendChild(iframe);
}

function startPlayer(){
  var overlay=document.getElementById(ids.overlay);
  if(overlay)overlay.classList.add('hidden');
  buildSources();
  if(sources.length>0){
    var label=document.getElementById(ids.srcLabel);
    if(label){
      var lang=(sources[0].language||'VO').toUpperCase();
      label.textContent=sources[0].name+' ['+lang+']';
    }
    loadPlayer();
  }
}

function showAdModal(){
  if(!hasAds||!adUrl||adShown){startPlayer();return;}
  
  var overlay=document.createElement('div');
  overlay.className='ad-modal';
  overlay.id=ids.overlay;
  
  overlay.innerHTML='<div class="ad-content">'+
    '<h2>Votre vidéo est prête</h2>'+
    '<p class="ad-sub">Une dernière étape pour accéder au contenu</p>'+
    '<div class="steps"><div class="step active" id="'+ids.step1+'"></div><div class="step" id="'+ids.step2+'"></div><div class="step" id="'+ids.step3+'"></div></div>'+
    '<div class="info-box box-warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div></div>'+
    '<div class="info-box box-heart" id="'+ids.boxHelp+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><div><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div></div>'+
    '<div class="info-box box-time" id="'+ids.boxTime+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><div><b>Temps restant: <span id="'+ids.timer+'">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div></div>'+
    '<div class="info-box box-done hidden" id="'+ids.boxThanks+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><div><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div></div>'+
    '<div class="info-box box-done hidden" id="'+ids.boxDone+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg><div><b>Tout est prêt !</b><span>Cliquez pour lancer la lecture</span></div></div>'+
    '<div class="progress-bar"><div class="progress-fill" id="'+ids.progress+'"></div></div>'+
    '<button class="btn btn-primary" id="'+ids.btnUnlock+'">Continuer<span class="pub-tag">PUB</span></button>'+
    '<button class="btn btn-success hidden" id="'+ids.btnPlay+'">Lancer la vidéo</button>'+
    '<div class="footer-text">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>'+
  '</div>';
  
  document.body.appendChild(overlay);
  
  document.getElementById(ids.btnUnlock).onclick=function(){
    var xhr=new XMLHttpRequest();
    xhr.open('POST','/api/ads/click',true);
    xhr.setRequestHeader('Content-Type','application/json');
    xhr.send(JSON.stringify({adId:adId}));
    window.open(adUrl,'_blank');
    
    this.classList.add('hidden');
    document.getElementById(ids.step1).classList.remove('active');
    document.getElementById(ids.step1).classList.add('done');
    document.getElementById(ids.step2).classList.add('active');
    
    var sec=3,prog=0;
    var iv=setInterval(function(){
      sec--;prog+=33.33;
      var timer=document.getElementById(ids.timer);
      var pbar=document.getElementById(ids.progress);
      if(timer)timer.textContent=sec+' seconde'+(sec>1?'s':'');
      if(pbar)pbar.style.width=Math.min(prog,100)+'%';
      if(sec<=0){
        clearInterval(iv);
        document.getElementById(ids.step2).classList.remove('active');
        document.getElementById(ids.step2).classList.add('done');
        document.getElementById(ids.step3).classList.add('active');
        document.getElementById(ids.boxTime).classList.add('hidden');
        document.getElementById(ids.boxHelp).classList.add('hidden');
        document.getElementById(ids.boxThanks).classList.remove('hidden');
        document.getElementById(ids.boxDone).classList.remove('hidden');
        document.getElementById(ids.progress).style.width='100%';
        document.getElementById(ids.btnPlay).classList.remove('hidden');
      }
    },1000);
  };
  
  document.getElementById(ids.btnPlay).onclick=function(){
    adShown=true;
    startPlayer();
  };
}

showAdModal();
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
  } catch (error) {
    console.error("Streaming API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
