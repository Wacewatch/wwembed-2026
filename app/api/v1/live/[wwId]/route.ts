import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, props: { params: Promise<{ wwId: string }> }) {
  try {
    const params = await props.params
    const { wwId } = params
    const match = wwId.match(/^ww-live-(.+)$/i)
    if (!match) return new NextResponse("Invalid WW ID format", { status: 400 })

    const channelIdPart = match[1]
    const supabase = createAdminClient()

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
    if (!channel) return new NextResponse("Channel not found", { status: 404 })

    const { data: sources } = await supabase
      .from("live_tv_sources")
      .select("*")
      .eq("channel_id", channel.id)
      .eq("is_active", true)
      .eq("status", "approved")
      .order("priority", { ascending: true })

    const allSources =
      sources && sources.length > 0
        ? sources.map((s, i) => ({
            name: s.source_name || "Source #" + (i + 1),
            url: s.stream_url,
            quality: s.quality || "HD",
            language: s.language || "VO",
            priority: s.priority || 999,
          }))
        : channel.stream_url
          ? [
              {
                name: "Source #1",
                url: channel.stream_url,
                quality: channel.quality || "HD",
                language: channel.language || "VO",
                priority: 1,
              },
            ]
          : []

    if (allSources.length === 0) return new NextResponse("No sources available", { status: 404 })

    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
    const activeAds = ads || []
    const hasAds = activeAds.length > 0
    const randomAd = hasAds ? activeAds[Math.floor(Math.random() * activeAds.length)] : null
    const adUrl = randomAd?.ad_url || ""
    const adId = randomAd?.id || ""

    const { data: siteSettings } = await supabase.from("site_settings").select("*").single()
    const tickerEnabled = siteSettings?.live_tv_ticker_enabled ?? false
    const tickerMessage = siteSettings?.live_tv_ticker_message ?? ""
    const tickerSpeed = siteSettings?.live_tv_ticker_speed ?? 50
    const tickerBgColor = siteSettings?.live_tv_ticker_bg_color ?? "#ef4444"
    const tickerTextColor = siteSettings?.live_tv_ticker_text_color ?? "#ffffff"

    // Insert view - tmdb_id is null for live TV, use ww_id for identification
    const referer = request.headers.get("referer") || request.headers.get("referrer") || null
    await supabase.from("embed_views").insert({
      ww_id: wwId,
      media_type: "live",
      embed_type: "live",
      tmdb_id: null,
      referrer: referer,
      user_agent: request.headers.get("user-agent"),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/</g, "\\u003c")
    const channelName = channel.channel_name || "Live TV"
    const channelLogo = channel.channel_logo || ""
    const animationDuration = Math.max(10, 100 - tickerSpeed / 2)

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>${channelName} - Live TV</title>
<link href="https://vjs.zencdn.net/8.5.2/video-js.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css">
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js"></script>
<script src="https://vjs.zencdn.net/8.5.2/video.min.js"></script>
<script src="https://cdn.plyr.io/3.7.8/plyr.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:system-ui,-apple-system,sans-serif;background:#000;color:#fff;overflow:hidden;height:100vh;}
.top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(20,20,20,0.95);backdrop-filter:blur(10px);position:relative;z-index:100;border-bottom:1px solid rgba(255,255,255,0.1);}
.top-left{display:flex;align-items:center;gap:12px;}
.logo{color:#e63946;font-size:18px;font-weight:700;letter-spacing:1px;}
.channel-info{display:flex;align-items:center;gap:8px;}
.channel-icon{width:32px;height:32px;border-radius:6px;object-fit:cover;background:#333;}
.channel-name{font-size:16px;font-weight:600;}
.live-badge{background:#e63946;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.5px;}
.top-right{display:flex;align-items:center;gap:8px;}
.btn{background:rgba(255,255,255,0.1);border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:all 0.2s;display:flex;align-items:center;gap:6px;}
.btn:hover{background:rgba(255,255,255,0.2);transform:translateY(-1px);}
.btn.primary{background:#e63946;}
.btn.primary:hover{background:#d62936;}
.icon-btn{background:rgba(255,255,255,0.1);border:none;color:#fff;width:36px;height:36px;border-radius:6px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
.icon-btn:hover{background:rgba(255,255,255,0.2);transform:translateY(-1px);}
.container{height:calc(100vh - 65px);position:relative;background:#000;}
.player{width:100%;height:100%;position:relative;background:#000;}
.player video,.player iframe{width:100%;height:100%;display:block;background:#000;}
.player iframe{border:none;}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;font-size:16px;}

.player-controls{display:flex;align-items:center;gap:8px;}
.player-select{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;}
.player-select:hover{background:rgba(255,255,255,0.2);}
.player-select option{background:#1a1a1a;color:#fff;}
.reload-btn{background:rgba(255,255,255,0.1);border:none;color:#fff;width:32px;height:32px;border-radius:6px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
.reload-btn:hover{background:rgba(255,255,255,0.2);transform:rotate(90deg);}
.help-hint{position:absolute;top:80px;right:16px;background:rgba(230,57,70,0.95);color:#fff;padding:8px 12px;border-radius:6px;font-size:12px;display:flex;align-items:center;gap:6px;animation:fadeIn 0.3s;z-index:50;max-width:250px;}
.help-hint.hidden{display:none;}
@keyframes fadeIn{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}

.modal{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:200;display:none;align-items:center;justify-content:center;padding:20px;}
.modal.sh{display:flex;}
.modal-content{background:#1a1a1a;border-radius:12px;max-width:800px;width:100%;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.1);}
.modal-header{padding:20px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;}
.modal-title{font-size:20px;font-weight:600;}
.close-btn{background:none;border:none;color:#fff;font-size:28px;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:background 0.2s;}
.close-btn:hover{background:rgba(255,255,255,0.1);}
.modal-body{padding:20px;overflow-y:auto;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;}
.card{background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;cursor:pointer;transition:all 0.2s;border:2px solid transparent;position:relative;}
.card:hover{background:rgba(255,255,255,0.1);transform:translateY(-2px);}
.card.act{border-color:#e63946;background:rgba(230,57,70,0.1);}
.card-badge{position:absolute;top:8px;right:8px;background:#e63946;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;}
.card-icon{font-size:32px;text-align:center;margin-bottom:8px;opacity:0.7;}
.card-name{font-size:14px;font-weight:600;text-align:center;margin-bottom:8px;}
.card-tags{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;}
.tag{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;}
.tag-vf{background:#4caf50;color:#fff;}
.tag-vost{background:#2196f3;color:#fff;}
.tag-multi{background:#ff9800;color:#fff;}
.tag-vo{background:#666;color:#fff;}
textarea{width:100%;min-height:120px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:12px;border-radius:8px;font-family:monospace;font-size:13px;resize:vertical;}
textarea:focus{outline:none;border-color:#e63946;}
.bug-info{background:rgba(230,57,70,0.1);border:1px solid rgba(230,57,70,0.3);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:#ddd;}

.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px)}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:24px;max-width:400px;width:100%;text-align:center}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:20px;font-weight:700}
.mc-sub{color:#6b7280;font-size:13px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px}
.bx-content b{display:block;font-size:14px;margin-bottom:2px}
.bx-content span{font-size:12px;opacity:0.8}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:11px;color:#9ca3af}
.cf a{color:#667eea}
.adtag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:600}

@media(max-width:768px){
.top{flex-direction:column;gap:12px;padding:12px;}
.top-left,.top-right{width:100%;justify-content:space-between;}
.logo{font-size:16px;}
.channel-name{font-size:14px;}
.btn{padding:6px 12px;font-size:13px;}
.grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;}
.modal-content{max-height:90vh;}
.help-hint{top:120px;font-size:11px;right:8px;max-width:200px;}
.player-select{font-size:12px;padding:5px 10px;}
}
</style>
</head>
<body>
<div class="top">
<div class="top-left">
<div class="logo">▶ WWEMBED</div>
<div class="channel-info">
<img class="channel-icon" src="${channelLogo}" alt="${channelName}">
<span class="channel-name">${channelName}</span>
<span class="live-badge">LIVE</span>
</div>
</div>
<div class="top-right">
<div class="player-controls">
<select class="player-select" id="playerSelector">
<option value="native">HTML5 Native</option>
<option value="hlsjs">HLS.js</option>
<option value="videojs">Video.js</option>
<option value="plyr">Plyr</option>
</select>
<button class="reload-btn" id="reloadBtn" title="Recharger le lecteur">🔄</button>
</div>
<button class="btn primary" id="srcBtn" onclick="toggleModal('srcModal')">≡ <span id="srcLabel">Source #1</span></button>
<button class="icon-btn" id="fullscreenBtn" title="Plein écran">⛶</button>
<button class="icon-btn" id="castBtn" title="Cast">📱</button>
<button class="icon-btn" onclick="toggleModal('bugModal')">⚠</button>
</div>
</div>
<div class="container">
<div class="player" id="player">
<div class="help-hint" id="helpHint">← Si la lecture ne fonctionne pas, changez de lecteur</div>
<div class="no-src">Chargement...</div>
</div>
</div>
<div class="modal" id="srcModal">
<div class="modal-content">
<div class="modal-header">
<span class="modal-title">Choisir une source</span>
<button class="close-btn" onclick="toggleModal('srcModal')">&times;</button>
</div>
<div class="modal-body">
<div class="grid" id="srcGrid"></div>
</div>
</div>
</div>
<div class="modal" id="bugModal">
<div class="modal-content">
<div class="modal-header">
<span class="modal-title">Signaler un problème</span>
<button class="close-btn" onclick="toggleModal('bugModal')">&times;</button>
</div>
<div class="modal-body">
<div class="bug-info">Décrivez le problème rencontré avec cette source</div>
<textarea id="bugDesc" placeholder="Ex: La vidéo ne charge pas, le son est désynchronisé..."></textarea>
<button class="btn primary" style="margin-top:12px;width:100%;" onclick="sendBug()">Envoyer le rapport</button>
</div>
</div>
</div>

<div class="mo" id="adOverlay">
<div class="mc">
<h2>Accédez au flux en direct</h2>
<div class="mc-sub">Une dernière étape avant de regarder</div>
<div class="steps">
<div class="step active" id="step1"></div>
<div class="step" id="step2"></div>
</div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="bx bh" id="boxHelp">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<div class="bx bo hi" id="boxDone">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div class="bx-content"><b>Tout est prêt !</b><span>Le flux va démarrer</span></div>
</div>
<div class="pb"><div class="pf" id="progress"></div></div>
<button class="bt bp" id="btnUnlock">Continuer<span class="adtag">PUB</span></button>
<button class="bt bn hi" id="btnStart">Démarrer la lecture</button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>

<script>
var _src=${sourcesJson};
var _ads=${JSON.stringify(activeAds)};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _adIndex=0;
var _idx=0;
var _started=false;
var _wwId="${wwId}";
var _channelName="${channelName.replace(/"/g, '\\"')}";
var _currentPlayer=null;
var _currentPlayerType="native";

function $(id){return document.getElementById(id);}

function tagClass(l){
l=(l||"").toUpperCase();
if(l.indexOf("VF")>=0||l.indexOf("FRENCH")>=0||l.indexOf("FRANÇAIS")>=0)return"tag-vf";
if(l.indexOf("VOST")>=0)return"tag-vost";
if(l.indexOf("MULTI")>=0)return"tag-multi";
return"tag-vo";
}

function buildGrid(){
var g=$("srcGrid");if(!g)return;
if(!_src||!_src.length){g.innerHTML="<div style='grid-column:1/-1;text-align:center;padding:30px;color:#666'>Aucune source</div>";return;}
g.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(index){
var s=_src[index];
var d=document.createElement("div");
d.className="card"+(index===_idx?" act":"");
d.innerHTML="<div class='card-badge'>"+(s.quality||"HD")+"</div><div class='card-icon'>▶</div><div class='card-name'>"+s.name+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
d.onclick=function(){
_idx=index;
var cards=document.querySelectorAll(".card");
for(var j=0;j<cards.length;j++){
cards[j].classList.toggle("act",j===index);
}
$("srcLabel").textContent=s.name;
toggleModal("srcModal");
if(_started){
cleanupPlayer();
loadPlayer();
}
};
g.appendChild(d);
})(i);
}
}

function toggleModal(id){var m=$(id);if(m)m.classList.toggle("sh");}

function cleanupPlayer(){
if(_currentPlayer){
try{
if(_currentPlayerType==="hlsjs"&&_currentPlayer.destroy){_currentPlayer.destroy();}
else if(_currentPlayerType==="plyr"&&_currentPlayer.destroy){_currentPlayer.destroy();}
else if(_currentPlayerType==="videojs"&&_currentPlayer.dispose){_currentPlayer.dispose();}
}catch(e){}
_currentPlayer=null;
}
var p=$("player");
if(p){
var iframes=p.querySelectorAll("iframe");
for(var i=0;i<iframes.length;i++){iframes[i].remove();}
var videos=p.querySelectorAll("video");
for(var i=0;i<videos.length;i++){videos[i].remove();}
}
}

function loadPlayer(){
var p=$("player");if(!p||!_src||!_src.length)return;
var s=_src[_idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
var url=s.url;
var hint=$("helpHint");
cleanupPlayer();

var isIframe=url.indexOf("http")===0&&url.indexOf(".m3u8")===-1&&url.indexOf("m3u8")===-1;
if(isIframe){
p.innerHTML='<iframe src="'+url+'" allowfullscreen allow="autoplay;fullscreen;encrypted-media;picture-in-picture"></iframe>';
if(hint)hint.classList.add("hidden");
return;
}

if(hint)hint.classList.remove("hidden");

_currentPlayerType=$("playerSelector").value;

if(_currentPlayerType==="native"){
p.innerHTML='<video id="vid" controls autoplay></video>';
var vid=document.getElementById("vid");
if(vid){
vid.src=url;
vid.play().catch(function(e){console.log("Autoplay blocked:",e);});
}
}else if(_currentPlayerType==="hlsjs"){
p.innerHTML='<video id="vid" controls autoplay></video>';
var vid=document.getElementById("vid");
if(vid&&typeof Hls!=="undefined"&&Hls.isSupported()){
_currentPlayer=new Hls({enableWorker:true,lowLatencyMode:true});
_currentPlayer.loadSource(url);
_currentPlayer.attachMedia(vid);
_currentPlayer.on(Hls.Events.MANIFEST_PARSED,function(){vid.play().catch(function(){});});
_currentPlayer.on(Hls.Events.ERROR,function(e,data){if(data.fatal){console.error("HLS error:",data);}});
}else if(vid){vid.src=url;vid.play().catch(function(){});}
}else if(_currentPlayerType==="videojs"){
p.innerHTML='<video id="vid" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay></video>';
setTimeout(function(){
if(typeof videojs!=="undefined"){
_currentPlayer=videojs("vid",{autoplay:true,controls:true,fluid:true});
_currentPlayer.src({src:url,type:"application/x-mpegURL"});
}
},100);
}else if(_currentPlayerType==="plyr"){
p.innerHTML='<video id="vid" controls autoplay></video>';
setTimeout(function(){
if(typeof Plyr!=="undefined"){
var vid=document.getElementById("vid");
if(vid){
if(typeof Hls!=="undefined"&&Hls.isSupported()){
var hls=new Hls();
hls.loadSource(url);
hls.attachMedia(vid);
hls.on(Hls.Events.MANIFEST_PARSED,function(){
_currentPlayer=new Plyr(vid,{autoplay:true});
});
}else{
vid.src=url;
_currentPlayer=new Plyr(vid,{autoplay:true});
}
}
}
},100);
}
}

function sendBug(){
var desc=$("bugDesc").value.trim();if(!desc){alert("Décrivez le problème");return;}
$("bugDesc").disabled=true;
var currentSource=_src[_idx]||{};
fetch("/api/bug-reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({wwId:_wwId,title:_channelName,sourceName:currentSource.name||"",sourceUrl:currentSource.url||"",message:desc,embedType:"live"})})
.then(function(r){return r.json()}).then(function(){
$("bugModal").classList.remove("sh");
alert("Rapport envoyé avec succès !");
$("bugDesc").disabled=false;
$("bugDesc").value="";
}).catch(function(){alert("Erreur");$("bugDesc").disabled=false;});
}

$("playerSelector")&&($("playerSelector").onchange=loadPlayer);
$("reloadBtn")&&($("reloadBtn").onclick=loadPlayer);

function toggleFullscreen(){
var p=$("player");
if(!document.fullscreenElement&&!document.webkitFullscreenElement){
if(p.requestFullscreen){p.requestFullscreen();}
else if(p.webkitRequestFullscreen){p.webkitRequestFullscreen();}
}else{
if(document.exitFullscreen){document.exitFullscreen();}
else if(document.webkitExitFullscreen){document.webkitExitFullscreen();}
}
}

function initCast(){
var vid=$("vid");
if(!vid)return;
if('RemotePlayback' in HTMLMediaElement.prototype){
vid.remote.watchAvailability(function(available){
if(available){
vid.remote.prompt().catch(function(){});
}
}).catch(function(){});
}else if(window.chrome&&chrome.cast){
chrome.cast.requestSession(function(s){
var mediaInfo=new chrome.cast.media.MediaInfo(_src[_idx].url,"application/x-mpegURL");
var request=new chrome.cast.media.LoadRequest(mediaInfo);
s.loadMedia(request);
},function(){});
}
}

function startPlayer(){
if(_started)return;
_started=true;
var ov=$("adOverlay");
if(ov){
ov.style.display="none";
ov.classList.add("hi");
}
buildGrid();
if(_src&&_src.length){
$("srcLabel").textContent=_src[0].name;
loadPlayer();
}
}

function processAd(){
fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:_ads[_adIndex].id})});
window.open(_ads[_adIndex].ad_url,"_blank");
$("btnUnlock").classList.add("hi");
if($("step1"))$("step1").classList.remove("active");$("step1").classList.add("done");
if($("step2"))$("step2").classList.add("active");
if($("boxHelp"))$("boxHelp").classList.add("hi");
if($("boxDone"))$("boxDone").classList.remove("hi");
if($("progress"))$("progress").style.width="100%";
if($("btnStart"))$("btnStart").classList.remove("hi");
}

function resetAdUI(){
$("btnUnlock").classList.remove("hi");
if($("step2"))$("step2").classList.remove("active");
if($("boxHelp"))$("boxHelp").classList.remove("hi");
if($("boxDone"))$("boxDone").classList.add("hi");
if($("progress"))$("progress").style.width="0%";
}

function updateAdCounter(){
var ov=$("adOverlay");
var pr=$("progress");
if(ov&&pr){
var width=(_adIndex+1)/_ads.length*100+"%";
pr.style.width=width;
}
}

if(_h&&_ads.length>0){
var ov=$("adOverlay");
if(ov)ov.style.display="flex";
updateAdCounter();
var btnUnlock=$("btnUnlock");
var btnStart=$("btnStart");
if(btnUnlock)btnUnlock.onclick=function(){processAd();};
if(btnStart)btnStart.onclick=function(){
console.log("[v0] Start button clicked, starting player");
var ov=$("adOverlay");
if(ov){
ov.style.display="none";
ov.classList.add("hi");
}
startPlayer();
};
}else{
startPlayer();
}

$("srcBtn")&&($("srcBtn").onclick=function(){toggleModal("srcModal")});
$("srcModal")&&($("srcModal").onclick=function(e){if(e.target===$("srcModal"))toggleModal("srcModal");});
$("fullscreenBtn")&&($("fullscreenBtn").onclick=toggleFullscreen);
$("castBtn")&&($("castBtn").onclick=initCast);

</script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("[v0] Live route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
