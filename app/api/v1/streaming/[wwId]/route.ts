import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getEpisodeDetails } from "@/lib/tmdb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  try {
    const { wwId } = await params
    if (!wwId) return NextResponse.json({ error: "Missing WW ID" }, { status: 400 })

    const parsed = parseWWId(wwId)
    if (!parsed) return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })

    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed
    const supabase = createAdminClient()

    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""

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
body{font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;min-height:100vh;overflow:hidden}
.wrap{position:relative;width:100%;height:100vh;display:flex;flex-direction:column}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(0,0,0,0.3);backdrop-filter:blur(10px);z-index:10}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;color:#00d4aa}
.logo svg{width:24px;height:24px}
.ttl{font-size:14px;color:#fff;opacity:0.9;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hdr-actions{display:flex;gap:8px}
.src-btn{background:linear-gradient(135deg,#00d4aa,#00a388);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px}
.src-btn:hover{opacity:0.9}
.rpt-btn{background:#ef4444;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.rpt-btn:hover{background:#dc2626}
.player{flex:1;position:relative;background:#000}
.player iframe{width:100%;height:100%;border:none}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#888}
.mo{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;z-index:100}
.mo.sh{display:flex}
.mc{background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.1)}
.mc-hdr{display:flex;align-items:center;justify-content:between;margin-bottom:20px}
.mc-ttl{font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px}
.mc-cls{background:none;border:none;color:#fff;font-size:24px;cursor:pointer;margin-left:auto}
.src-grid{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto}
.src-card{background:rgba(255,255,255,0.05);border:2px solid transparent;border-radius:10px;padding:12px 16px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:between}
.src-card:hover{background:rgba(0,212,170,0.1);border-color:rgba(0,212,170,0.3)}
.src-card.active{background:rgba(0,212,170,0.2);border-color:#00d4aa}
.src-name{font-weight:600;font-size:14px}
.src-meta{display:flex;gap:6px;margin-left:auto}
.src-badge{font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600}
.src-badge.hd{background:#00d4aa;color:#000}
.src-badge.lang{background:#6366f1;color:#fff}
.rpt-form{display:flex;flex-direction:column;gap:12px}
.rpt-form textarea{width:100%;min-height:100px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:12px;color:#fff;font-size:14px;resize:vertical}
.rpt-form textarea:focus{outline:none;border-color:#00d4aa}
.rpt-form button{background:#ef4444;color:#fff;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer}
.rpt-form button:hover{background:#dc2626}
.rpt-form button:disabled{opacity:0.5;cursor:not-allowed}
.rpt-success{color:#00d4aa;text-align:center;padding:20px}
.ad-ov{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:none;align-items:center;justify-content:center;z-index:200}
.ad-ov.sh{display:flex}
.ad-box{background:rgba(255,255,255,0.95);border-radius:20px;padding:32px;max-width:400px;width:90%;text-align:center;color:#1a1a2e}
.ad-ttl{font-size:20px;font-weight:700;margin-bottom:8px}
.ad-sub{color:#666;margin-bottom:24px}
.ad-steps{display:flex;flex-direction:column;gap:12px;margin-bottom:24px}
.ad-step{display:flex;align-items:center;gap:12px;padding:12px;background:#f1f5f9;border-radius:10px}
.ad-step-num{width:28px;height:28px;background:#e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
.ad-step.active .ad-step-num{background:#00d4aa;color:#fff}
.ad-step.done .ad-step-num{background:#10b981;color:#fff}
.ad-step-txt{font-size:14px;color:#334155}
.ad-btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.2s}
.ad-btn-primary{background:linear-gradient(135deg,#00d4aa,#00a388);color:#fff}
.ad-btn-primary:hover{opacity:0.9}
.ad-btn-play{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
.ad-timer{margin-top:16px;padding:12px;background:#f1f5f9;border-radius:10px}
.ad-timer-txt{font-size:14px;color:#666;margin-bottom:8px}
.ad-timer-bar{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden}
.ad-timer-fill{height:100%;background:#00d4aa;width:0%;transition:width 1s linear}
.hi{display:none!important}
</style>
</head>
<body>
<div class="wrap">
<div class="hdr">
<div class="logo"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>WWEMBED</div>
<div class="ttl">${title}</div>
<div class="hdr-actions">
<button class="src-btn" id="srcBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Source #1</button>
<button class="rpt-btn" id="rptBtn" title="Signaler un problème"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></button>
</div>
</div>
<div class="player" id="player">
<div class="no-src" id="noSrc">Aucune source disponible</div>
</div>
</div>

<div class="mo" id="srcModal">
<div class="mc">
<div class="mc-hdr">
<div class="mc-ttl"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Choisir un lecteur</div>
<button class="mc-cls" id="srcClose">&times;</button>
</div>
<div class="src-grid" id="srcGrid"></div>
</div>
</div>

<div class="mo" id="rptModal">
<div class="mc">
<div class="mc-hdr">
<div class="mc-ttl" style="color:#ef4444"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Signaler un problème</div>
<button class="mc-cls" id="rptClose">&times;</button>
</div>
<div class="rpt-form" id="rptForm">
<p style="color:#94a3b8;font-size:13px;margin-bottom:8px">Décrivez le problème rencontré avec ce lecteur (source ne fonctionne pas, vidéo bloquée, etc.)</p>
<textarea id="rptMsg" placeholder="Décrivez le problème..."></textarea>
<button type="button" id="rptSubmit">Envoyer le signalement</button>
</div>
<div class="rpt-success hi" id="rptSuccess">
<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin:0 auto 12px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<p style="font-weight:600;margin-bottom:4px">Merci pour votre signalement !</p>
<p style="color:#94a3b8;font-size:13px">Nous allons examiner ce problème.</p>
</div>
</div>
</div>

${
  hasAds && adUrl
    ? `
<div class="ad-ov sh" id="adOv">
<div class="ad-box">
<div class="ad-ttl">Accéder au contenu</div>
<div class="ad-sub">Suivez ces étapes pour débloquer le lecteur</div>
<div class="ad-steps">
<div class="ad-step active" id="step1"><div class="ad-step-num">1</div><div class="ad-step-txt">Cliquez sur le bouton ci-dessous</div></div>
<div class="ad-step" id="step2"><div class="ad-step-num">2</div><div class="ad-step-txt">Attendez 3 secondes</div></div>
<div class="ad-step" id="step3"><div class="ad-step-num">3</div><div class="ad-step-txt">Profitez du contenu</div></div>
</div>
<div id="boxHelp"><button class="ad-btn ad-btn-primary" id="btnUnlock">Débloquer le lecteur</button></div>
<div class="ad-timer hi" id="boxTime"><div class="ad-timer-txt">Veuillez patienter <span id="countdown">3</span> seconde(s)</div><div class="ad-timer-bar"><div class="ad-timer-fill" id="timerFill"></div></div></div>
<div class="hi" id="boxDone"><button class="ad-btn ad-btn-play" id="btnPlay">Lancer le lecteur</button></div>
</div>
</div>
`
    : ""
}

<script>
(function(){
var sources=${sourcesJson};
var current=0;
var wwId="${wwId}";
var title="${title.replace(/"/g, '\\"')}";
var mediaType="${mediaType}";
var tmdbId=${tmdbId};
var seasonNumber=${seasonNumber ?? "null"};
var episodeNumber=${episodeNumber ?? "null"};
var hasAds=${hasAds && adUrl ? "true" : "false"};
var adUrl="${adUrl}";

function $(id){return document.getElementById(id)}
function startPlayer(){
  if(sources.length===0){$("noSrc").style.display="block";return}
  loadSource(0);
  buildGrid();
}

function loadSource(idx){
  current=idx;
  var p=$("player");
  var s=sources[idx];
  if(!s)return;
  p.innerHTML='<iframe src="'+s.url+'" allowfullscreen allow="autoplay;fullscreen"></iframe>';
  var btn=$("srcBtn");
  if(btn)btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'+s.name;
  updateGrid();
}

function buildGrid(){
  var g=$("srcGrid");
  if(!g)return;
  g.innerHTML="";
  for(var i=0;i<sources.length;i++){
    var s=sources[i];
    var card=document.createElement("div");
    card.className="src-card"+(i===current?" active":"");
    card.dataset.idx=i;
    card.innerHTML='<span class="src-name">'+s.name+'</span><div class="src-meta"><span class="src-badge hd">'+s.quality+'</span><span class="src-badge lang">'+s.language+'</span></div>';
    card.onclick=function(){loadSource(parseInt(this.dataset.idx));$("srcModal").classList.remove("sh")};
    g.appendChild(card);
  }
}

function updateGrid(){
  var cards=document.querySelectorAll(".src-card");
  cards.forEach(function(c,i){c.classList.toggle("active",i===current)});
}

var srcBtn=$("srcBtn");
var srcModal=$("srcModal");
var srcClose=$("srcClose");
if(srcBtn)srcBtn.onclick=function(){srcModal.classList.add("sh")};
if(srcClose)srcClose.onclick=function(){srcModal.classList.remove("sh")};
if(srcModal)srcModal.onclick=function(e){if(e.target===srcModal)srcModal.classList.remove("sh")};

var rptBtn=$("rptBtn");
var rptModal=$("rptModal");
var rptClose=$("rptClose");
var rptSubmit=$("rptSubmit");
var rptMsg=$("rptMsg");
var rptForm=$("rptForm");
var rptSuccess=$("rptSuccess");

if(rptBtn)rptBtn.onclick=function(){rptModal.classList.add("sh")};
if(rptClose)rptClose.onclick=function(){rptModal.classList.remove("sh")};
if(rptModal)rptModal.onclick=function(e){if(e.target===rptModal)rptModal.classList.remove("sh")};

if(rptSubmit)rptSubmit.onclick=function(){
  var msg=rptMsg.value.trim();
  if(!msg){alert("Veuillez décrire le problème");return}
  rptSubmit.disabled=true;
  rptSubmit.textContent="Envoi...";
  var currentSource=sources[current]||{};
  fetch("/api/bug-reports",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      wwId:wwId,
      mediaType:mediaType,
      tmdbId:tmdbId,
      seasonNumber:seasonNumber,
      episodeNumber:episodeNumber,
      title:title,
      sourceName:currentSource.name||"",
      sourceUrl:currentSource.url||"",
      message:msg,
      embedType:"streaming"
    })
  }).then(function(r){return r.json()}).then(function(){
    rptForm.classList.add("hi");
    rptSuccess.classList.remove("hi");
    setTimeout(function(){rptModal.classList.remove("sh");rptForm.classList.remove("hi");rptSuccess.classList.add("hi");rptMsg.value="";rptSubmit.disabled=false;rptSubmit.textContent="Envoyer le signalement"},2000);
  }).catch(function(){
    alert("Erreur lors de l'envoi");
    rptSubmit.disabled=false;
    rptSubmit.textContent="Envoyer le signalement";
  });
};

if(hasAds){
  var btnUnlock=$("btnUnlock");
  var btnPlay=$("btnPlay");
  var countdown=$("countdown");
  var timerFill=$("timerFill");
  var step1=$("step1");
  var step2=$("step2");
  var step3=$("step3");
  var boxHelp=$("boxHelp");
  var boxTime=$("boxTime");
  var boxDone=$("boxDone");
  var adOv=$("adOv");

  if(btnUnlock)btnUnlock.onclick=function(){
    window.open(adUrl,"_blank");
    step1.classList.remove("active");step1.classList.add("done");
    step2.classList.add("active");
    boxHelp.classList.add("hi");
    boxTime.classList.remove("hi");
    var t=3;
    var iv=setInterval(function(){
      t--;
      if(countdown)countdown.textContent=t;
      if(timerFill)timerFill.style.width=((3-t)/3*100)+"%";
      if(t<=0){
        clearInterval(iv);
        step2.classList.remove("active");step2.classList.add("done");
        step3.classList.add("active");
        boxTime.classList.add("hi");
        boxDone.classList.remove("hi");
      }
    },1000);
  };

  if(btnPlay)btnPlay.onclick=function(){
    adOv.classList.remove("sh");
    startPlayer();
  };
}else{
  startPlayer();
}
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
