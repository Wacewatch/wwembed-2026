import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, { params }: { params: { wwId: string } }) {
  try {
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
    const adsJson = JSON.stringify(activeAds.map((a) => ({ id: a.id, url: a.ad_url, name: a.name }))).replace(
      /</g,
      "\\u003c",
    )

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
<script>
var _src=${sourcesJson};
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
cleanupPlayer();
loadPlayer();
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
$("bugDesc").disabled=true;$("bugDesc").textContent="Envoi...";
var currentSource=_src[_idx]||{};
fetch("/api/bug-reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({wwId:_wwId,title:_channelName,sourceName:currentSource.name||"",sourceUrl:currentSource.url||"",message:desc,embedType:"live"})})
.then(function(r){return r.json()}).then(function(){
$("bugModal").classList.remove("sh");
alert("Rapport envoyé avec succès !");
}).catch(function(){alert("Erreur");$("bugDesc").disabled=false;$("bugDesc").textContent="Envoyer le rapport";});
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
if(_started)return;_started=true;
var ov=$("adOverlay");if(ov)ov.classList.remove("sh");
buildGrid();
if(_src&&_src.length){$("srcLabel").textContent=_src[0].name;loadPlayer();}
}

$("srcBtn")&&($("srcBtn").onclick=function(){toggleModal("srcModal")});
$("closeModal")&&($("closeModal").onclick=function(){toggleModal("srcModal")});
$("srcModal")&&($("srcModal").onclick=function(e){if(e.target===$("srcModal"))toggleModal("srcModal");});

$("fullscreenBtn")&&($("fullscreenBtn").onclick=toggleFullscreen);
$("castBtn")&&($("castBtn").onclick=initCast);

startPlayer();

</script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
