import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params

  const match = wwId.match(/^ww-live-(.+)$/i)
  if (!match) {
    return new NextResponse("Invalid WW ID format. Expected: ww-live-{channelId}", { status: 400 })
  }

  const channelIdPart = match[1]
  const supabase = createAdminClient()

  // Try exact UUID match first
  let channel = null

  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (uuidRegex.test(channelIdPart)) {
    const { data } = await supabase
      .from("live_tv_channels")
      .select("*")
      .eq("id", channelIdPart)
      .eq("is_active", true)
      .eq("status", "approved")
      .single()
    channel = data
  }

  // If not found, try prefix match (for short IDs)
  if (!channel) {
    const { data } = await supabase
      .from("live_tv_channels")
      .select("*")
      .ilike("id", channelIdPart + "%")
      .eq("is_active", true)
      .eq("status", "approved")
      .single()
    channel = data
  }

  if (!channel) {
    return new NextResponse(`Channel not found for ID: ${channelIdPart}`, { status: 404 })
  }

  // Get sources
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
        }))
      : channel.stream_url
        ? [{ name: "Source #1", url: channel.stream_url, quality: channel.quality || "HD" }]
        : []

  if (allSources.length === 0) {
    return new NextResponse("No sources available for this channel", { status: 404 })
  }

  // Get ads
  const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

  const hasAds = ads && ads.length > 0
  const adUrl = hasAds ? ads[0].ad_url : ""
  const adId = hasAds ? ads[0].id : ""
  const adCount = ads ? ads.length : 0

  // Log view
  await supabase.from("embed_views").insert({
    ww_id: wwId,
    media_type: "live",
    embed_type: "live",
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  const sourcesJson = JSON.stringify(allSources)
  const channelName = (channel.channel_name || "Live TV").replace(/"/g, '\\"')
  const channelLogo = channel.channel_logo || ""
  const quality = channel.quality || "HD"

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${channelName} - WWEmbed Live</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif;color:#fff;min-height:100vh;overflow-x:hidden}
.container{width:100%;height:100vh;display:flex;flex-direction:column}
.header{padding:8px 12px;background:linear-gradient(to bottom,rgba(20,184,166,0.2),transparent);display:flex;align-items:center;gap:8px;flex-shrink:0}
.logo{width:32px;height:32px;object-fit:contain;border-radius:6px;background:rgba(255,255,255,0.1)}
.info h1{font-size:14px;font-weight:600}
.info p{font-size:10px;color:#14b8a6}
.live{background:#ef4444;color:white;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:bold;text-transform:uppercase;margin-left:auto;flex-shrink:0}
.player{flex:1;position:relative;background:#000;min-height:0}
video,iframe{width:100%;height:100%;border:none}
.sources{padding:6px 8px;background:#111;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-shrink:0}
.sources::-webkit-scrollbar{display:none}
.src-btn{padding:6px 12px;background:#222;border:1px solid #333;border-radius:6px;color:#fff;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all 0.2s}
.src-btn:active{transform:scale(0.95)}
.src-btn.active{background:#14b8a6;border-color:#14b8a6;color:#000;font-weight:600}
.footer{padding:6px 12px;background:#111;text-align:center;font-size:10px;color:#666;flex-shrink:0}
.footer a{color:#14b8a6;text-decoration:none}
.overlay{position:fixed;inset:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px}
.overlay.hide{display:none}
.card{background:#fff;border-radius:16px;padding:20px;max-width:380px;width:100%;text-align:center;max-height:90vh;overflow-y:auto}
.card h2{color:#5b6b8a;margin-bottom:16px;font-size:16px}
.box{border-radius:8px;padding:10px;margin:8px 0;text-align:left}
.box-warn{background:#fef3cd;border:2px solid #ffc107;color:#856404}
.box-help{background:#ffe4d6;border:2px solid #ff9a6c;color:#c44d00}
.box-time{background:#fff3cd;border:2px solid #ffc107;color:#664d03}
.box-ok{background:#d4edda;border:2px solid #28a745;color:#155724}
.box b{display:block;font-size:12px}
.box span{font-size:10px;opacity:0.8}
.bar{height:5px;background:#e0e0e0;border-radius:3px;margin:12px 0;overflow:hidden}
.bar-fill{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.3s}
.btn{width:100%;padding:12px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;transition:transform 0.1s}
.btn:active{transform:scale(0.98)}
.btn-purple{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.btn-green{background:#28a745;color:#fff}
.hide{display:none}
.card-footer{margin-top:12px;font-size:10px;color:#888}
.card-footer a{color:#667eea;text-decoration:none}
.ad-badge{background:#ff6b6b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px}
@media(max-width:480px){
.card{padding:16px;margin:8px}
.card h2{font-size:14px}
.box{padding:8px}
.box b{font-size:11px}
.box span{font-size:9px}
.btn{padding:10px;font-size:11px}
}
@media(min-width:481px){
.header{padding:10px 16px;gap:12px}
.logo{width:40px;height:40px}
.info h1{font-size:16px}
.info p{font-size:11px}
.live{font-size:10px;padding:3px 8px}
.sources{padding:8px 12px;gap:8px}
.src-btn{padding:8px 14px;font-size:12px}
.footer{padding:8px 16px;font-size:11px}
}
</style>
</head>
<body>
${
  hasAds
    ? `
<div class="overlay" id="overlay">
<div class="card">
<h2>${channelName}</h2>
<div class="box box-warn"><b>Bloqueur de pub detecte</b><span>Autorisez les popups pour ce site</span></div>
<div class="box box-help" id="boxHelp"><b>Cela aide WaveWatch a rester gratuit</b></div>
<div class="box box-time" id="boxTime"><b>Temps estime : <span id="timer">5</span> secondes</b><span>Cliquez, fermez les pubs, et hop !</span></div>
<div class="box box-ok hide" id="boxThanks"><b>Merci d'avoir soutenu WaveWatch !</b></div>
<div class="box box-ok hide" id="boxDone"><b>Pubs validees !</b><span>Cliquez pour regarder en direct</span></div>
<div class="bar"><div class="bar-fill" id="progress"></div></div>
<button class="btn btn-purple" id="btnUnlock">DEBLOQUER LE DIRECT<span class="ad-badge">x${adCount}</span></button>
<button class="btn btn-green hide" id="btnPlay">REGARDER EN DIRECT</button>
<div class="card-footer">Nos sites <a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a></div>
</div>
</div>
`
    : ""
}
<div class="container">
<div class="header">
${channelLogo ? `<img src="${channelLogo}" alt="${channelName}" class="logo" onerror="this.style.display='none'">` : ""}
<div class="info">
<h1>${channelName}</h1>
<p>${quality}</p>
</div>
<span class="live">LIVE</span>
</div>
<div class="sources" id="sourcesContainer"></div>
<div class="player" id="playerContainer"></div>
<div class="footer">par <a href="https://wavewatch.xyz" target="_blank"><span style="color:#14b8a6">WW</span>Embed</a></div>
</div>
<script>
(function(){
var sources = ${sourcesJson};
var adUrl = "${adUrl}";
var adId = "${adId}";
var hasAds = ${hasAds};
var current = 0;
var playerContainer = document.getElementById("playerContainer");
var hls = null;
var started = false;

function isM3u8(url){
  return url && url.toLowerCase().indexOf(".m3u8") !== -1;
}

function isIframeUrl(url){
  if(!url) return false;
  if(isM3u8(url)) return false;
  return url.indexOf("embed") !== -1 || url.indexOf("player") !== -1 || url.indexOf("iframe") !== -1 || url.indexOf("watch") !== -1;
}

function buildSources(){
  var c = document.getElementById("sourcesContainer");
  if(!c) return;
  c.innerHTML = "";
  if(sources.length <= 1){
    c.style.display = "none";
    return;
  }
  for(var i=0;i<sources.length;i++){
    var b = document.createElement("button");
    b.className = "src-btn" + (i===current?" active":"");
    b.textContent = sources[i].name + " (" + sources[i].quality + ")";
    b.setAttribute("data-i", i.toString());
    b.onclick = function(){
      var idx = parseInt(this.getAttribute("data-i"));
      current = idx;
      var all = document.querySelectorAll(".src-btn");
      for(var j=0;j<all.length;j++) all[j].classList.remove("active");
      this.classList.add("active");
      if(started) loadStream();
    };
    c.appendChild(b);
  }
}

function loadStream(){
  var src = sources[current];
  if(!src || !src.url) return;
  var url = src.url;
  
  playerContainer.innerHTML = "";
  if(hls){hls.destroy();hls=null;}
  
  if(isM3u8(url)){
    var video = document.createElement("video");
    video.id = "video";
    video.controls = true;
    video.setAttribute("playsinline", "");
    video.autoplay = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.background = "#000";
    playerContainer.appendChild(video);
    
    if(typeof Hls !== "undefined" && Hls.isSupported()){
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function(){video.play().catch(function(){});});
    } else if(video.canPlayType("application/vnd.apple.mpegurl")){
      video.src = url;
      video.play().catch(function(){});
    }
  } else {
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.allowFullscreen = true;
    iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    playerContainer.appendChild(iframe);
  }
}

function startPlayer(){
  if(started) return;
  started = true;
  var o = document.getElementById("overlay");
  if(o) o.classList.add("hide");
  buildSources();
  loadStream();
}

if(hasAds && adUrl){
  buildSources();
  var btnU = document.getElementById("btnUnlock");
  var btnP = document.getElementById("btnPlay");
  
  if(btnU){
    btnU.onclick = function(){
      fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:adId})}).catch(function(){});
      window.open(adUrl,"_blank");
      btnU.classList.add("hide");
      var sec = 5;
      var iv = setInterval(function(){
        sec--;
        var tm = document.getElementById("timer");
        var pr = document.getElementById("progress");
        if(tm) tm.textContent = sec.toString();
        if(pr) pr.style.width = ((5-sec)*20) + "%";
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
