import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request, { params }: { params: Promise<{ wwId: string }> }) {
  try {
    const { wwId } = await params
    const supabase = createAdminClient()

    // Get channel by ww_id
    const { data: channel, error } = await supabase.from("live_tv_channels").select("*").eq("ww_id", wwId).single()

    if (error || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Get sources for this channel
    const { data: sources } = await supabase
      .from("live_tv_sources")
      .select("*")
      .eq("channel_id", channel.id)
      .eq("is_active", true)
      .eq("status", "approved")

    const allSources =
      sources && sources.length > 0
        ? sources.map((s, i) => ({
            name: s.source_name || "Source #" + (i + 1),
            url: s.stream_url,
            quality: s.quality || "HD",
            language: s.language || "VO",
          }))
        : channel.stream_url
          ? [
              {
                name: "Source #1",
                url: channel.stream_url,
                quality: channel.quality || "HD",
                language: channel.language || "VO",
              },
            ]
          : []

    if (allSources.length === 0) {
      return new NextResponse("No sources available for this channel", { status: 404 })
    }

    // Get ads
    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""
    const adId = hasAds ? ads[0].id : ""

    // Log view
    await supabase.from("embed_views").insert({
      ww_id: wwId,
      media_type: "live",
      embed_type: "live",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/'/g, "\\'").replace(/"/g, '\\"')
    const channelName = (channel.channel_name || "Live TV").replace(/"/g, '\\"')
    const channelLogo = channel.channel_logo || ""

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${channelName} - WWEmbed Live</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#fff}

.player-wrap{display:flex;flex-direction:column;width:100%;height:100%;position:relative}

.player-header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:linear-gradient(180deg,rgba(20,20,30,0.98) 0%,rgba(15,15,22,0.98) 100%);border-bottom:1px solid rgba(255,255,255,0.1);position:relative;z-index:10}
.channel-logo{width:36px;height:36px;border-radius:8px;object-fit:contain;background:rgba(255,255,255,0.1)}
.player-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:#fff}
.player-logo svg{width:24px;height:24px;fill:#14b8a6}
.player-logo span{background:linear-gradient(135deg,#14b8a6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.player-title{flex:1;font-size:14px;font-weight:600;color:#e5e5e5;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.live-badge{background:#ef4444;color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;animation:pulse 2s infinite}
.live-badge::before{content:'';width:6px;height:6px;background:#fff;border-radius:50%}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}

.sources-btn{display:flex;align-items:center;gap:8px;padding:8px 14px;background:linear-gradient(135deg,#14b8a6 0%,#06b6d4 100%);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s}
.sources-btn:hover{transform:translateY(-1px);box-shadow:0 4px 15px rgba(20,184,166,0.4)}
.sources-btn svg{width:16px;height:16px}
.sources-btn .label{max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sources-btn .arrow{transition:transform 0.2s}
.sources-btn.open .arrow{transform:rotate(180deg)}

.report-btn{width:36px;height:36px;background:#dc2626;border:none;border-radius:8px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.report-btn svg{width:16px;height:16px}

.player-area{flex:1;background:#000;position:relative;min-height:0}
.player-area video,.player-area iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
.player-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#666;gap:12px}
.player-loading svg{width:48px;height:48px;opacity:0.5}

.sources-modal{position:fixed;inset:0;background:rgba(0,0,0,0.92);display:none;align-items:center;justify-content:center;z-index:100;padding:20px;backdrop-filter:blur(8px)}
.sources-modal.show{display:flex}
.sources-modal-box{background:linear-gradient(180deg,#1c1c2e 0%,#141420 100%);border-radius:16px;width:100%;max-width:750px;max-height:85vh;overflow:hidden;border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column}
.sources-modal-header{padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between}
.sources-modal-title{font-size:20px;font-weight:700;background:linear-gradient(135deg,#14b8a6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sources-modal-subtitle{font-size:13px;color:#888;margin-top:4px}
.sources-modal-close{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s}
.sources-modal-close:hover{background:rgba(255,255,255,0.2)}
.sources-modal-close svg{width:20px;height:20px}
.sources-modal-body{padding:20px 24px;overflow-y:auto;flex:1}

.sources-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:640px){.sources-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:400px){.sources-grid{grid-template-columns:1fr}}

.source-card{background:linear-gradient(135deg,#1e1e30 0%,#18182a 100%);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.2s;position:relative}
.source-card:hover{border-color:rgba(20,184,166,0.5);transform:translateY(-2px)}
.source-card.active{border-color:#14b8a6;background:linear-gradient(135deg,#1a3030 0%,#1a1a2e 100%)}
.source-card-badge{position:absolute;top:12px;right:12px;padding:4px 8px;background:#22c55e;border-radius:6px;font-size:10px;font-weight:700;color:#fff}
.source-card-icon{width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#14b8a6 0%,#06b6d4 100%);display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.source-card-icon svg{width:24px;height:24px;color:#fff}
.source-card-name{font-size:14px;font-weight:600;color:#fff;margin-bottom:8px}
.source-card-tags{display:flex;flex-wrap:wrap;gap:6px}
.source-tag{padding:4px 8px;border-radius:6px;font-size:10px;font-weight:600;text-transform:uppercase;color:#fff}
.source-tag-vf{background:#3b82f6}
.source-tag-vost{background:#f97316}
.source-tag-multi{background:#a855f7}
.source-tag-vo{background:#6b7280}

.ad-overlay{position:fixed;inset:0;background:linear-gradient(135deg,rgba(20,184,166,0.97) 0%,rgba(6,182,212,0.97) 50%,rgba(59,130,246,0.97) 100%);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
.ad-overlay.hidden{display:none}
.ad-box{background:#fff;border-radius:16px;padding:28px;max-width:400px;width:100%;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.3)}
.ad-title{color:#1a1a2e;font-size:20px;font-weight:700;margin-bottom:8px}
.ad-subtitle{color:#6b7280;font-size:13px;margin-bottom:20px}
.ad-steps{display:flex;justify-content:center;gap:10px;margin-bottom:20px}
.ad-step{width:12px;height:12px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.ad-step.active{background:linear-gradient(135deg,#14b8a6,#06b6d4);transform:scale(1.3)}
.ad-step.done{background:#10b981}
.ad-info{border-radius:12px;padding:14px;margin:10px 0;text-align:left;display:flex;align-items:flex-start;gap:12px}
.ad-info svg{flex-shrink:0;width:20px;height:20px;margin-top:2px}
.ad-info-content b{display:block;font-size:14px;margin-bottom:3px}
.ad-info-content span{font-size:12px;opacity:0.8}
.ad-info-warn{background:#fef3c7;border:1px solid #f59e0b;color:#92400e}
.ad-info-heart{background:#fce7f3;border:1px solid #ec4899;color:#9d174d}
.ad-info-time{background:#ccfbf1;border:1px solid #14b8a6;color:#0f766e}
.ad-info-success{background:#d1fae5;border:1px solid #10b981;color:#065f46}
.ad-progress{height:6px;background:#e5e7eb;border-radius:3px;margin:18px 0;overflow:hidden}
.ad-progress-bar{height:100%;width:0;background:linear-gradient(90deg,#14b8a6,#06b6d4,#3b82f6);transition:width 0.3s linear}
.ad-btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;text-transform:uppercase;transition:all 0.2s}
.ad-btn:hover{transform:translateY(-2px)}
.ad-btn-primary{background:linear-gradient(135deg,#14b8a6,#06b6d4);color:#fff}
.ad-btn-success{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.ad-btn .pub-badge{background:#ef4444;color:#fff;padding:3px 8px;border-radius:5px;font-size:10px;margin-left:8px}
.ad-footer{margin-top:16px;font-size:11px;color:#9ca3af}
.ad-footer a{color:#14b8a6;text-decoration:none}
.hidden{display:none !important}

@media(max-width:480px){
  .player-header{padding:10px 12px;gap:8px}
  .channel-logo{width:28px;height:28px}
  .player-logo{font-size:12px}
  .player-logo svg{width:20px;height:20px}
  .player-title{font-size:12px}
  .live-badge{padding:3px 8px;font-size:10px}
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
    <h2 class="ad-title">Votre chaîne est prête</h2>
    <p class="ad-subtitle">Une dernière étape pour accéder au direct</p>
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
      <div class="ad-info-content"><b>Tout est prêt !</b><span>Cliquez pour lancer le direct</span></div>
    </div>
    <div class="ad-progress"><div class="ad-progress-bar" id="progressBar"></div></div>
    <button class="ad-btn ad-btn-primary" id="btnContinue">CONTINUER<span class="pub-badge">PUB</span></button>
    <button class="ad-btn ad-btn-success hidden" id="btnPlay">REGARDER EN DIRECT</button>
    <div class="ad-footer">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
  </div>
</div>
`
    : ""
}

<div class="player-wrap">
  <div class="player-header">
    ${
      channelLogo
        ? `<img src="${channelLogo}" class="channel-logo" alt="${channelName}">`
        : `
    <div class="player-logo">
      <svg viewBox="0 0 24 24"><path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12z"/></svg>
      <span>WWEMBED</span>
    </div>
    `
    }
    <div class="player-title">${channelName}</div>
    <div class="live-badge">LIVE</div>
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
        <div class="sources-modal-subtitle">Sélectionnez un serveur pour regarder le direct</div>
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
  var hlsPlayer = null;

  function getTagClass(lang) {
    var l = (lang || '').toUpperCase();
    if (l.indexOf('VF') >= 0 || l.indexOf('FRAN') >= 0 || l.indexOf('FR') >= 0) return 'source-tag-vf';
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

    if (hlsPlayer) {
      hlsPlayer.destroy();
      hlsPlayer = null;
    }

    var url = src.url;
    
    if (url.indexOf('.m3u8') > -1) {
      var video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.position = 'absolute';
      video.style.top = '0';
      video.style.left = '0';
      video.style.background = '#000';
      area.innerHTML = '';
      area.appendChild(video);

      if (Hls.isSupported()) {
        hlsPlayer = new Hls();
        hlsPlayer.loadSource(url);
        hlsPlayer.attachMedia(video);
        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
          video.play().catch(function(){});
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', function() {
          video.play().catch(function(){});
        });
      }
    } else {
      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('frameborder', '0');
      area.innerHTML = '';
      area.appendChild(iframe);
    }
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
    console.error("Live TV API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
