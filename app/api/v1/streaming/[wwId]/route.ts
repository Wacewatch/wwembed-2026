import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getEpisodeDetails } from "@/lib/tmdb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params
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
  const adCount = ads ? ads.length : 0

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
    .select("*")
    .eq("api_type", "streaming")
    .eq("is_active", true)
    .order("priority", { ascending: true })

  const autoLinks = (apis || []).map((api, index) => {
    let url: string
    if (mediaType === "movie") {
      const pattern = api.url_pattern_movie || api.url_pattern || ""
      url = pattern.replace("{tmdb_id}", String(tmdbId))
    } else {
      const pattern = api.url_pattern_tv || api.url_pattern || ""
      url = pattern
        .replace("{tmdb_id}", String(tmdbId))
        .replace("{season}", String(seasonNumber || 1))
        .replace("{episode}", String(episodeNumber || 1))
    }
    return { name: "Source #" + (index + 1), url, quality: "HD" }
  })

  const allSources = [
    ...autoLinks,
    ...(userLinks || []).map((l, i) => ({
      name: "Source #" + (autoLinks.length + i + 1),
      url: l.source_url,
      quality: l.quality || "HD",
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

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;overflow-x:hidden}
.container{width:100%;height:100vh;display:flex;flex-direction:column}
.player{flex:1;position:relative;background:#000;min-height:0}
.player iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.sources{padding:8px;background:#162230;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-shrink:0}
.sources::-webkit-scrollbar{display:none}
.src-btn{padding:8px 14px;background:#1e3a4f;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px;white-space:nowrap;flex-shrink:0;transition:background 0.2s}
.src-btn:hover,.src-btn:active{background:#2a5a7f}
.src-btn.active{background:#14B8A6}
.overlay{position:fixed;inset:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.overlay.hide{display:none}
.card{background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center;max-height:90vh;overflow-y:auto}
.card h2{color:#5b6b8a;margin-bottom:16px;font-size:18px}
.box{border-radius:8px;padding:10px 12px;margin:8px 0;text-align:left}
.box-warn{background:#fef3cd;border:2px solid #ffc107;color:#856404}
.box-help{background:#ffe4d6;border:2px solid #ff9a6c;color:#c44d00}
.box-time{background:#fff3cd;border:2px solid #ffc107;color:#664d03}
.box-ok{background:#d4edda;border:2px solid #28a745;color:#155724}
.box b{display:block;font-size:13px}
.box span{font-size:11px;opacity:0.8}
.bar{height:5px;background:#e0e0e0;border-radius:3px;margin:12px 0;overflow:hidden}
.bar-fill{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.3s}
.btn{width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;transition:transform 0.1s}
.btn:active{transform:scale(0.98)}
.btn-purple{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.btn-green{background:#28a745;color:#fff}
.hide{display:none}
.footer{margin-top:12px;font-size:10px;color:#888}
.footer a{color:#667eea}
.badge{background:#ff6b6b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px}
@media(max-width:480px){
.card{padding:16px;border-radius:12px}
.card h2{font-size:16px;margin-bottom:12px}
.box{padding:8px 10px;margin:6px 0}
.box b{font-size:12px}
.box span{font-size:10px}
.btn{padding:10px;font-size:12px}
.sources{padding:6px}
.src-btn{padding:6px 10px;font-size:11px}
}
</style>
</head>
<body>
${
  hasAds
    ? `
<div class="overlay" id="overlay">
<div class="card">
<h2>Votre video vous attend</h2>
<div class="box box-warn"><b>Bloqueur de pub detecte</b><span>Autorisez les popups pour ce site</span></div>
<div class="box box-help" id="boxHelp"><b>Cela aide WaveWatch a rester gratuit</b></div>
<div class="box box-time" id="boxTime"><b>Temps estime : <span id="timer">5</span> secondes</b><span>Cliquez, fermez les pubs, et hop !</span></div>
<div class="box box-ok hide" id="boxThanks"><b>Merci d'avoir soutenu WaveWatch !</b></div>
<div class="box box-ok hide" id="boxDone"><b>Pubs validees !</b><span>Cliquez ci-dessous pour profiter de votre video</span></div>
<div class="bar"><div class="bar-fill" id="progress"></div></div>
<button class="btn btn-purple" id="btnUnlock">DEBLOQUER MA VIDEO<span class="badge">x${adCount}</span></button>
<button class="btn btn-green hide" id="btnPlay">LANCER LA VIDEO</button>
<div class="footer">Nos sites <a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a></div>
</div>
</div>
`
    : ""
}
<div class="container">
<div class="player" id="player"></div>
<div class="sources" id="sources"></div>
</div>
<script>
(function(){
var sources = ${sourcesJson};
var adUrl = "${adUrl}";
var adId = "${adId}";
var hasAds = ${hasAds};
var current = 0;

function buildSources(){
  var c = document.getElementById("sources");
  if(!c) return;
  if(sources.length === 0){
    c.innerHTML = '<span style="color:#5a7a8a;padding:8px">Aucune source</span>';
    return;
  }
  c.innerHTML = "";
  for(var i=0;i<sources.length;i++){
    var b = document.createElement("button");
    b.className = "src-btn" + (i===0?" active":"");
    b.textContent = sources[i].name + " (" + sources[i].quality + ")";
    b.setAttribute("data-i", i);
    b.onclick = function(){
      var idx = parseInt(this.getAttribute("data-i"));
      current = idx;
      var all = document.querySelectorAll(".src-btn");
      for(var j=0;j<all.length;j++) all[j].classList.remove("active");
      this.classList.add("active");
      loadIframe();
    };
    c.appendChild(b);
  }
}

function loadIframe(){
  var p = document.getElementById("player");
  if(!p || sources.length === 0) return;
  var f = document.createElement("iframe");
  f.src = sources[current].url;
  f.setAttribute("allowfullscreen","true");
  f.setAttribute("allow","accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");
  p.innerHTML = "";
  p.appendChild(f);
}

function startPlayer(){
  var o = document.getElementById("overlay");
  if(o) o.classList.add("hide");
  buildSources();
  loadIframe();
}

if(hasAds && adUrl){
  buildSources();
  var btnU = document.getElementById("btnUnlock");
  var btnP = document.getElementById("btnPlay");
  
  if(btnU){
    btnU.onclick = function(){
      fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:adId})});
      window.open(adUrl,"_blank");
      btnU.classList.add("hide");
      var sec = 5;
      var prog = 0;
      var iv = setInterval(function(){
        sec--;
        prog += 20;
        var t = document.getElementById("timer");
        var pr = document.getElementById("progress");
        if(t) t.textContent = sec;
        if(pr) pr.style.width = prog + "%";
        if(sec <= 0){
          clearInterval(iv);
          var bt = document.getElementById("boxTime");
          var bh = document.getElementById("boxHelp");
          var bth = document.getElementById("boxThanks");
          var bd = document.getElementById("boxDone");
          if(bt) bt.classList.add("hide");
          if(bh) bh.classList.add("hide");
          if(bth) bth.classList.remove("hide");
          if(bd) bd.classList.remove("hide");
          if(pr) pr.style.width = "100%";
          if(btnP) btnP.classList.remove("hide");
        }
      },1000);
    };
  }
  
  if(btnP){
    btnP.onclick = function(){
      startPlayer();
    };
  }
} else {
  startPlayer();
}
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
}
