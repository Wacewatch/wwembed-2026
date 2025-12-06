import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

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

  const ids = {
    overlay: generateRandomId("m"),
    timer: generateRandomId("t"),
    progress: generateRandomId("g"),
    btnUnlock: generateRandomId("u"),
    btnPlay: generateRandomId("y"),
    boxTime: generateRandomId("bt"),
    boxHelp: generateRandomId("bh"),
    boxThanks: generateRandomId("bk"),
    boxDone: generateRandomId("bd"),
    step1: generateRandomId("s1"),
    step2: generateRandomId("s2"),
    step3: generateRandomId("s3"),
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${channelName} - WWEmbed Live</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif;color:#fff;min-height:100vh;min-height:100dvh;overflow-x:hidden}
.container{width:100%;height:100vh;height:100dvh;display:flex;flex-direction:column}
.header{padding:8px 12px;background:linear-gradient(to bottom,rgba(20,184,166,0.2),transparent);display:flex;align-items:center;gap:8px;flex-shrink:0}
.logo{width:32px;height:32px;object-fit:contain;border-radius:6px;background:rgba(255,255,255,0.1)}
.info h1{font-size:14px;font-weight:600}
.info p{font-size:10px;color:#14b8a6}
.live{background:#ef4444;color:white;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:bold;text-transform:uppercase;margin-left:auto;flex-shrink:0;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
.player{flex:1;position:relative;background:#000;min-height:0}
video,iframe{width:100%;height:100%;border:none}
.sources{padding:6px 8px;background:#111;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-shrink:0}
.sources::-webkit-scrollbar{display:none}
.src-btn{padding:6px 12px;background:#222;border:1px solid #333;border-radius:6px;color:#fff;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all 0.2s}
.src-btn:active{transform:scale(0.95)}
.src-btn.active{background:#14b8a6;border-color:#14b8a6;color:#000;font-weight:600}
.footer{padding:6px 12px;background:#111;text-align:center;font-size:10px;color:#666;flex-shrink:0}
.footer a{color:#14b8a6;text-decoration:none}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px);overflow-y:auto}
.mo.hd{display:none}
.mc{background:rgba(255,255,255,0.98);border-radius:16px;padding:20px;max-width:380px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);margin:auto;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto}
.mc h2{color:#1a1a2e;margin-bottom:6px;font-size:clamp(16px,4vw,20px);font-weight:700}
.mc-sub{color:#6b7280;font-size:clamp(11px,3vw,13px);margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px}
.bx-content{min-width:0}
.bx-content b{display:block;font-size:clamp(12px,3.5vw,14px);margin-bottom:2px}
.bx-content span{font-size:clamp(10px,2.8vw,12px);opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:clamp(12px,3.5vw,14px);font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bt:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.bt:active{transform:scale(0.98)}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 4px 14px rgba(102,126,234,0.4)}
.bg{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,0.4)}
.hd{display:none}
.ft{margin-top:12px;font-size:clamp(9px,2.5vw,11px);color:#9ca3af}
.ft a{color:#667eea;text-decoration:none;font-weight:500}
.tg{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:600}
@media(max-height:500px){
.mc{padding:16px;border-radius:12px}
.bx{padding:10px;margin:6px 0}
.steps{margin-bottom:12px}
.pb{margin:10px 0}
.bt{padding:10px}
}
@media(max-width:360px){
.mo{padding:8px}
.mc{padding:16px;border-radius:12px}
.bx{padding:10px;gap:8px}
.bx svg{width:16px;height:16px}
}
</style>
</head>
<body>
${
  hasAds
    ? `
<div class="mo" id="${ids.overlay}">
<div class="mc">
<h2>${channelName}</h2>
<div class="mc-sub">Le direct est prêt - une dernière étape</div>
<div class="steps">
<div class="step active" id="${ids.step1}"></div>
<div class="step" id="${ids.step2}"></div>
<div class="step" id="${ids.step3}"></div>
</div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="bx bh" id="${ids.boxHelp}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<div class="bx bi" id="${ids.boxTime}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
<div class="bx-content"><b>Temps restant: <span id="${ids.timer}">5</span>s</b><span>Cliquez et fermez la fenêtre</span></div>
</div>
<div class="bx bo hd" id="${ids.boxThanks}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div class="bx-content"><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div>
</div>
<div class="bx bo hd" id="${ids.boxDone}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
<div class="bx-content"><b>Tout est prêt !</b><span>Cliquez pour regarder en direct</span></div>
</div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">Continuer<span class="tg">PUB</span></button>
<button class="bt bg hd" id="${ids.btnPlay}">Regarder en direct</button>
<div class="ft">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
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
var _ids = ${JSON.stringify(ids)};

function isM3u8(url){
  return url && url.toLowerCase().indexOf(".m3u8") !== -1;
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
  var o = document.getElementById(_ids.overlay);
  if(o) o.classList.add("hd");
  buildSources();
  loadStream();
}

if(hasAds && adUrl){
  buildSources();
  var btnU = document.getElementById(_ids.btnUnlock);
  var btnP = document.getElementById(_ids.btnPlay);
  
  if(btnU){
    btnU.onclick = function(){
      fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:adId})}).catch(function(){});
      window.open(adUrl,"_blank");
      btnU.classList.add("hd");
      document.getElementById(_ids.step1).classList.remove("active");
      document.getElementById(_ids.step1).classList.add("done");
      document.getElementById(_ids.step2).classList.add("active");
      var sec = 5;
      var iv = setInterval(function(){
        sec--;
        var tm = document.getElementById(_ids.timer);
        var pr = document.getElementById(_ids.progress);
        if(tm) tm.textContent = sec.toString();
        if(pr) pr.style.width = ((5-sec)*20) + "%";
        if(sec <= 0){
          clearInterval(iv);
          document.getElementById(_ids.step2).classList.remove("active");
          document.getElementById(_ids.step2).classList.add("done");
          document.getElementById(_ids.step3).classList.add("active");
          var bt = document.getElementById(_ids.boxTime);
          var bh = document.getElementById(_ids.boxHelp);
          var bth = document.getElementById(_ids.boxThanks);
          var bd = document.getElementById(_ids.boxDone);
          if(bt) bt.classList.add("hd");
          if(bh) bh.classList.add("hd");
          if(bth) bth.classList.remove("hd");
          if(bd) bd.classList.remove("hd");
          if(pr) pr.style.width = "100%";
          if(btnP) btnP.classList.remove("hd");
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
