import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getEpisodeDetails } from "@/lib/tmdb"

export async function GET(request: NextRequest, props: { params: Promise<{ wwId: string }> }) {
  try {
    const params = await props.params
    const { wwId } = params
    if (!wwId) return NextResponse.json({ error: "Missing WW ID" }, { status: 400 })

    const parsed = parseWWId(wwId)
    if (!parsed) return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })

    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed
    const supabase = createAdminClient()

    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
    const activeAds = ads || []
    const hasAds = activeAds.length > 0
    const adsJson = JSON.stringify(activeAds.map((a) => ({ id: a.id, url: a.ad_url }))).replace(/</g, "\\u003c")

    const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)
    let episodeData = null
    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      episodeData = await getEpisodeDetails(tmdbId, seasonNumber, episodeNumber)
    }

    let title = tmdbData ? ("title" in tmdbData ? tmdbData.title : tmdbData.name) : "Unknown Media"
    if (episodeData) title = title + " - S" + seasonNumber + "E" + episodeNumber

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

    const { data: apis } = await supabase
      .from("third_party_apis")
      .select("*, language, is_anonymous")
      .eq("api_type", "streaming")
      .eq("is_active", true)
      .order("priority", { ascending: true })

    let anonymousCounter = 0
    const autoLinks = (apis || [])
      .filter((api) => (mediaType === "movie" ? !!(api.url_pattern_movie || api.url_pattern) : !!api.url_pattern_tv))
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
        if (api.is_anonymous) anonymousCounter++
        return {
          name: api.is_anonymous ? `Source #${anonymousCounter}` : api.name,
          url,
          quality: "HD",
          language: api.language || "VO",
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

    const sourcesJson = JSON.stringify(allSources).replace(/</g, "\\u003c")

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - WWEMBED</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#fff}
.wrap{display:flex;flex-direction:column;height:100%}
.hdr{display:flex;align-items:center;padding:14px 20px;background:linear-gradient(135deg,rgba(15,15,25,0.98),rgba(20,20,35,0.95));border-bottom:2px solid rgba(0,212,170,0.3);gap:14px;backdrop-filter:blur(20px);box-shadow:0 4px 24px rgba(0,0,0,0.4);}
.logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:16px;background:linear-gradient(135deg,#00d4aa,#00a388);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.logo::before{content:'▶';font-size:18px;}
.ttl{flex:1;font-size:15px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:linear-gradient(135deg,#fff,#e0e0e0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.hdr-actions{display:flex;gap:10px}
.btn-modern{display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,rgba(0,212,170,0.15),rgba(0,163,136,0.1));border:2px solid rgba(0,212,170,0.3);border-radius:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);position:relative;overflow:hidden;}
.btn-modern::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,212,170,0.2),rgba(0,163,136,0.15));opacity:0;transition:opacity 0.3s;}
.btn-modern:hover::before{opacity:1;}
.btn-modern:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,212,170,0.4);border-color:rgba(0,212,170,0.6);}
.btn-modern:active{transform:translateY(-1px);}
.btn-icon{font-size:16px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));}
.rpt-btn{background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(220,38,38,0.1));border-color:rgba(239,68,68,0.4);}
.rpt-btn:hover{box-shadow:0 8px 24px rgba(239,68,68,0.4);border-color:rgba(239,68,68,0.6);}

