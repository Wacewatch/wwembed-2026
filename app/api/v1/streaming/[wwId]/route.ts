import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = "https://api.themoviedb.org/3"

function generateRandomId(prefix: string): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: Request, { params }: { params: Promise<{ wwId: string }> }) {
  try {
    const { wwId } = await params
    const supabase = createAdminClient()

    // Parse wwId: ww-movie-123 or ww-tv-123-s1-e2
    const parts = wwId.split("-")
    if (parts.length < 3 || parts[0] !== "ww") {
      return NextResponse.json({ error: "Invalid wwId format" }, { status: 400 })
    }

    const mediaType = parts[1]
    const tmdbId = parts[2]
    let seasonNumber: number | undefined
    let episodeNumber: number | undefined

    if (mediaType === "tv" && parts.length >= 5) {
      seasonNumber = Number.parseInt(parts[3].replace("s", ""))
      episodeNumber = Number.parseInt(parts[4].replace("e", ""))
    }

    // Get TMDB info
    const tmdbUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`
    const tmdbRes = await fetch(tmdbUrl)
    const tmdbData = await tmdbRes.json()

    const title =
      mediaType === "tv" && seasonNumber && episodeNumber
        ? `${tmdbData.name || "Série"} S${seasonNumber}E${episodeNumber}`
        : tmdbData.title || tmdbData.name || "Vidéo"

    // Get streaming APIs
    const { data: apis } = await supabase
      .from("third_party_apis")
      .select("*")
      .eq("is_active", true)
      .eq("status", "approved")

    // Get user links
    const { data: userLinks } = await supabase
      .from("streaming_links")
      .select("*")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("status", "approved")

    // Get ads
    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""
    const adId = hasAds ? ads[0].id : ""

    // Build auto-generated links from APIs
    let anonymousCounter = 0
    const autoLinks = (apis || [])
      .map((api) => {
        let url = ""
        if (mediaType === "movie" && api.url_pattern_movie) {
          url = api.url_pattern_movie.replace("{tmdb_id}", tmdbId)
        } else if (mediaType === "tv" && api.url_pattern_tv) {
          url = api.url_pattern_tv
            .replace("{tmdb_id}", tmdbId)
            .replace("{season}", String(seasonNumber || 1))
            .replace("{episode}", String(episodeNumber || 1))
        }
        url = url.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/g, "")
        const isAnonymous = api.is_anonymous || false
        const language = api.language || "VO"
        if (isAnonymous) anonymousCounter++
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

    const sourcesJson = JSON.stringify(allSources).replace(/'/g, "\\'").replace(/"/g, '\\"')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${title} - WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#fff}

.player-wrap{display:flex;flex-direction:column;width:100%;height:100%;position:relative}

.player-header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:linear-gradient(180deg,rgba(20,20,30,0.98) 0%,rgba(15,15,22,0.98) 100%);border-bottom:1px solid rgba(255,255,255,0.1);position:relative;z-index:10}
.player-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:#fff}
.player-logo svg{width:24px;height:24px;fill:#8b5cf6}
.player-logo span{background:linear-gradient(135deg,#a855f7,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.player-title{flex:1;font-size:14px;font-weight:600;color:#e5e5e5;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.sources-btn{display:flex;align-items:center;gap:8px;padding:8px 14px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s}
.sources-btn:hover{transform:translateY(-1px);box-shadow:0 4px 15px rgba(99,102,241,0.4)}
.sources-btn svg{width:16px;height:16px}
.sources-btn .label{max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sources-btn .arrow{transition:transform 0.2s}
.sources-btn.open .arrow{transform:rotate(180deg)}

.report-btn{width:36px;height:36px;background:#dc2626;border:none;border-radius:8px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.report-btn svg{width:16px;height:16px}

.player-area{flex:1;background:#000;position:relative;min-height:0}
.player-area iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
.player-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#666;gap:12px}
.player-loading svg{width:48px;height:48px;opacity:0.5}

.sources-modal{position:fixed;inset:0;background:rgba(0,0,0,0.92);display:none;align-items:center;justify-content:center;z-index:100;padding:20px;backdrop-filter:blur(8px)}
.sources-modal.show{display:flex}
.sources-modal-box{background:linear-gradient(180deg,#1c1c2e 0%,#141420 100%);border-radius:16px;width:100%;max-width:750px;max-height:85vh;overflow:hidden;border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column}
.sources-modal-header{padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between}
.sources-modal-title{font-size:20px;font-weight:700;background:linear-gradient(135deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sources-modal-subtitle{font-size:13px;color:#888;margin-top:4px}
.sources-modal-close{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s}
.sources-modal-close:hover{background:rgba(255,255,255,0.2)}
.sources-modal-close svg{width:20px;height:20px}
.sources-modal-body{padding:20px 24px;overflow-y:auto;flex:1}
.sources-modal-body::-webkit-scrollbar{width:6px}
.sources-modal-body::-webkit-scrollbar-track{background:transparent}
.sources-modal-body::-webkit-scrollbar-thumb{background:#333;border-radius:3px}

.sources-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:640px){.sources-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:400px){.sources-grid{grid-template-columns:1fr}}

.source-card{background:linear-gradient(135deg,#1e1e30 0%,#18182a 100%);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.2s;position:relative}
.source-card:hover{border-color:rgba(139,92,246,0.5);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.3)}
.source-card.active{border-color:#8b5cf6;background:linear-gradient(135deg,#2d1f50 0%,#1a1a2e 100%)}
.source-card-badge{position:absolute;top:12px;right:12px;padding:4px 8px;background:#22c55e;border-radius:6px;font-size:10px;font-weight:700;color:#fff}
.source-card-icon{width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.source-card-icon svg{width:24px;height:24px;color:#fff}
.source-card-name{font-size:14px;font-weight:600;color:#fff;margin-bottom:8px}
.source-card-tags{display:flex;flex-wrap:wrap;gap:6px}
.source-tag{padding:4px 8px;border-radius:6px;font-size:10px;font-weight:600;text-transform:uppercase;color:#fff}
.source-tag-vf{background:#3b82f6}
.source-tag-vost{background:#f97316}
.source-tag-multi{background:#a855f7}
.source-tag-vo{background:#6b7280}

.ad-overlay{position:fixed;inset:0;background:linear-gradient(135deg,rgba(99,102,241,0.97) 0%,rgba(139,92,246,0.97) 50%,rgba(236,72,153,0.97) 100%);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
.ad-overlay.hidden{display:none}
.ad-box{background:#fff;border-radius:16px;padding:28px;max-width:400px;width:100%;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.3)}
.ad-title{color:#1a1a2e;font-size:20px;font-weight:700;margin-bottom:8px}
.ad-subtitle{color:#6b7280;font-size:13px;margin-bottom:20px}
.ad-steps{display:flex;justify-content:center;gap:10px;margin-bottom:20px}
.ad-step{width:12px;height:12px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.ad-step.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);transform:scale(1.3)}
.ad-step.done{background:#10b981}
.ad-info{border-radius:12px;padding:14px;margin:10px 0;text-align:left;display:flex;align-items:flex-start;gap:12px}
.ad-info svg{flex-shrink:0;width:20px;height:20px;margin-top:2px}
.ad-info-content b{display:block;font-size:14px;margin-bottom:3px}
.ad-info-content span{font-size:12px;opacity:0.8}
.ad-info-warn{background:#fef3c7;border:1px solid #f59e0b;color:#92400e}
.ad-info-heart{background:#fce7f3;border:1px solid #ec4899;color:#9d174d}
.ad-info-time{background:#ede9fe;border:1px solid #8b5cf6;color:#5b21b6}
.ad-info-success{background:#d1fae5;border:1px solid #10b981;color:#065f46}
.ad-progress{height:6px;background:#e5e7eb;border-radius:3px;margin:18px 0;overflow:hidden}
.ad-progress-bar{height:100%;width:0;background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899);transition:width 0.3s linear}
.ad-btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;text-transform:uppercase;transition:all 0.2s}
.ad-btn:hover{transform:translateY(-2px)}
.ad-btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
.ad-btn-success{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.ad-btn .pub-badge{background:#ef4444;color:#fff;padding:3px 8px;border-radius:5px;font-size:10px;margin-left:8px}
.ad-footer{margin-top:16px;font-size:11px;color:#9ca3af}
.ad-footer a{color:#6366f1;text-decoration:none}
.hidden{display:none !important}

@media(max-width:480px){
  .player-header{padding:10px 12px;gap:8px}
  .player-logo{font-size:12px}
  .player-logo svg{width:20px;height:20px}
  .player-title{font-size:12px}
  .sources-btn{padding:6px 10px;font-size:11px}
  .sources-btn .label{max-width:80px}
  .report-btn{width:32px;height:32px}
  .sources-modal-box{border-radius:12px}
  .sources-modal-header{padding:16px}
  .sources-modal-title{font-size:18px}
  .sources-modal-body{padding:16px}
  .source-card{padding:12px}
  .source-card-icon{width:40px;height:40px}
  .ad-box{padding:20px}
  .ad-title{font-size:18px}
}
</style>
</head>
<body>

${
  hasAds
    ? `
<div class="ad-overlay" id="adOverlay">
  <div class="ad-box">
    <h2 class="ad-title">Votre vidéo est prête</h2>
    <p class="ad-subtitle">Une dernière étape pour accéder au contenu</p>
    <div class="ad-steps">
      <div class="ad-step active" id="step1"></div>
      <div class="ad-step" id="step2"></div>
      <div class="ad-step" id="step3"></div>
    </div>
    <div class="ad-info ad-info-warn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div class="ad-info-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
    </div>
    <div class="ad-info ad-info-heart" id="infoHelp">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <div class="ad-info-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
    </div>
    <div class="ad-info ad-info-time" id="infoTime">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div class="ad-info-content"><b>Temps restant: <span id="timer">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div>
    </div>
    <div class="ad-info ad-info-success hidden" id="infoThanks">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="ad-info-content"><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div>
    </div>
    <div class="ad-info ad-info-success hidden" id="infoDone">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <div class="ad-info-content"><b>Tout est prêt !</b><span>Cliquez pour lancer la lecture</span></div>
    </div>
    <div class="ad-progress"><div class="ad-progress-bar" id="progressBar"></div></div>
    <button class="ad-btn ad-btn-primary" id="btnContinue">CONTINUER<span class="pub-badge">PUB</span></button>
    <button class="ad-btn ad-btn-success hidden" id="btnPlay">LANCER LA VIDÉO</button>
    <div class="ad-footer">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
  </div>
</div>
`
    : ""
}

<div class="player-wrap">
  <div class="player-header">
    <div class="player-logo">
      <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
      <span>WWEMBED</span>
    </div>
    <div class="player-title">${title}</div>
    <button class="sources-btn" id="sourcesBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      <span class="label" id="sourcesLabel">Sources</span>
      <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <button class="report-btn" title="Signaler un problème">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </button>
  </div>
  <div class="player-area" id="playerArea">
    <div class="player-loading">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>Chargement...</span>
    </div>
  </div>
</div>

<div class="sources-modal" id="sourcesModal">
  <div class="sources-modal-box">
    <div class="sources-modal-header">
      <div>
        <div class="sources-modal-title">Choisissez votre source</div>
        <div class="sources-modal-subtitle">Sélectionnez un serveur pour commencer la lecture</div>
      </div>
      <button class="sources-modal-close" id="closeSourcesModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sources-modal-body">
      <div class="sources-grid" id="sourcesGrid"></div>
    </div>
  </div>
</div>

<script>
(function(){
  var sources = JSON.parse("${sourcesJson}");
  var adUrl = "${adUrl}";
  var adId = "${adId}";
  var hasAds = ${hasAds};
  var currentIndex = 0;
  var playerStarted = false;

  function getTagClass(lang) {
    var l = (lang || '').toUpperCase();
    if (l.indexOf('VF') >= 0 || l.indexOf('FRAN') >= 0) return 'source-tag-vf';
    if (l.indexOf('VOST') >= 0) return 'source-tag-vost';
    if (l.indexOf('MULTI') >= 0) return 'source-tag-multi';
    return 'source-tag-vo';
  }

  function buildSourcesGrid() {
    var grid = document.getElementById('sourcesGrid');
    if (!grid) return;
    
    if (sources.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666">Aucune source disponible</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      var lang = (s.language || 'VO').toUpperCase();
      var isActive = i === currentIndex ? ' active' : '';
      html += '<div class="source-card' + isActive + '" data-index="' + i + '">';
      html += '<div class="source-card-badge">' + (s.quality || 'HD') + '</div>';
      html += '<div class="source-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>';
      html += '<div class="source-card-name">' + s.name + '</div>';
      html += '<div class="source-card-tags"><span class="source-tag ' + getTagClass(lang) + '">' + lang + '</span></div>';
      html += '</div>';
    }
    grid.innerHTML = html;

    var cards = grid.querySelectorAll('.source-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].addEventListener('click', function() {
        selectSource(parseInt(this.getAttribute('data-index')));
      });
    }
  }

  function selectSource(index) {
    currentIndex = index;
    
    var cards = document.querySelectorAll('.source-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove('active');
      if (parseInt(cards[i].getAttribute('data-index')) === index) {
        cards[i].classList.add('active');
      }
    }

    var label = document.getElementById('sourcesLabel');
    if (label && sources[index]) {
      var lang = (sources[index].language || 'VO').toUpperCase();
      label.textContent = sources[index].name + ' [' + lang + ']';
    }

    toggleSourcesModal();
    loadPlayer();
  }

  function toggleSourcesModal() {
    var modal = document.getElementById('sourcesModal');
    var btn = document.getElementById('sourcesBtn');
    if (modal && btn) {
      if (modal.classList.contains('show')) {
        modal.classList.remove('show');
        btn.classList.remove('open');
      } else {
        modal.classList.add('show');
        btn.classList.add('open');
      }
    }
  }

  function loadPlayer() {
    var area = document.getElementById('playerArea');
    if (!area || sources.length === 0) return;
    
    var src = sources[currentIndex];
    if (!src || !src.url) {
      area.innerHTML = '<div class="player-loading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Source indisponible</span></div>';
      return;
    }

    var iframe = document.createElement('iframe');
    iframe.src = src.url;
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('frameborder', '0');
    area.innerHTML = '';
    area.appendChild(iframe);
  }

  function startPlayer() {
    if (playerStarted) return;
    playerStarted = true;

    var overlay = document.getElementById('adOverlay');
    if (overlay) overlay.classList.add('hidden');

    buildSourcesGrid();
    
    if (sources.length > 0) {
      var label = document.getElementById('sourcesLabel');
      if (label) {
        var lang = (sources[0].language || 'VO').toUpperCase();
        label.textContent = sources[0].name + ' [' + lang + ']';
      }
      loadPlayer();
    }
  }

  // Initialize event listeners
  var sourcesBtn = document.getElementById('sourcesBtn');
  var closeModal = document.getElementById('closeSourcesModal');
  var sourcesModal = document.getElementById('sourcesModal');
  
  if (sourcesBtn) sourcesBtn.addEventListener('click', toggleSourcesModal);
  if (closeModal) closeModal.addEventListener('click', toggleSourcesModal);
  if (sourcesModal) {
    sourcesModal.addEventListener('click', function(e) {
      if (e.target === this) toggleSourcesModal();
    });
  }

  // Handle ads
  if (hasAds && adUrl) {
    var btnContinue = document.getElementById('btnContinue');
    var btnPlay = document.getElementById('btnPlay');

    if (btnContinue) {
      btnContinue.addEventListener('click', function() {
        fetch('/api/ads/click', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({adId: adId})
        }).catch(function(){});

        window.open(adUrl, '_blank');
        this.classList.add('hidden');

        var step1 = document.getElementById('step1');
        var step2 = document.getElementById('step2');
        if (step1) { step1.classList.remove('active'); step1.classList.add('done'); }
        if (step2) step2.classList.add('active');

        var seconds = 3;
        var progress = 0;
        var interval = setInterval(function() {
          seconds--;
          progress += 33.33;

          var timer = document.getElementById('timer');
          var progressBar = document.getElementById('progressBar');
          if (timer) timer.textContent = seconds + ' seconde' + (seconds > 1 ? 's' : '');
          if (progressBar) progressBar.style.width = Math.min(progress, 100) + '%';

          if (seconds <= 0) {
            clearInterval(interval);
            
            var step2El = document.getElementById('step2');
            var step3 = document.getElementById('step3');
            var infoTime = document.getElementById('infoTime');
            var infoHelp = document.getElementById('infoHelp');
            var infoThanks = document.getElementById('infoThanks');
            var infoDone = document.getElementById('infoDone');
            var progressBarEl = document.getElementById('progressBar');

            if (step2El) { step2El.classList.remove('active'); step2El.classList.add('done'); }
            if (step3) step3.classList.add('active');
            if (infoTime) infoTime.classList.add('hidden');
            if (infoHelp) infoHelp.classList.add('hidden');
            if (infoThanks) infoThanks.classList.remove('hidden');
            if (infoDone) infoDone.classList.remove('hidden');
            if (progressBarEl) progressBarEl.style.width = '100%';
            if (btnPlay) btnPlay.classList.remove('hidden');
          }
        }, 1000);
      });
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', startPlayer);
    }
  } else {
    startPlayer();
  }
})();
<\/script>
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
