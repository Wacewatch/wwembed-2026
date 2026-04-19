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

    // Generate random IDs for the ad modal (same pattern as download)
    const ids = {
      overlay: generateRandomId("m"),
      progress: generateRandomId("g"),
      btnUnlock1: generateRandomId("u1"),
      btnUnlock2: generateRandomId("u2"),
      btnStart: generateRandomId("d"),
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
html,body{height:100%;overflow:hidden;font-family:system-ui,sans-serif;background:#0a0a0f;color:#fff}
.wrap{display:flex;flex-direction:column;height:100%}
.hdr{display:flex;align-items:center;padding:10px 14px;background:#151520;border-bottom:1px solid #222;gap:12px}
.logo{font-weight:700;font-size:13px;color:#00d4aa}
.ttl{flex:1;font-size:13px;font-weight:600;color:#ccc;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top-right{display:flex;gap:8px}
.src-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#00d4aa;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.bug-btn{display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#ef4444;border:none;border-radius:8px;color:#fff;font-size:16px;cursor:pointer}
.player{flex:1;background:#000;position:relative}
.player iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.no-src{display:flex;align-items:center;justify-content:center;height:100%;color:#555}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:100;padding:16px}
.modal.sh{display:flex}
.modal-box{background:#1a1a28;border-radius:14px;width:100%;max-width:600px;max-height:80vh;display:flex;flex-direction:column;border:1px solid #333}
.modal-hdr{padding:14px 18px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center}
.modal-ttl{font-size:16px;font-weight:700;color:#00d4aa}
.modal-close{width:28px;height:28px;border-radius:50%;background:#333;border:none;color:#fff;cursor:pointer;font-size:16px}
.modal-body{padding:14px 18px;overflow-y:auto}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.card{background:#1e1e2c;border:1px solid #333;border-radius:10px;padding:12px;cursor:pointer}
.card:hover{border-color:#00d4aa}
.card.act{border-color:#00d4aa;background:#1a3a2a}
.card-name{font-size:12px;font-weight:600;margin-bottom:6px}
.card-tags{display:flex;gap:4px}
.tag{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}
.tag-q{background:#7c3aed;color:#fff}
.tag-l{background:#0891b2;color:#fff}
.bug-modal{position:fixed;inset:0;background:rgba(0,0,0,.95);display:none;align-items:center;justify-content:center;z-index:200;padding:16px}
.bug-modal.sh{display:flex}
.bug-form{background:#1a1a28;border-radius:14px;padding:24px;max-width:500px;width:100%;border:1px solid #333}
.bug-form h3{color:#00d4aa;margin-bottom:16px;font-size:18px}
.form-group{margin-bottom:14px}
.form-group label{display:block;margin-bottom:6px;font-size:12px;color:#ccc}
.form-group select,.form-group textarea{width:100%;background:#0f0f1a;border:1px solid #333;color:#fff;padding:10px;border-radius:8px;font-size:13px}
.form-group textarea{min-height:80px;resize:vertical}
.bug-actions{display:flex;gap:10px;margin-top:16px}
.bug-actions button{flex:1;padding:10px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
.bug-submit{background:#00d4aa;color:#fff}
.bug-cancel{background:#333;color:#fff}

/* ===== AD MODAL (same as download) ===== */
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
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s;text-decoration:none;display:block;text-align:center}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bp2{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:11px;color:#9ca3af}
.cf a{color:#667eea}
.adtag{background:#fff;color:#667eea;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px;font-weight:600}
.adtag2{background:#fff;color:#ef4444;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px;font-weight:600}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="logo">▶ WWEMBED</div>
    <div class="ttl">${title}</div>
    <div class="top-right">
      <button class="src-btn" id="srcBtn">☰ <span id="srcLabel">Source #1</span></button>
      <button class="bug-btn" id="bugBtn" title="Signaler un problème">🐛</button>
    </div>
  </div>
  <div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>

<!-- Source selector modal -->
<div class="modal" id="srcModal">
  <div class="modal-box">
    <div class="modal-hdr">
      <div class="modal-ttl">Choisir un lecteur</div>
      <button class="modal-close" id="closeModal">×</button>
    </div>
    <div class="modal-body"><div class="grid" id="srcGrid"></div></div>
  </div>
</div>

<!-- Bug report modal -->
<div class="bug-modal" id="bugModal">
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
      <button class="bug-cancel" id="bugCancel">Annuler</button>
      <button class="bug-submit" id="bugSubmit">Envoyer</button>
    </div>
  </div>
</div>

<!-- Ad unlock modal (same system as download) -->
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
    <!-- Pub 1 -->
    <a href="${AD_URL_1}" target="_blank" rel="noopener" class="bt bp" id="${ids.btnUnlock1}">ÉTAPE 1 / 2<span class="adtag">PUB</span></a>
    <!-- Pub 2 (hidden until step 1 done) -->
    <a href="${AD_URL_2}" target="_blank" rel="noopener" class="bt bp2 hi" id="${ids.btnUnlock2}">ÉTAPE 2 / 2<span class="adtag2">PUB</span></a>
    <!-- Start player (hidden until both steps done) -->
    <button class="bt bn hi" id="${ids.btnStart}">▶ LANCER LE LECTEUR</button>
    <div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
  </div>
</div>

<script>
var _src=${sourcesJson};
var _idx=0;
var _started=false;
var _adStep=0; // 0=none, 1=first ad clicked, 2=both clicked

var _ids=${JSON.stringify(ids)};

function $(id){return document.getElementById(id);}

// ── Ad modal logic (same pattern as download) ──────────────────────
function showAdModal(){
  var o=$(_ids.overlay);
  var s1=$(_ids.step1);
  var s2=$(_ids.step2);
  var pr=$(_ids.progress);
  var bu1=$(_ids.btnUnlock1);
  var bu2=$(_ids.btnUnlock2);
  var bs=$(_ids.btnStart);
  var bh=$(_ids.boxHelp);
  var bk=$(_ids.boxThanks);
  var bd=$(_ids.boxDone);

  // Reset state
  _adStep=0;
  s1.className="step active";
  s2.className="step";
  pr.style.width="0%";
  bu1.classList.remove("hi");
  bu2.classList.add("hi");
  bs.classList.add("hi");
  bh.style.display="";
  bk.style.display="none";
  bd.style.display="none";
  o.classList.add("sh");
}

// Step 1: first pub clicked
$(_ids.btnUnlock1).addEventListener("click", function(){
  if(_adStep>=1) return;
  setTimeout(function(){
    _adStep=1;
    var s1=$(_ids.step1);
    var s2=$(_ids.step2);
    var pr=$(_ids.progress);
    var bu1=$(_ids.btnUnlock1);
    var bu2=$(_ids.btnUnlock2);
    var bh=$(_ids.boxHelp);
    var bk=$(_ids.boxThanks);
    s1.className="step done";
    s2.className="step active";
    pr.style.width="50%";
    bu1.classList.add("hi");
    bu2.classList.remove("hi");
    bh.style.display="none";
    bk.style.display="";
  }, 150);
});

// Step 2: second pub clicked
$(_ids.btnUnlock2).addEventListener("click", function(){
  if(_adStep>=2) return;
  setTimeout(function(){
    _adStep=2;
    var s2=$(_ids.step2);
    var pr=$(_ids.progress);
    var bu2=$(_ids.btnUnlock2);
    var bs=$(_ids.btnStart);
    var bk=$(_ids.boxThanks);
    var bd=$(_ids.boxDone);
    s2.className="step done";
    pr.style.width="100%";
    bu2.classList.add("hi");
    bs.classList.remove("hi");
    bk.style.display="none";
    bd.style.display="";
  }, 150);
});

// Start player button
$(_ids.btnStart).onclick = function(){
  if(!_started){
    _started=true;
    $(_ids.overlay).classList.remove("sh");
    buildGrid();
    if(_src.length){ $("srcLabel").textContent=_src[0].name; loadPlayer(); }
  }
};

// ── Source grid & player ───────────────────────────────────────────
function buildGrid(){
  var g=$("srcGrid");
  if(!g||!_src.length){
    if(g) g.innerHTML="<div style='text-align:center;padding:20px;color:#555'>Aucune source</div>";
    return;
  }
  g.innerHTML="";
  for(var i=0;i<_src.length;i++){
    (function(idx){
      var s=_src[idx];
      var d=document.createElement("div");
      d.className="card"+(idx===_idx?" act":"");
      d.innerHTML='<div class="card-name">'+s.name+'</div><div class="card-tags"><span class="tag tag-q">'+(s.quality||"HD")+'</span><span class="tag tag-l">'+(s.language||"VO")+'</span></div>';
      d.onclick=function(){
        _idx=idx;
        buildGrid();
        $("srcLabel").textContent=s.name;
        $("srcModal").classList.remove("sh");
        if(_started) loadPlayer();
      };
      g.appendChild(d);
    })(i);
  }
}

function loadPlayer(){
  var p=$("player");
  if(!p||!_src.length) return;
  var s=_src[_idx];
  if(!s||!s.url){ p.innerHTML="<div class='no-src'>Source indisponible</div>"; return; }
  p.innerHTML='<iframe src="'+s.url+'" allowfullscreen allow="autoplay;fullscreen"></iframe>';
}

// ── UI bindings ────────────────────────────────────────────────────
$("srcBtn").onclick=function(){ $("srcModal").classList.add("sh"); buildGrid(); };
$("closeModal").onclick=function(){ $("srcModal").classList.remove("sh"); };
$("srcModal").onclick=function(e){ if(e.target===$("srcModal")) $("srcModal").classList.remove("sh"); };

$("bugBtn").onclick=function(){ $("bugModal").classList.add("sh"); };
$("bugCancel").onclick=function(){ $("bugModal").classList.remove("sh"); };
$("bugSubmit").onclick=async function(){
  var type=$("bugType").value;
  var desc=$("bugDesc").value;
  try{
    await fetch("/api/bug-report",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        ww_id:"${wwId}",
        tmdb_id:${tmdbId},
        media_type:"${mediaType}",
        season_number:${seasonNumber ?? null},
        episode_number:${episodeNumber ?? null},
        title:"${title.replace(/"/g, '\\"')}",
        source_name:_src[_idx]?.name||"Source #1",
        source_url:_src[_idx]?.url||"",
        message:type+(desc?" - "+desc:""),
        embed_type:"streaming"
      })
    });
    $("bugModal").classList.remove("sh");
    alert("Merci pour votre signalement!");
    $("bugDesc").value="";
  }catch(e){ alert("Erreur lors de l'envoi"); }
};

// ── Init: show ad modal on load ────────────────────────────────────
showAdModal();
</script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("Streaming error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
