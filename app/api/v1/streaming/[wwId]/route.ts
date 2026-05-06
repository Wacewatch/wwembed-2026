import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getEpisodeDetails } from "@/lib/tmdb"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, props: { params: Promise<{ wwId: string }> }) {
  try {
    const params = await props.params
    const { wwId } = params
    if (!wwId) return NextResponse.json({ error: "Missing WW ID" }, { status: 400 })

    const parsed = parseWWId(wwId)
    if (!parsed) return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })

    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed
    const supabase = createAdminClient()

    const AD_URL_1 = "https://otieu.com/4/9248013"
    const AD_URL_2 = "https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5"

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
          type: "api",
          source_type: null,
          sub: null,
        }
      })
      .filter((link) => link.url && link.url.length > 0)

    const allSources = [
      ...(userLinks || []).map((l, i) => ({
        name: l.source_name || "Source #" + (i + 1),
        url: l.source_url,
        quality: l.quality || "HD",
        language: l.language || "VO",
        type: "db",
        source_type: l.source_type || null,
        sub: l.subtitle || null,
      })),
      ...autoLinks,
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

    const ids = {
      overlay: generateRandomId("m"),
      progress: generateRandomId("g"),
      btnUnlock1: generateRandomId("u1"),
      btnUnlock2: generateRandomId("u2"),
      boxHelp: generateRandomId("bh"),
      boxThanks: generateRandomId("bk"),
      boxDone: generateRandomId("bd"),
      step1: generateRandomId("s1"),
      step2: generateRandomId("s2"),
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - WWEMBED</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#fff}
.wrap{display:flex;flex-direction:column;height:100%}

/* ── Header ── */
.hdr{display:flex;align-items:center;padding:10px 14px;background:#151520;border-bottom:1px solid #222;gap:12px;flex-shrink:0}
.logo{font-weight:700;font-size:13px;color:#00d4aa;letter-spacing:.02em;flex-shrink:0}
.ttl{flex:1;font-size:13px;font-weight:500;color:#ccc;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.top-right{display:flex;gap:8px;flex-shrink:0}
.src-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;background:#00d4aa;border:none;border-radius:8px;color:#003d30;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0}
.src-btn svg{width:14px;height:14px;flex-shrink:0}
.bug-btn{display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#ef4444;border:none;border-radius:8px;color:#fff;font-size:16px;cursor:pointer;flex-shrink:0}

/* ── Player ── */
.player{flex:1;background:#000;position:relative}
.player iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.no-src{display:flex;align-items:center;justify-content:center;height:100%;color:#333;font-size:14px}

/* ── Overlay & Sheet ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;align-items:flex-end;justify-content:center;z-index:100;padding:0;backdrop-filter:blur(6px)}
.overlay.sh{display:flex}
.sheet{background:#13131f;border-radius:20px 20px 0 0;width:100%;max-width:720px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.08);border-bottom:none;animation:slideUp .22s ease-out}
@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}

/* ── Sheet header ── */
.sheet-hdr{padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.sheet-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.sheet-ttl{font-size:15px;font-weight:700;color:#e8e8f0}
.src-count{font-size:11px;font-weight:500;color:#555;margin-left:8px}
.close-btn{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#aaa;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;line-height:1;transition:background .15s}
.close-btn:hover{background:rgba(255,255,255,.18)}

/* ── Language filters ── */
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.filter-label{font-size:11px;color:#555;font-weight:500;margin-right:2px;flex-shrink:0}
.filter-pill{padding:5px 13px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#666;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.filter-pill:hover{border-color:rgba(255,255,255,.2);color:#aaa}
.filter-pill.act{background:#00d4aa;border-color:#00d4aa;color:#003d30}

/* ── Sheet body ── */
.sheet-body{padding:16px 16px 24px;overflow-y:auto;flex:1}
.sheet-body::-webkit-scrollbar{width:4px}
.sheet-body::-webkit-scrollbar-track{background:transparent}
.sheet-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}

/* ── Section labels ── */
.section-wrap{margin-bottom:20px}
.section-label{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;padding-left:2px}
.section-label svg{width:12px;height:12px;opacity:.7}
.section-count{background:rgba(255,255,255,.07);border-radius:4px;padding:1px 6px;font-size:9px;color:#555}

/* ── Source cards ── */
.src-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:9px}
.card{background:#1a1a2e;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:13px 14px;cursor:pointer;transition:border-color .15s,background .15s;position:relative;overflow:hidden}
.card:hover{border-color:rgba(0,212,170,.3);background:#1c1c35}
.card.act{border-color:#00d4aa;background:#0d2420}
.card.act::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:#00d4aa}

/* active checkmark */
.card-check{position:absolute;top:10px;right:10px;width:18px;height:18px;border-radius:50%;background:#00d4aa;display:none;align-items:center;justify-content:center}
.card.act .card-check{display:flex}
.card-check svg{width:10px;height:10px;color:#003d30}

/* badge */
.card-badge{display:inline-flex;align-items:center;gap:4px;border-radius:5px;padding:2px 7px;margin-bottom:9px;font-size:10px;font-weight:700;letter-spacing:.02em}
.badge-db{background:rgba(250,204,21,.12);border:1px solid rgba(250,204,21,.22);color:#facc15}
.badge-dot-db{width:5px;height:5px;border-radius:50%;background:#facc15;flex-shrink:0}
.badge-api{background:rgba(0,212,170,.1);border:1px solid rgba(0,212,170,.18);color:#00d4aa}
.badge-dot-api{width:5px;height:5px;border-radius:50%;background:#00d4aa;flex-shrink:0}

/* card name */
.card-name{font-size:12px;font-weight:600;color:#d0d0e8;margin-bottom:9px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;padding-right:20px}

/* metadata tags */
.card-meta{display:flex;gap:5px;flex-wrap:wrap}
.tag{padding:3px 7px;border-radius:5px;font-size:10px;font-weight:600;line-height:1}
.tag-q{background:rgba(124,58,237,.22);color:#a78bfa;border:1px solid rgba(124,58,237,.18)}
.tag-l{background:rgba(14,165,233,.18);color:#67d8f7;border:1px solid rgba(14,165,233,.14)}
.tag-sub{background:rgba(74,222,128,.14);color:#4ade80;border:1px solid rgba(74,222,128,.12)}
.tag-src{background:rgba(251,146,60,.14);color:#fb923c;border:1px solid rgba(251,146,60,.12)}
.tag-4k{background:rgba(250,204,21,.14);color:#facc15;border:1px solid rgba(250,204,21,.12)}

/* empty state */
.empty-state{text-align:center;padding:36px 20px;color:#444}
.empty-icon{font-size:36px;margin-bottom:10px}
.empty-txt{font-size:13px;color:#444}

/* ── Bug modal ── */
.bug-overlay{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:200;padding:16px}
.bug-overlay.sh{display:flex}
.bug-form{background:#1a1a28;border-radius:14px;padding:24px;max-width:500px;width:100%;border:1px solid rgba(255,255,255,.1)}
.bug-form h3{color:#00d4aa;margin-bottom:16px;font-size:16px;font-weight:700}
.form-group{margin-bottom:14px}
.form-group label{display:block;margin-bottom:6px;font-size:12px;color:#aaa;font-weight:500}
.form-group select,.form-group textarea{width:100%;background:#0f0f1a;border:1px solid rgba(255,255,255,.1);color:#fff;padding:10px;border-radius:8px;font-size:13px;font-family:inherit}
.form-group textarea{min-height:80px;resize:vertical}
.bug-actions{display:flex;gap:10px;margin-top:16px}
.bug-actions button{flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}
.bug-submit{background:#00d4aa;color:#003d30}
.bug-cancel{background:rgba(255,255,255,.08);color:#ccc}

/* ── Ad modal ── */
.mo{position:fixed;inset:0;background:rgba(20,25,40,0.88);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(10px)}
.mo.sh{display:flex}
.mc{background:#1e2535;border:1px solid #2e3a50;border-radius:16px;padding:24px;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.35);max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch}
.mc h2{color:#dde4f0;margin-bottom:8px;font-size:20px;font-weight:700}
.mc-sub{color:#8894aa;font-size:13px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#2a3550;transition:all .3s}
.step.active{background:#667eea;transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px;min-width:18px}
.bx-content{flex:1;min-width:0}
.bx-content b{display:block;font-size:14px;margin-bottom:2px;color:#e2e8f0}
.bx-content span{font-size:12px;opacity:.65;display:block;word-break:break-word}
.bw{background:#272215;border:1px solid #40341a;color:#c9972e}
.bh{background:#271520;border:1px solid #402030;color:#b06890}
.bi{background:#1e1a2e;border:1px solid #302848;color:#8a7ab8}
.bo{background:#152218;border:1px solid #1e3a22;color:#3dba6a}
.pb{height:4px;background:#2e3a50;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width .3s;border-radius:3px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:.5px;transition:all .2s;text-decoration:none;display:block;text-align:center}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bp2{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:11px;color:#4a5570}
.cf a{color:#667eea;text-decoration:none}
.adtag{background:#2a3550;color:#8ba3d4;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px;font-weight:600}
.adtag2{background:#2a3550;color:#f87171;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px;font-weight:600}

/* ── Responsive ── */
@media(max-width:480px){
  /* Header */
  .hdr{padding:8px 10px;gap:8px}
  .ttl{font-size:12px}
  .src-btn{padding:6px 10px;font-size:11px;gap:4px}
  .bug-btn{width:30px;height:30px;font-size:14px}

  /* Sheet */
  .sheet{max-height:92vh;border-radius:16px 16px 0 0}
  .sheet-hdr{padding:14px 14px 12px}
  .sheet-ttl{font-size:14px}
  .sheet-body{padding:12px 12px 20px}

  /* Cards grid — 2 colonnes */
  .src-grid{grid-template-columns:1fr 1fr;gap:7px}
  .card{padding:10px 11px;border-radius:10px}
  .card-name{font-size:11px;margin-bottom:7px}
  .card-badge{font-size:9px;padding:2px 6px;margin-bottom:7px}
  .tag{font-size:9px;padding:2px 5px}
  .card-check{width:16px;height:16px;top:8px;right:8px}
  .card-check svg{width:8px;height:8px}

  /* Filter pills */
  .filter-pill{padding:4px 10px;font-size:11px}

  /* Ad modal */
  .mo{padding:8px;align-items:center}
  .mc{padding:16px;border-radius:14px;max-height:92vh}
  .mc h2{font-size:17px;margin-bottom:6px}
  .mc-sub{font-size:12px;margin-bottom:12px}
  .bx{padding:9px;gap:8px;margin:6px 0;border-radius:9px}
  .bx svg{width:16px;height:16px;min-width:16px}
  .bx-content b{font-size:13px}
  .bx-content span{font-size:11px}
  .bt{padding:11px;font-size:13px;border-radius:9px;margin-top:6px}
  .pb{margin:10px 0}
  .steps{margin-bottom:12px}
  .cf{font-size:10px;margin-top:10px}

  /* Bug form */
  .bug-form{padding:18px;border-radius:12px}
  .bug-form h3{font-size:15px;margin-bottom:14px}
}

@media(max-width:360px){
  /* Cards grid — 1 colonne sur très petits écrans */
  .src-grid{grid-template-columns:1fr}

  /* Masquer le texte du bouton source, garder l'icône */
  .src-btn-text{display:none}
  .src-btn{padding:6px 8px}

  /* Ad modal encore plus compact */
  .mc{padding:14px}
  .mc h2{font-size:15px}
  .bx{padding:8px;gap:6px}
  .bx-content b{font-size:12px}
  .bx-content span{font-size:10px}
  .bt{font-size:12px;padding:10px;letter-spacing:.3px}
  .adtag,.adtag2{display:none}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="logo">▶ WW</div>
    <div class="ttl">${title}</div>
    <div class="top-right">
      <button class="src-btn" id="srcBtn" onclick="openSheet()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span class="src-btn-text" id="srcLabel">Source #1</span>
      </button>
      <button class="bug-btn" id="bugBtn" onclick="openBug()" title="Signaler un problème">🐛</button>
    </div>
  </div>
  <div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>

<!-- Source selector sheet -->
<div class="overlay" id="overlay" onclick="onOverlayClick(event)">
  <div class="sheet" id="sheet">
    <div class="sheet-hdr">
      <div class="sheet-top">
        <div>
          <span class="sheet-ttl">Choisir un lecteur</span>
          <span class="src-count" id="srcCount"></span>
        </div>
        <button class="close-btn" onclick="closeSheet()">×</button>
      </div>
      <div class="filters" id="filtersRow">
        <span class="filter-label">Langue</span>
      </div>
    </div>
    <div class="sheet-body" id="sheetBody"></div>
  </div>
</div>

<!-- Bug report modal -->
<div class="bug-overlay" id="bugOverlay">
  <div class="bug-form">
    <h3>🐛 Signaler un problème</h3>
    <div class="form-group">
      <label>Type de problème</label>
      <select id="bugType">
        <option value="ne_charge_pas">Ne charge pas</option>
        <option value="qualite_mauvaise">Qualité mauvaise</option>
        <option value="audio_desync">Audio désynchronisé</option>
        <option value="sous_titres">Problème sous-titres</option>
        <option value="autre">Autre</option>
      </select>
    </div>
    <div class="form-group">
      <label>Description (optionnel)</label>
      <textarea id="bugDesc" placeholder="Décrivez le problème..."></textarea>
    </div>
    <div class="bug-actions">
      <button class="bug-cancel" onclick="closeBug()">Annuler</button>
      <button class="bug-submit" onclick="submitBug()">Envoyer</button>
    </div>
  </div>
</div>

<!-- Ad modal -->
<div class="mo" id="${ids.overlay}">
  <div class="mc">
    <h2>Accéder au lecteur</h2>
    <div class="mc-sub">Deux étapes pour débloquer le contenu</div>
    <div class="steps">
      <div class="step active" id="${ids.step1}"></div>
      <div class="step" id="${ids.step2}"></div>
    </div>
    <div class="bx bw">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
    </div>
    <div class="bx bh" id="${ids.boxHelp}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
    </div>
    <div class="bx bi" id="${ids.boxThanks}" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="bx-content"><b>Étape 1 validée !</b><span>Cliquez sur le 2ème bouton pour continuer</span></div>
    </div>
    <div class="bx bo" id="${ids.boxDone}" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="bx-content"><b>Tout est prêt !</b><span>Cliquez pour lancer le lecteur</span></div>
    </div>
    <div class="pb"><div class="pf" id="${ids.progress}"></div></div>
    <button class="bt bp" id="${ids.btnUnlock1}">ÉTAPE 1 / 2<span class="adtag">PUB</span></button>
    <button class="bt bp2 hi" id="${ids.btnUnlock2}">ÉTAPE 2 / 2<span class="adtag2">PUB</span></button>
    <div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
  </div>
</div>

<script>
(function(){
var _src=${sourcesJson};
var _idx=0;
var _started=false;
var _adStep=0;
var _currentLang="all";
var _ids=${JSON.stringify(ids)};

function $$(id){return document.getElementById(id);}

/* ── Collect available languages ── */
function getLanguages(){
  var langs=[];
  var seen={};
  for(var i=0;i<_src.length;i++){
    var l=_src[i].language||"";
    if(l&&!seen[l]){seen[l]=1;langs.push(l);}
  }
  return langs;
}

/* ── Build language filter pills ── */
function buildFilters(){
  var row=$$("filtersRow");
  var langs=getLanguages();
  var label=row.querySelector(".filter-label");
  row.innerHTML="";
  row.appendChild(label);

  var allPill=document.createElement("button");
  allPill.className="filter-pill act";
  allPill.textContent="Toutes";
  allPill.setAttribute("data-lang","all");
  allPill.onclick=function(){setLang("all");};
  row.appendChild(allPill);

  langs.forEach(function(lang){
    var pill=document.createElement("button");
    pill.className="filter-pill";
    pill.textContent=lang;
    pill.setAttribute("data-lang",lang);
    pill.onclick=function(){setLang(lang);};
    row.appendChild(pill);
  });
}

function setLang(lang){
  _currentLang=lang;
  document.querySelectorAll(".filter-pill").forEach(function(p){
    p.classList.toggle("act",p.getAttribute("data-lang")===lang);
  });
  renderGrid();
}

/* ── Render source grid ── */
function renderGrid(){
  var body=$$("sheetBody");
  var filtered=_src.filter(function(s){
    return _currentLang==="all"||(s.language||"")=== _currentLang;
  });

  var dbLinks=filtered.filter(function(s){return s.type==="db";});
  var apiLinks=filtered.filter(function(s){return s.type!=="db";});

  $$("srcCount").textContent=filtered.length+" source"+(filtered.length>1?"s":"");

  if(filtered.length===0){
    body.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-txt">Aucune source disponible pour cette langue</div></div>';
    return;
  }

  var html="";

  if(dbLinks.length>0){
    html+='<div class="section-wrap">';
    html+='<div class="section-label">';
    html+='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>';
    html+='Sources directes<span class="section-count">'+dbLinks.length+'</span></div>';
    html+='<div class="src-grid">';
    dbLinks.forEach(function(s){
      var idx=_src.indexOf(s);
      html+=renderCard(s,idx);
    });
    html+='</div></div>';
  }

  if(apiLinks.length>0){
    html+='<div class="section-wrap">';
    html+='<div class="section-label">';
    html+='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
    html+='Sources externes<span class="section-count">'+apiLinks.length+'</span></div>';
    html+='<div class="src-grid">';
    apiLinks.forEach(function(s){
      var idx=_src.indexOf(s);
      html+=renderCard(s,idx);
    });
    html+='</div></div>';
  }

  body.innerHTML=html;

  body.querySelectorAll(".card").forEach(function(card){
    card.onclick=function(){
      var i=parseInt(card.getAttribute("data-idx"),10);
      selectSource(i);
    };
  });
}

function renderCard(s,idx){
  var isAct=idx===_idx;
  var qualityTag=s.quality==="4K"?'<span class="tag tag-4k">4K</span>':
    (s.quality?'<span class="tag tag-q">'+s.quality+'</span>':"");
  var langTag=s.language?'<span class="tag tag-l">'+s.language+'</span>':"";
  var subTag=s.sub?'<span class="tag tag-sub">Sub '+s.sub+'</span>':"";
  var srcTag=s.source_type?'<span class="tag tag-src">'+s.source_type+'</span>':"";

  var badgeHtml=s.type==="db"
    ?'<div class="card-badge badge-db"><span class="badge-dot-db"></span>Direct</div>'
    :'<div class="card-badge badge-api"><span class="badge-dot-api"></span>Externe</div>';

  return '<div class="card'+(isAct?' act':'')+'" data-idx="'+idx+'">'
    +'<div class="card-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'
    +badgeHtml
    +'<div class="card-name" title="'+escHtml(s.name)+'">'+escHtml(s.name)+'</div>'
    +'<div class="card-meta">'+qualityTag+langTag+subTag+srcTag+'</div>'
    +'</div>';
}

function escHtml(str){
  return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function selectSource(i){
  _idx=i;
  var s=_src[i];
  var lbl=$$("srcLabel");
  if(lbl) lbl.textContent=s.name;
  closeSheet();
  if(_started) loadPlayer();
}

/* ── Player ── */
function loadPlayer(){
  var p=$$("player");
  if(!p||!_src.length) return;
  var s=_src[_idx];
  if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
  p.innerHTML='<iframe src="'+s.url+'" allowfullscreen allow="autoplay;fullscreen;picture-in-picture"></iframe>';
  fetch("/api/embed-click",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({wwId:"${wwId}",tmdbId:${tmdbId},mediaType:"${mediaType}",
      seasonNumber:${seasonNumber ?? null},episodeNumber:${episodeNumber ?? null},
      sourceName:s.name,sourceType:s.type})
  }).catch(function(){});
}

/* ── Sheet open/close ── */
window.openSheet=function(){
  buildFilters();
  renderGrid();
  $$("overlay").classList.add("sh");
  document.body.style.overflow="hidden";
};
window.closeSheet=function(){
  $$("overlay").classList.remove("sh");
  document.body.style.overflow="";
};
window.onOverlayClick=function(e){
  if(e.target===$$("overlay")) closeSheet();
};

/* ── Bug report ── */
window.openBug=function(){$$("bugOverlay").classList.add("sh");};
window.closeBug=function(){$$("bugOverlay").classList.remove("sh");};
window.submitBug=async function(){
  var type=$$("bugType").value;
  var desc=$$("bugDesc").value;
  try{
    await fetch("/api/bug-report",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        ww_id:"${wwId}",tmdb_id:${tmdbId},media_type:"${mediaType}",
        season_number:${seasonNumber ?? null},episode_number:${episodeNumber ?? null},
        title:"${title.replace(/"/g, '\\"')}",
        source_name:(_src[_idx]&&_src[_idx].name)||"Source #1",
        source_url:(_src[_idx]&&_src[_idx].url)||"",
        message:type+(desc?" - "+desc:""),embed_type:"streaming"
      })
    });
    closeBug();
    alert("Merci pour votre signalement !");
    $$("bugDesc").value="";
  }catch(e){alert("Erreur lors de l'envoi");}
};

/* ── Ad modal logic ── */
function showAdModal(){
  _adStep=0;
  $$(_ids.step1).className="step active";
  $$(_ids.step2).className="step";
  $$(_ids.progress).style.width="0%";
  $$(_ids.btnUnlock1).classList.remove("hi");
  $$(_ids.btnUnlock2).classList.add("hi");
  $$(_ids.boxHelp).style.display="";
  $$(_ids.boxThanks).style.display="none";
  $$(_ids.boxDone).style.display="none";
  $$(_ids.overlay).classList.add("sh");
}

$$(_ids.btnUnlock1).onclick=function(){
  if(_adStep>=1) return;
  _adStep=1;
  var a=document.createElement("a");a.href="${AD_URL_1}";a.target="_blank";a.rel="noopener";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  $$(_ids.step1).className="step done";
  $$(_ids.step2).className="step active";
  $$(_ids.progress).style.width="50%";
  $$(_ids.btnUnlock1).classList.add("hi");
  $$(_ids.btnUnlock2).classList.remove("hi");
  $$(_ids.boxHelp).style.display="none";
  $$(_ids.boxThanks).style.display="";
};

$$(_ids.btnUnlock2).onclick=function(){
  if(_adStep>=2) return;
  _adStep=2;
  var a=document.createElement("a");a.href="${AD_URL_2}";a.target="_blank";a.rel="noopener";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  $$(_ids.step2).className="step done";
  $$(_ids.progress).style.width="100%";
  $$(_ids.btnUnlock2).classList.add("hi");
  $$(_ids.boxThanks).style.display="none";
  $$(_ids.boxDone).style.display="";
  setTimeout(function(){
    if(!_started){
      _started=true;
      $$(_ids.overlay).classList.remove("sh");
      if(_src.length){
        var lbl=$$("srcLabel");
        if(lbl) lbl.textContent=_src[0].name;
        loadPlayer();
      }
    }
  },300);
};

/* ── Init ── */
showAdModal();
})();
</script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("Streaming error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
