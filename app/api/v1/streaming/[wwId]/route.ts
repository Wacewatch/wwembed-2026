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
    const safeTitle = title.replace(/"/g, '\\"').replace(/'/g, "\\'")

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - WWEMBED</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#fff;min-height:100vh;overflow:hidden}
.wrap{position:relative;width:100%;height:100vh;display:flex;flex-direction:column}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(0,0,0,0.5);z-index:10}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;color:#00d4aa}
.logo svg{width:24px;height:24px}
.ttl{font-size:14px;color:#fff;opacity:0.9;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acts{display:flex;gap:8px}
.btn-src{background:linear-gradient(135deg,#00d4aa,#00a388);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px}
.btn-rpt{background:#ef4444;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer}
.player{flex:1;position:relative;background:#000}
.player iframe{width:100%;height:100%;border:none}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#888}
.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;z-index:100}
.modal.show{display:flex}
.modal-box{background:#1e293b;border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto}
.modal-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.modal-ttl{font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px}
.modal-cls{background:none;border:none;color:#fff;font-size:28px;cursor:pointer;line-height:1}
.src-list{display:flex;flex-direction:column;gap:8px}
.src-item{background:rgba(255,255,255,0.05);border:2px solid transparent;border-radius:10px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between}
.src-item:hover{background:rgba(0,212,170,0.1);border-color:rgba(0,212,170,0.3)}
.src-item.active{background:rgba(0,212,170,0.2);border-color:#00d4aa}
.src-name{font-weight:600}
.src-tags{display:flex;gap:6px}
.tag{font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600}
.tag-hd{background:#00d4aa;color:#000}
.tag-lang{background:#6366f1;color:#fff}
.rpt-area textarea{width:100%;min-height:100px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:12px;color:#fff;font-size:14px;resize:vertical;margin:12px 0}
.rpt-area textarea:focus{outline:none;border-color:#00d4aa}
.rpt-area button{background:#ef4444;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer;width:100%}
.rpt-ok{color:#00d4aa;text-align:center;padding:20px;display:none}
.ad-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#667eea,#764ba2);display:none;align-items:center;justify-content:center;z-index:200}
.ad-overlay.show{display:flex}
.ad-box{background:#fff;border-radius:20px;padding:32px;max-width:400px;width:90%;text-align:center;color:#1a1a2e}
.ad-title{font-size:20px;font-weight:700;margin-bottom:8px}
.ad-desc{color:#666;margin-bottom:24px}
.ad-steps{display:flex;flex-direction:column;gap:12px;margin-bottom:24px;text-align:left}
.ad-step{display:flex;align-items:center;gap:12px;padding:12px;background:#f1f5f9;border-radius:10px}
.ad-num{width:28px;height:28px;background:#e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0}
.ad-step.on .ad-num{background:#00d4aa;color:#fff}
.ad-step.ok .ad-num{background:#10b981;color:#fff}
.ad-txt{font-size:14px;color:#334155}
.ad-btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer}
.ad-btn-go{background:linear-gradient(135deg,#00d4aa,#00a388);color:#fff}
.ad-btn-play{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:none}
.ad-wait{margin-top:16px;padding:12px;background:#f1f5f9;border-radius:10px;display:none}
.ad-wait-txt{font-size:14px;color:#666;margin-bottom:8px}
.ad-bar{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden}
.ad-fill{height:100%;background:#00d4aa;width:0%;transition:width 1s linear}
</style>
</head>
<body>
<div class="wrap">
<div class="hdr">
<div class="logo"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>WWEMBED</div>
<div class="ttl">${title}</div>
<div class="acts">
<button class="btn-src" id="btnSrc">Source #1</button>
<button class="btn-rpt" id="btnRpt" title="Signaler">⚠</button>
</div>
</div>
<div class="player" id="player"><div class="no-src" id="noSrc">Aucune source</div></div>
</div>

<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr"><div class="modal-ttl">🎬 Choisir un lecteur</div><button class="modal-cls" id="srcClose">×</button></div>
<div class="src-list" id="srcList"></div>
</div>
</div>

<div class="modal" id="rptModal">
<div class="modal-box">
<div class="modal-hdr"><div class="modal-ttl" style="color:#ef4444">⚠ Signaler un problème</div><button class="modal-cls" id="rptClose">×</button></div>
<div class="rpt-area" id="rptArea">
<p style="color:#94a3b8;font-size:13px">Décrivez le problème rencontré</p>
<textarea id="rptMsg" placeholder="Le lecteur ne charge pas, erreur..."></textarea>
<button id="rptSend">Envoyer</button>
</div>
<div class="rpt-ok" id="rptOk">✓ Merci pour votre signalement !</div>
</div>
</div>

<div class="ad-overlay" id="adOverlay">
<div class="ad-box">
<div class="ad-title">Accéder au contenu</div>
<div class="ad-desc">Suivez ces étapes pour débloquer</div>
<div class="ad-steps">
<div class="ad-step on" id="st1"><div class="ad-num">1</div><div class="ad-txt">Cliquez sur le bouton</div></div>
<div class="ad-step" id="st2"><div class="ad-num">2</div><div class="ad-txt">Attendez 3 secondes</div></div>
<div class="ad-step" id="st3"><div class="ad-num">3</div><div class="ad-txt">Profitez du contenu</div></div>
</div>
<button class="ad-btn ad-btn-go" id="adGo">Débloquer le lecteur</button>
<button class="ad-btn ad-btn-play" id="adPlay">Lancer le lecteur</button>
<div class="ad-wait" id="adWait"><div class="ad-wait-txt">Patientez <span id="adCount">3</span>s</div><div class="ad-bar"><div class="ad-fill" id="adFill"></div></div></div>
</div>
</div>

<script>
(function(){
var S=${sourcesJson};
var idx=0;
var hasAd=${hasAds && adUrl ? "true" : "false"};
var adUrl="${adUrl}";
var wwId="${wwId}";
var title="${safeTitle}";
var mediaType="${mediaType}";
var tmdbId=${tmdbId};
var sn=${seasonNumber ?? "null"};
var ep=${episodeNumber ?? "null"};

function $(i){return document.getElementById(i)}

function play(){
if(!S.length){$("noSrc").style.display="block";return}
load(0);
grid();
}

function load(i){
idx=i;
var s=S[i];if(!s)return;
$("player").innerHTML='<iframe src="'+s.url+'" allowfullscreen allow="autoplay;fullscreen"></iframe>';
$("btnSrc").textContent=s.name;
var items=document.querySelectorAll(".src-item");
items.forEach(function(el,j){el.classList.toggle("active",j===i)});
}

function grid(){
var g=$("srcList");g.innerHTML="";
S.forEach(function(s,i){
var d=document.createElement("div");
d.className="src-item"+(i===idx?" active":"");
d.innerHTML='<span class="src-name">'+s.name+'</span><div class="src-tags"><span class="tag tag-hd">'+s.quality+'</span><span class="tag tag-lang">'+s.language+'</span></div>';
d.onclick=function(){load(i);$("srcModal").classList.remove("show")};
g.appendChild(d);
});
}

$("btnSrc").onclick=function(){$("srcModal").classList.add("show")};
$("srcClose").onclick=function(){$("srcModal").classList.remove("show")};
$("srcModal").onclick=function(e){if(e.target===$("srcModal"))$("srcModal").classList.remove("show")};

$("btnRpt").onclick=function(){$("rptModal").classList.add("show")};
$("rptClose").onclick=function(){$("rptModal").classList.remove("show")};
$("rptModal").onclick=function(e){if(e.target===$("rptModal"))$("rptModal").classList.remove("show")};

$("rptSend").onclick=function(){
var msg=$("rptMsg").value.trim();
if(!msg){alert("Décrivez le problème");return}
$("rptSend").disabled=true;
var cs=S[idx]||{};
fetch("/api/bug-reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({wwId:wwId,mediaType:mediaType,tmdbId:tmdbId,seasonNumber:sn,episodeNumber:ep,title:title,sourceName:cs.name||"",sourceUrl:cs.url||"",message:msg,embedType:"streaming"})})
.then(function(){$("rptArea").style.display="none";$("rptOk").style.display="block";setTimeout(function(){$("rptModal").classList.remove("show");$("rptArea").style.display="block";$("rptOk").style.display="none";$("rptMsg").value="";$("rptSend").disabled=false},2000)})
.catch(function(){alert("Erreur");$("rptSend").disabled=false});
};

if(hasAd){
$("adOverlay").classList.add("show");
$("adGo").onclick=function(){
window.open(adUrl,"_blank");
$("st1").classList.remove("on");$("st1").classList.add("ok");
$("st2").classList.add("on");
$("adGo").style.display="none";
$("adWait").style.display="block";
var t=3;
var iv=setInterval(function(){
t--;$("adCount").textContent=t;$("adFill").style.width=((3-t)/3*100)+"%";
if(t<=0){clearInterval(iv);$("st2").classList.remove("on");$("st2").classList.add("ok");$("st3").classList.add("on");$("adWait").style.display="none";$("adPlay").style.display="block"}
},1000);
};
$("adPlay").onclick=function(){$("adOverlay").classList.remove("show");play()};
}else{play()}
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
