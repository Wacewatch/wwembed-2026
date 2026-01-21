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

    const AD_URL = "https://otieu.com/4/9248013"
    const hasAds = true

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
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95),rgba(118,75,162,0.95));display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.mc{background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center}
.mc h2{color:#1a1a2e;margin-bottom:6px;font-size:18px}
.mc-sub{color:#666;font-size:12px;margin-bottom:14px}
.steps{display:flex;justify-content:center;gap:6px;margin-bottom:14px}
.step{width:8px;height:8px;border-radius:50%;background:#ddd}
.step.active{background:#667eea}
.step.done{background:#22c55e}
.bx{border-radius:8px;padding:10px;margin:6px 0;text-align:left;display:flex;align-items:flex-start;gap:8px}
.bx svg{width:16px;height:16px;flex-shrink:0}
.bx b{display:block;font-size:12px;margin-bottom:2px}
.bx span{font-size:10px;opacity:0.8}
.bw{background:#fef3c7;border:1px solid #f59e0b;color:#92400e}
.bh{background:#ede9fe;border:1px solid #8b5cf6;color:#5b21b6}
.bt-link{display:block;width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;margin-top:8px}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff}
.hi{display:none}
.cf{margin-top:10px;font-size:10px;color:#999}
.cf a{color:#667eea}
.adtag{background:#fff;color:#667eea;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px}
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
</style>
</head>
<body>
<div class="mo" id="adOverlay">
<div class="mc">
<h2>Accéder au contenu</h2>
<div class="mc-sub">Une dernière étape pour regarder</div>
<div class="steps"><div class="step active" id="step1"></div><div class="step" id="step2"></div></div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="bx bh">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<a href="${AD_URL}" target="_blank" rel="noopener" class="bt-link bp" id="btnAd">CONTINUER<span class="adtag">PUB</span></a>
<button class="bt-link bn hi" id="btnStart">LANCER LE LECTEUR</button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>
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
<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr">
<div class="modal-ttl">Choisir un lecteur</div>
<button class="modal-close" id="closeModal">×</button>
</div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div>
</div>
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
<script>
var _src=${sourcesJson};
var _idx=0;
var _started=false;

function $(id){return document.getElementById(id);}

function startPlayer(){
if(_started)return;
_started=true;
$("adOverlay").style.display="none";
buildGrid();
if(_src.length){$("srcLabel").textContent=_src[0].name;loadPlayer();}
}

function buildGrid(){
var g=$("srcGrid");
if(!g||!_src.length){g.innerHTML="<div style='text-align:center;padding:20px;color:#555'>Aucune source</div>";return;}
g.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(idx){
var s=_src[idx];
var d=document.createElement("div");
d.className="card"+(idx===_idx?" act":"");
d.innerHTML='<div class="card-name">'+s.name+'</div><div class="card-tags"><span class="tag tag-q">'+(s.quality||"HD")+'</span><span class="tag tag-l">'+(s.language||"VO")+'</span></div>';
d.onclick=function(){_idx=idx;buildGrid();$("srcLabel").textContent=s.name;$("srcModal").classList.remove("sh");if(_started)loadPlayer();};
g.appendChild(d);
})(i);
}
}

function loadPlayer(){
var p=$("player");if(!p||!_src.length)return;
var s=_src[_idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
p.innerHTML='<iframe src="'+s.url+'" allowfullscreen allow="autoplay;fullscreen"></iframe>';
}

$("srcBtn").onclick=function(){$("srcModal").classList.add("sh");buildGrid();};
$("closeModal").onclick=function(){$("srcModal").classList.remove("sh");};
$("srcModal").onclick=function(e){if(e.target===$("srcModal"))$("srcModal").classList.remove("sh");};
$("btnAd").addEventListener("click",function(){setTimeout(function(){$("step1").classList.remove("active");$("step1").classList.add("done");$("step2").classList.add("active");$("step2").classList.add("done");$("btnAd").classList.add("hi");$("btnStart").classList.remove("hi");},150);});
$("btnStart").onclick=startPlayer;
$("bugBtn").onclick=function(){$("bugModal").classList.add("sh");};
$("bugCancel").onclick=function(){$("bugModal").classList.remove("sh");};
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
}catch(e){alert("Erreur lors de l'envoi");}
};
</script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("Streaming error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