.player{flex:1;background:#000;position:relative}
.player iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.no-src{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#666;gap:12px;font-size:15px;}
.no-src::before{content:'📺';font-size:64px;opacity:0.3;}

.loading-skeleton{position:absolute;inset:0;background:linear-gradient(90deg,#0a0a0f 25%,#1a1a1f 50%,#0a0a0f 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;z-index:10;}
@keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

.modal{position:fixed;inset:0;background:rgba(0,0,0,.94);display:none;align-items:center;justify-content:center;z-index:200;padding:20px;backdrop-filter:blur(12px);}
.modal.sh{display:flex}
.modal-box{background:linear-gradient(135deg,#1a1a28,#12121c);border-radius:20px;width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;border:2px solid rgba(0,212,170,0.2);box-shadow:0 24px 60px rgba(0,0,0,0.8);animation:modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1);}
@keyframes modalIn{from{opacity:0;transform:scale(0.9) translateY(30px);}to{opacity:1;transform:scale(1) translateY(0);}}
.modal-hdr{padding:24px 28px;border-bottom:2px solid rgba(0,212,170,0.2);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(0,212,170,0.1),rgba(0,163,136,0.05));}
.modal-ttl{font-size:22px;font-weight:800;background:linear-gradient(135deg,#00d4aa,#00ffc8);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.modal-sub{font-size:13px;color:#888;margin-top:4px;font-weight:500;}
.modal-close{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer;font-size:24px;transition:all 0.3s;display:flex;align-items:center;justify-content:center;}
.modal-close:hover{background:#ef4444;transform:rotate(90deg) scale(1.1);box-shadow:0 8px 20px rgba(239,68,68,0.5);}
.modal-body{padding:24px 28px;overflow-y:auto;}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:380px){.grid{grid-template-columns:1fr}}

.source-card{background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:2px solid rgba(255,255,255,0.1);border-radius:16px;padding:18px;cursor:pointer;position:relative;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;}
.source-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,212,170,0.15),rgba(0,163,136,0.1));opacity:0;transition:opacity 0.3s;}
.source-card:hover::before{opacity:1;}
.source-card:hover{border-color:rgba(0,212,170,0.5);transform:translateY(-4px) scale(1.02);box-shadow:0 12px 32px rgba(0,212,170,0.3);}
.source-card.act{border-color:#00d4aa;background:linear-gradient(135deg,rgba(0,212,170,0.2),rgba(0,163,136,0.15));box-shadow:0 12px 32px rgba(0,212,170,0.4);transform:scale(1.03);}
.source-card.act::after{content:'✓';position:absolute;top:14px;right:14px;width:32px;height:32px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:16px;box-shadow:0 4px 12px rgba(16,185,129,0.5);}

.card-badge{position:absolute;top:14px;right:14px;padding:5px 12px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:8px;font-size:10px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 4px 12px rgba(139,92,246,0.4);}
.card-icon{width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#00d4aa,#00a388);display:flex;align-items:center;justify-content:center;margin-bottom:14px;color:#fff;font-size:26px;box-shadow:0 6px 20px rgba(0,212,170,0.4);position:relative;}
.card-icon::after{content:'';position:absolute;inset:0;border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,0.3),transparent);opacity:0.6;}
.card-name{font-size:15px;font-weight:700;margin-bottom:10px;color:#fff;}
.card-tags{display:flex;gap:6px;flex-wrap:wrap;}
.tag{padding:4px 10px;border-radius:8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;}
.tag-vf{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 2px 8px rgba(59,130,246,0.3);}
.tag-vost{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;box-shadow:0 2px 8px rgba(249,115,22,0.3);}
.tag-multi{background:linear-gradient(135deg,#a855f7,#9333ea);color:#fff;box-shadow:0 2px 8px rgba(168,85,247,0.3);}
.tag-vo{background:linear-gradient(135deg,#6b7280,#4b5563);color:#fff;box-shadow:0 2px 8px rgba(107,114,128,0.3);}

.rpt-form{display:flex;flex-direction:column;gap:16px}
.rpt-form textarea{width:100%;min-height:120px;background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03));border:2px solid rgba(255,255,255,0.15);border-radius:12px;padding:16px;color:#fff;font-size:14px;resize:vertical;transition:all 0.3s;font-family:inherit;}
.rpt-form textarea:focus{outline:none;border-color:#00d4aa;box-shadow:0 0 0 4px rgba(0,212,170,0.2);background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04));}
.rpt-form textarea::placeholder{color:#666;}
.rpt-form button{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;padding:16px;border-radius:12px;font-weight:800;cursor:pointer;font-size:15px;transition:all 0.3s;text-transform:uppercase;letter-spacing:1px;box-shadow:0 8px 24px rgba(239,68,68,0.4);}
.rpt-form button:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(239,68,68,0.6);}
.rpt-form button:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
.rpt-success{color:#10b981;text-align:center;padding:32px;font-size:16px;font-weight:600;}
.rpt-success::before{content:'✅';display:block;font-size:64px;margin-bottom:16px;}

.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.96),rgba(118,75,162,0.96));display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;backdrop-filter:blur(12px)}
.mc{background:rgba(255,255,255,0.98);border-radius:24px;padding:36px;max-width:460px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.6);}
.mc h2{color:#1a1a2e;margin-bottom:12px;font-size:24px;font-weight:800}
.mc-sub{color:#6b7280;font-size:14px;margin-bottom:20px}
.ad-counter{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:800;display:inline-block;margin-bottom:16px;box-shadow:0 4px 12px rgba(102,126,234,0.4);}
.steps{display:flex;justify-content:center;gap:12px;margin-bottom:20px}
.step{width:14px;height:14px;border-radius:50%;background:#e5e7eb;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1)}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.4);box-shadow:0 4px 16px rgba(102,126,234,0.5);}
.step.done{background:#10b981;box-shadow:0 4px 16px rgba(16,185,129,0.5);}
.bx{border-radius:14px;padding:18px;margin:12px 0;text-align:left;display:flex;align-items:flex-start;gap:14px;border:2px solid;}
.bx svg{width:26px;height:26px;flex-shrink:0}
.bx-content{flex:1}
.bx b{display:block;font-size:16px;margin-bottom:6px;font-weight:800}
.bx span{font-size:13px;opacity:0.85;display:block;line-height:1.5;}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border-color:#f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-color:#8b5cf6;color:#5b21b6}
.pg{background:#e5e7eb;border-radius:4px;margin:18px 0;overflow:hidden;height:8px}
.bt{width:100%;padding:18px;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;margin-top:12px;text-transform:uppercase;letter-spacing:1px;transition:all 0.3s;box-shadow:0 8px 24px rgba(0,0,0,0.3);}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bp:hover{transform:translateY(-3px);box-shadow:0 12px 36px rgba(102,126,234,0.6);}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.bn:hover{transform:translateY(-3px);box-shadow:0 12px 36px rgba(16,185,129,0.6);}
.hi{display:none}
.cf{margin-top:18px;font-size:12px;color:#9ca3af}
.cf a{color:#667eea;font-weight:700;text-decoration:none;}
.tg{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;padding:4px 10px;border-radius:8px;font-size:11px;margin-left:10px;font-weight:800;box-shadow:0 2px 8px rgba(139,92,246,0.4);}

.connection-badge{position:absolute;top:16px;left:16px;background:rgba(0,0,0,0.8);color:#fff;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;z-index:60;backdrop-filter:blur(10px);border:2px solid;animation:fadeIn 0.5s;}
.connection-badge.good{border-color:#10b981;}
.connection-badge.medium{border-color:#f59e0b;}
.connection-badge.poor{border-color:#ef4444;}
.connection-dot{width:10px;height:10px;border-radius:50%;background:#10b981;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.7;transform:scale(1.2);}}
@keyframes fadeIn{from{opacity:0;transform:translateX(-20px);}to{opacity:1;transform:translateX(0);}}

@media(max-width:768px){
.hdr{padding:12px 16px;flex-wrap:wrap;}
.ttl{font-size:13px;}
.btn-modern{padding:8px 12px;font-size:12px;}
.grid{gap:10px;}
.source-card{padding:14px;}
.modal-box{max-width:calc(100% - 24px);}
}
</style>

<!-- Histats.com START -->
<script type="text/javascript">
  var _Hasync = _Hasync || [];
  _Hasync.push(['Histats.start', '1,4996171,4,0,0,0,00010000']);
  _Hasync.push(['Histats.fasi', '1']);
  _Hasync.push(['Histats.track_hits', '']);

  (function() {
    var hs = document.createElement('script');
    hs.type = 'text/javascript';
    hs.async = true;
    hs.src = '//s10.histats.com/js15_as.js';
    (document.head || document.body).appendChild(hs);
  })();
</script>
<noscript>
  <a href="/" target="_blank">
    <img src="//sstatic1.histats.com/0.gif?4996171&101" alt="histats" />
  </a>
</noscript>
<!-- Histats.com END -->

</head>
<body>
<div class="mo" id="adOverlay">
<div class="mc">
<h2>🎬 Accéder au contenu</h2>
<div class="mc-sub">Une dernière étape pour profiter du streaming</div>
<div class="ad-counter" id="adCounter">Pub 1/1</div>
<div class="steps"><div class="step active" id="step1"></div><div class="step" id="step2"></div><div class="step" id="step3"></div></div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer l'expérience</span></div>
</div>
<div class="bx bh" id="boxSupport">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic aide à maintenir le service accessible à tous</span></div>
</div>
<button class="bt bp" id="btnContinue">Continuer<span class="tg">PUB</span></button>
<button class="bt bn hi" id="btnPlay">▶️ Lancer le lecteur</button>
<div class="pg"></div>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>
<div class="wrap">
<div class="hdr">
<div class="logo">WWEMBED</div>
<div class="ttl">${title}</div>
<div class="hdr-actions">
<button class="btn-modern" id="srcBtn"><span class="btn-icon">☰</span> <span id="srcLabel">Source #1</span></button>
<button class="btn-modern rpt-btn" id="rptBtn" title="Signaler un problème"><span class="btn-icon">⚠️</span></button>
</div>
</div>
<div class="player" id="player">
<div class="connection-badge" id="connectionBadge" style="display:none;">
<div class="connection-dot"></div>
<span id="connectionText">Connexion rapide</span>
</div>
<div class="loading-skeleton"></div>
<div class="no-src">Initialisation...</div>
</div>
</div>
<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr">
<div>
<div class="modal-ttl">🎬 Choisir un lecteur</div>
<div class="modal-sub">Sélectionnez la source qui fonctionne le mieux</div>
</div>
<button class="modal-close" id="closeModal">×</button>
</div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div>
</div>
<div class="modal" id="rptModal">
<div class="modal-box">
<div class="modal-hdr">
<div>
<div class="modal-ttl" style="background:linear-gradient(135deg,#ef4444,#ff6b6b);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">⚠️ Signaler un problème</div>
<div class="modal-sub">Aidez-nous à améliorer la qualité du service</div>
</div>
<button class="modal-close" id="rptClose">×</button>
</div>
<div class="modal-body">
<div class="rpt-form" id="rptForm">
<p style="color:#94a3b8;font-size:14px;margin-bottom:12px;line-height:1.6;">💬 Décrivez précisément le problème rencontré avec cette source (vidéo qui ne charge pas, qualité médiocre, buffering constant, etc.)</p>
<textarea id="rptMsg" placeholder="Exemple: La vidéo se charge très lentement et se coupe toutes les 30 secondes..."></textarea>
<button type="button" id="rptSubmit">📤 Envoyer le signalement</button>
</div>
<div class="rpt-success hi" id="rptSuccess">
Merci pour votre signalement !<br>Nous allons examiner ce problème rapidement.
</div>
</div>
</div>
<script>
(function(){
var _src=${sourcesJson};
var _ads=${adsJson};
var _hasAds=${hasAds};
var _adIndex=0;
var _idx=0;
var _started=false;
var _wwId="${wwId}";
var _title="${title.replace(/"/g, '\\"')}";
var _mediaType="${mediaType}";
var _tmdbId=${tmdbId};
var _seasonNumber=${seasonNumber ?? "null"};
var _episodeNumber=${episodeNumber ?? "null"};
var _retryCount=0;
var _maxRetries=2;

function $(id){return document.getElementById(id);}

function detectConnection(){
  var conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  var badge=$('connectionBadge');
  var text=$('connectionText');
  var dot=badge?badge.querySelector('.connection-dot'):null;
  
  if(!badge)return;
  
  badge.style.display='flex';
  
  if(conn){
    var type=conn.effectiveType;
    if(type==='4g'||type==='5g'){
      badge.className='connection-badge good';
      if(dot)dot.style.background='#10b981';
      if(text)text.textContent='Connexion rapide';
    }else if(type==='3g'){
      badge.className='connection-badge medium';
      if(dot)dot.style.background='#f59e0b';
      if(text)text.textContent='Connexion moyenne';
    }else{
      badge.className='connection-badge poor';
      if(dot)dot.style.background='#ef4444';
      if(text)text.textContent='Connexion lente';
    }
  }
  
  setTimeout(function(){
    if(badge)badge.style.display='none';
  },4000);
}

function saveLastSource(idx){
  try{
    localStorage.setItem('lastSource_${wwId}',idx);
  }catch(e){}
}

function getLastSource(){
  try{
    return parseInt(localStorage.setItem('lastSource_${wwId}'))||0;
  }catch(e){
    return 0;
  }
}

function openAdPopup(url){
  if(!url)return null;
  
  var methods=[
    function(){return window.open(url,'_blank','noopener,noreferrer');},
    function(){
      var a=document.createElement('a');
      a.href=url;
      a.target='_blank';
      a.rel='noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    },
    function(){
      var form=document.createElement('form');
      form.method='GET';
      form.action=url;
      form.target='_blank';
      form.style.display='none';
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      return true;
    }
  ];
  
  for(var i=0;i<methods.length;i++){
    try{
      var result=methods[i]();
      if(result)return result;
    }catch(e){
      console.log('Method '+i+' failed:',e);
    }
  }
  
  window.location.href=url;
  return null;
}

function tagClass(l){
  l=(l||"").toUpperCase();
  if(l.indexOf("VF")>=0||l.indexOf("FRENCH")>=0||l.indexOf("FRANÇAIS")>=0)return"tag-vf";
  if(l.indexOf("VOST")>=0)return"tag-vost";
  if(l.indexOf("MULTI")>=0)return"tag-multi";
  return"tag-vo";
}

function buildGrid(){
  var g=$("srcGrid");
  if(!g)return;
  if(!_src||!_src.length){
    g.innerHTML="<div style='grid-column:1/-1;text-align:center;padding:40px;color:#666;font-size:15px;'>❌ Aucune source disponible pour ce contenu</div>";
    return;
  }
  g.innerHTML="";
  for(var i=0;i<_src.length;i++){
    (function(index){
      var s=_src[index];
      var d=document.createElement("div");
      d.className="source-card"+(index===_idx?" act":"");
      d.innerHTML="<div class='card-badge'>"+(s.quality||"HD")+"</div><div class='card-icon'>▶</div><div class='card-name'>"+s.name+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
      d.onclick=function(){
        _idx=index;
        saveLastSource(index);
        var cards=document.querySelectorAll(".source-card");
        for(var j=0;j<cards.length;j++){cards[j].classList.toggle("act",j===index);}
        $("srcLabel").textContent=s.name;
        toggleModal("srcModal");
        if(_started){
          _retryCount=0;
          loadPlayer();
        }
      };
      g.appendChild(d);
    })(i);
  }
}

function toggleModal(id){
  var m=$(id);
  if(m)m.classList.toggle("sh");
}

function loadPlayer(){
  var p=$("player");
  if(!p||!_src||!_src.length)return;
  var s=_src[_idx];
  if(!s||!s.url){
    p.innerHTML="<div class='no-src'>❌ Source indisponible</div>";
    if(_retryCount<_maxRetries&&_idx<_src.length-1){
      _retryCount++;
      _idx++;
      setTimeout(loadPlayer,1500);
    }
    return;
  }
  
  var skeleton=p.querySelector('.loading-skeleton');
  if(skeleton)skeleton.style.display='block';
  
  setTimeout(function(){
    p.innerHTML='<iframe src="'+s.url+'" allowfullscreen allow="autoplay;fullscreen;encrypted-media;picture-in-picture"></iframe>';
  },300);
}

function startPlayer(){
  var overlay=document.getElementById("adOverlay");
  if(overlay){
    overlay.style.display="none";
    overlay.classList.add("hi");
  }
  if(_src.length>0&&!_started){
    _started=true;
    detectConnection();
    _idx=getLastSource();
    if(_idx>=_src.length)_idx=0;
    $("srcLabel").textContent=_src[_idx].name;
    buildGrid();
    loadPlayer();
  }
}

function updateAdCounter(){
  var el=$("adCounter");
  if(el)el.textContent="Pub "+(_adIndex+1)+"/"+_ads.length;
}

function processAd(){
  if(_adIndex>=_ads.length){
    startPlayer();
    return;
  }
  
  var ad=_ads[_adIndex];
  
  fetch("/api/ads/click",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({adId:ad.id})
  }).catch(function(){});
  
  openAdPopup(ad.url);
  
  var s1=$("step1"),s2=$("step2"),s3=$("step3");
  var boxSupport=$("boxSupport");
  var btnContinue=$("btnContinue"),btnPlay=$("btnPlay");
  
  if(s1){s1.classList.remove("active");s1.classList.add("done");}
  if(s2){s2.classList.remove("active");s2.classList.add("done");}
  if(s3){s3.classList.add("active");s3.classList.add("done");}
  if(boxSupport)boxSupport.style.opacity="0.5";
  if(btnContinue)btnContinue.classList.add("hi");
  if(btnPlay)btnPlay.classList.remove("hi");
  
  _adIndex++;
}

var srcBtn=$("srcBtn");
var closeModal=$("closeModal");
var srcModal=$("srcModal");
if(srcBtn)srcBtn.onclick=function(){toggleModal("srcModal")};
if(closeModal)closeModal.onclick=function(){toggleModal("srcModal")};
if(srcModal)srcModal.onclick=function(e){if(e.target===srcModal)toggleModal("srcModal");};

var rptBtn=$("rptBtn");
var rptModal=$("rptModal");
var rptClose=$("rptClose");
var rptSubmit=$("rptSubmit");
var rptMsg=$("rptMsg");
var rptForm=$("rptForm");
var rptSuccess=$("rptSuccess");

if(rptBtn)rptBtn.onclick=function(){toggleModal("rptModal")};
if(rptClose)rptClose.onclick=function(){toggleModal("rptModal")};
if(rptModal)rptModal.onclick=function(e){if(e.target===rptModal)toggleModal("rptModal");};
if(rptSubmit)rptSubmit.onclick=function(){
  var msg=rptMsg.value.trim();
  if(!msg){alert("⚠️ Veuillez décrire le problème");return}
  rptSubmit.disabled=true;
  rptSubmit.textContent="📤 Envoi en cours...";
  var currentSource=_src[_idx]||{};
  fetch("/api/bug-reports",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({wwId:_wwId,mediaType:_mediaType,tmdbId:_tmdbId,seasonNumber:_seasonNumber,episodeNumber:_episodeNumber,title:_title,sourceName:currentSource.name||"",sourceUrl:currentSource.url||"",message:msg,embedType:"streaming"})
  }).then(function(r){return r.json()}).then(function(){
    rptForm.classList.add("hi");
    rptSuccess.classList.remove("hi");
    setTimeout(function(){
      toggleModal("rptModal");
      rptForm.classList.remove("hi");
      rptSuccess.classList.add("hi");
      rptMsg.value="";
      rptSubmit.disabled=false;
      rptSubmit.textContent="📤 Envoyer le signalement";
    },2500);
  }).catch(function(){
    alert("❌ Erreur lors de l'envoi");
    rptSubmit.disabled=false;
    rptSubmit.textContent="📤 Envoyer le signalement";
  });
};

document.addEventListener("keydown",function(e){
  if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;
  
  if(e.code==='Space'){
    e.preventDefault();
    var iframe=$('player').querySelector('iframe');
    if(iframe){
      try{
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}','*');
      }catch(ex){}
    }
  }else if(e.code==='KeyF'){
    e.preventDefault();
    var p=$('player');
    if(p){
      if(!document.fullscreenElement){
        if(p.requestFullscreen)p.requestFullscreen();
        else if(p.webkitRequestFullscreen)p.webkitRequestFullscreen();
      }else{
        if(document.exitFullscreen)document.exitFullscreen();
        else if(document.webkitExitFullscreen)document.webkitExitFullscreen();
      }
    }
  }else if(e.code==='Escape'){
    document.querySelectorAll('.modal.sh').forEach(function(m){m.classList.remove('sh');});
  }
});

document.addEventListener("DOMContentLoaded",function(){
  buildGrid();
  
  var btnContinue=document.getElementById("btnContinue");
  var btnPlay=document.getElementById("btnPlay");
  
  if(btnContinue){
    btnContinue.addEventListener("click",function(e){
      e.preventDefault();
      processAd();
    });
  }
  
  if(btnPlay){
    btnPlay.addEventListener("click",function(e){
      e.preventDefault();
      startPlayer();
    });
  }
  
  if(_hasAds&&_ads.length>0){
    var overlay=document.getElementById("adOverlay");
    if(overlay)overlay.style.display="flex";
    updateAdCounter();
  }else{
    if(_src.length>0){
      _started=true;
      detectConnection();
      _idx=getLastSource();
      if(_idx>=_src.length)_idx=0;
      $("srcLabel").textContent=_src[_idx].name;
      buildGrid();
      loadPlayer();
    }
  }
});
})();
</script>
</body>
</html>`

    return new NextResponse(html,{headers:{"Content-Type":"text/html; charset=utf-8"}})
  }catch{
    return NextResponse.json({error:"Internal server error"},{status:500})
  }
}
