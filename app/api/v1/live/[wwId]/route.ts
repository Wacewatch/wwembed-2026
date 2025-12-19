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

    const allSources =
      sources && sources.length > 0
        ? sources.map((s, i) => ({
            name: s.source_name || "Source #" + (i + 1),
            url: s.stream_url,
            quality: s.quality || "HD",
            language: s.language || "VO",
          }))
        : channel.stream_url
          ? [
              {
                name: "Source #1",
                url: channel.stream_url,
                quality: channel.quality || "HD",
                language: channel.language || "VO",
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
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${channelName} - WWEmbed Live</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
<script src="https://cdn.plyr.io/3.7.8/plyr.js"></script>
<link href="https://vjs.zencdn.net/8.10.0/video-js.css" rel="stylesheet" />
<script src="https://vjs.zencdn.net/8.10.0/video.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@videojs/http-streaming@3.10.0/dist/videojs-http-streaming.min.js"></script>
<script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:system-ui,sans-serif;background:#0a0a0f;color:#fff}
.wrap{display:flex;flex-direction:column;height:100%}
.hdr{display:flex;align-items:center;padding:10px 14px;background:#151520;border-bottom:1px solid #222;gap:12px;flex-wrap:wrap}
@media(max-width:600px){.hdr{padding:8px 10px;gap:8px}}
.logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#ef4444}
@media(max-width:600px){.logo{font-size:11px}}
.ttl{flex:1;font-size:13px;font-weight:600;color:#ccc;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:8px}
@media(max-width:600px){.ttl{font-size:11px;flex-basis:100%;order:1}}
.ttl img{width:24px;height:24px;border-radius:4px;object-fit:contain;background:#fff}
@media(max-width:600px){.ttl img{width:20px;height:20px}}
.live{background:#ef4444;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
.hdr-actions{display:flex;gap:8px;align-items:center}
@media(max-width:600px){.hdr-actions{gap:6px}}
.icon-btn{background:#333;border:none;color:#fff;width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:all 0.2s}
@media(max-width:600px){.icon-btn{width:32px;height:32px;font-size:14px}}
.icon-btn:hover{background:#444;transform:scale(1.05)}
.icon-btn.active{background:#ef4444}
.src-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:linear-gradient(135deg,#ef4444,#f97316);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
@media(max-width:600px){.src-btn{padding:6px 10px;font-size:11px}}
.player{flex:1;background:#000;position:relative;display:flex;align-items:center;justify-content:center}
.player iframe,.player video{width:100%;height:100%;position:absolute;inset:0;border:none}
.player .plyr,.player .video-js{width:100%!important;height:100%!important}
.player-controls{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.8),transparent);padding:12px;display:flex;align-items:center;gap:10px;z-index:10;opacity:0;transition:opacity 0.3s}
.player:hover .player-controls{opacity:1}
@media(max-width:600px){.player-controls{opacity:1;padding:8px}}
.player-selector{flex:1;background:#1a1a2e;border:1px solid #333;color:#fff;padding:8px 12px;border-radius:6px;font-size:12px;cursor:pointer}
@media(max-width:600px){.player-selector{font-size:11px;padding:6px 8px}}
.reload-btn{background:#ef4444;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}
@media(max-width:600px){.reload-btn{padding:6px 10px;font-size:11px}}
.reload-btn:hover{background:#dc2626}
.status-indicator{background:rgba(0,0,0,0.7);padding:4px 10px;border-radius:4px;font-size:11px}
@media(max-width:600px){.status-indicator{font-size:10px;padding:3px 8px}}
.iframe-msg{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(239,68,68,0.9);color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:5;pointer-events:none}
@media(max-width:600px){.iframe-msg{font-size:11px;padding:10px 16px;max-width:80%}}
.no-src{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:8px}
.error-box{background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:8px;padding:16px;max-width:400px;text-align:center}
.error-box h3{color:#ef4444;margin-bottom:8px}
.error-box p{color:#999;font-size:13px;margin-bottom:12px}
.retry-btn{background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:380px){.grid{grid-template-columns:1fr}}
.card{background:#1e1e2c;border:1px solid #333;border-radius:10px;padding:14px;cursor:pointer;position:relative}
.card:hover{border-color:#ef4444}
.card.act{border-color:#ef4444;background:#2a1a1a}
.card.err{opacity:0.5;cursor:not-allowed}
.card-priority{position:absolute;top:10px;left:10px;padding:3px 7px;background:#10b981;border-radius:5px;font-size:9px;font-weight:700}
.card-badge{position:absolute;top:10px;right:10px;padding:3px 7px;background:#22c55e;border-radius:5px;font-size:9px;font-weight:700}
.card-type{position:absolute;bottom:10px;right:10px;padding:2px 6px;background:#8b5cf6;border-radius:4px;font-size:8px;font-weight:700}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(239,68,68,0.95) 0%,rgba(249,115,22,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;backdrop-filter:blur(8px)}
.mo.sh{display:flex}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:24px;max-width:400px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4)}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:18px;font-weight:700}
.mc-sub{color:#6b7280;font-size:13px;margin-bottom:16px}
.ad-counter{background:#ef4444;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block;margin-bottom:12px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#ef4444,#f97316);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx b{display:block;font-size:13px;margin-bottom:2px}
.bx span{font-size:11px;opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fee2e2,#fecaca);border:1px solid #ef4444;color:#991b1b}
.bi{background:linear-gradient(135deg,#fef3c7,#fed7aa);border:1px solid #f97316;color:#9a3412}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:14px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#ef4444,#f97316);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bp{background:linear-gradient(135deg,#ef4444,#f97316);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:10px;color:#9ca3af}
.cf a{color:#ef4444;text-decoration:none}
.tg{background:#f97316;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px;font-weight:600}
</style>
</head>
<body>
<div class="mo" id="adOverlay">
<div class="mc">
<h2>Accéder au direct</h2>
<div class="mc-sub">Une dernière étape pour regarder</div>
<div class="ad-counter" id="adCounter">Pub 1/1</div>
<div class="steps"><div class="step active" id="step1"></div><div class="step" id="step2"></div><div class="step" id="step3"></div></div>
<div class="bx bw"><div><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div></div>
<div class="bx bh" id="boxHelp"><div><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div></div>
<div class="bx bi" id="boxTime"><div><b>Temps restant: <span id="timer">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div></div>
<div class="bx bo hi" id="boxThanks"><div><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div></div>
<div class="bx bo hi" id="boxDone"><div><b>Tout est prêt !</b><span>Cliquez pour lancer le lecteur</span></div></div>
<div class="pb"><div class="pf" id="progress"></div></div>
<button class="bt bp" id="btnUnlock">Continuer<span class="tg">PUB</span></button>
<button class="bt bn hi" id="btnPlay">Lancer le direct</button>
<button class="bt bp hi" id="btnNext">Pub suivante<span class="tg">PUB</span></button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>
<div class="wrap">
<div class="hdr">
<div class="logo">▶ WWEMBED</div>
<div class="ttl">${channelLogo ? `<img src="${channelLogo}" alt="">` : ""}${channelName}<span class="live">LIVE</span></div>
<div class="hdr-actions">
<button class="src-btn" id="srcBtn">☰ <span id="srcLabel">Source #1</span></button>
<button class="icon-btn" id="fullscreenBtn" title="Plein écran">⛶</button>
<button class="icon-btn" id="castBtn" title="Caster">📡</button>
<button class="icon-btn" id="rptBtn" title="Signaler">⚠</button>
</div>
</div>
<div class="player" id="player">
<div class="no-src">Chargement...</div>
<div class="player-controls" id="playerControls">
<select class="player-selector" id="playerSelector">
<option value="hlsjs">HLS.js (Recommandé)</option>
<option value="plyr">Plyr</option>
<option value="videojs">Video.js</option>
<option value="native">HTML5 Native</option>
</select>
<button class="reload-btn" id="reloadBtn">🔄 Recharger</button>
<div class="status-indicator" id="statusIndicator">Prêt</div>
</div>
</div>
<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr">
<div><div class="modal-ttl">Choisir une source</div><div class="modal-sub">Sélectionnez un flux</div></div>
<button class="modal-close" id="closeModal">×</button>
</div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div>
</div>
<div class="modal" id="rptModal">
<div class="modal-box">
<div class="modal-hdr">
<div><div class="modal-ttl" style="color:#ef4444">Signaler un problème</div><div class="modal-sub">Aidez-nous à améliorer</div></div>
<button class="modal-close" id="rptClose">×</button>
</div>
<div class="modal-body">
<div class="rpt-form" id="rptForm">
<p style="color:#94a3b8;font-size:13px;margin-bottom:8px">Décrivez le problème</p>
<textarea id="rptMsg" placeholder="Décrivez le problème..."></textarea>
<button type="button" id="rptSubmit">Envoyer</button>
</div>
<div class="rpt-success hi" id="rptSuccess"><div style="font-size:48px;margin-bottom:12px">✓</div><p style="font-weight:600">Merci !</p></div>
</div>
</div>
</div>
<script>
(function(){
var _src=${sourcesJson};
var _ads=${adsJson};
var _hasAds=${hasAds};
var _adIndex=0;
var _idx=0;
var _started=false;
var _wwId="${wwId}";
var _channelName="${channelName.replace(/"/g, '\\"')}";
var _currentHls=null;
var _currentPlyr=null;
var _currentVjs=null;
var _currentPlayerType="hlsjs";
var _failedSources=[];
var _retryAttempts=0;
var _maxRetries=3;
var _isIframe=false;
var _castSession=null;

function $(id){return document.getElementById(id);}

function sortSourcesByPriority(){
if(!_src||!_src.length)return;
_src.sort(function(a,b){
var aPriority=0;
var bPriority=0;
if((a.url||"").indexOf(".m3u8")>=0)aPriority+=10;
if((b.url||"").indexOf(".m3u8")>=0)bPriority+=10;
var qA=(a.quality||"").toUpperCase();
var qB=(b.quality||"").toUpperCase();
if(qA.indexOf("4K")>=0||qA.indexOf("UHD")>=0)aPriority+=8;
else if(qA.indexOf("FHD")>=0||qA.indexOf("1080")>=0)aPriority+=6;
else if(qA.indexOf("HD")>=0||qA.indexOf("720")>=0)aPriority+=4;
if(qB.indexOf("4K")>=0||qB.indexOf("UHD")>=0)bPriority+=8;
else if(qB.indexOf("FHD")>=0||qB.indexOf("1080")>=0)bPriority+=6;
else if(qB.indexOf("HD")>=0||qB.indexOf("720")>=0)bPriority+=4;
return bPriority-aPriority;
});
}

function tagClass(l){
l=(l||"").toUpperCase();
if(l.indexOf("VF")>=0||l.indexOf("FRENCH")>=0||l.indexOf("FRANÇAIS")>=0)return"tag-vf";
if(l.indexOf("VOST")>=0)return"tag-vost";
if(l.indexOf("MULTI")>=0)return"tag-multi";
return"tag-vo";
}

function isIframeUrl(url){
var lower=url.toLowerCase();
return lower.indexOf("iframe")>=0||lower.indexOf("embed")>=0||lower.indexOf("player")>=0||(lower.indexOf("http")===0&&lower.indexOf(".m3u8")<0&&lower.indexOf(".mp4")<0);
}

function buildGrid(){
var g=$("srcGrid");if(!g)return;
if(!_src||!_src.length){g.innerHTML="<div style='grid-column:1/-1;text-align:center;padding:30px;color:#666'>Aucune source</div>";return;}
g.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(index){
var s=_src[index];
var d=document.createElement("div");
var isFailed=_failedSources.indexOf(index)>=0;
var isIframe=isIframeUrl(s.url);
d.className="card"+(index===_idx?" act":"")+(isFailed?" err":"");
var priorityBadge=index<3?'<div class="card-priority">P'+(index+1)+'</div>':"";
var typeBadge=isIframe?'<div class="card-type">IFRAME</div>':"";
d.innerHTML=priorityBadge+"<div class='card-badge'>"+(s.quality||"HD")+"</div>"+typeBadge+"<div class='card-icon'>▶</div><div class='card-name'>"+s.name+(isFailed?" ✕":"")+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
if(!isFailed){
d.onclick=function(){_idx=index;_retryAttempts=0;var cards=document.querySelectorAll(".card");for(var j=0;j<cards.length;j++){cards[j].classList.toggle("act",j===index);}$("srcLabel").textContent=s.name;toggleModal("srcModal");loadPlayer();};
}
g.appendChild(d);
})(i);
}
}

function toggleModal(id){var m=$(id);if(m)m.classList.toggle("sh");}

function cleanupPlayer(){
if(_currentHls){try{_currentHls.destroy();}catch(e){}_currentHls=null;}
if(_currentPlyr){try{_currentPlyr.destroy();}catch(e){}_currentPlyr=null;}
if(_currentVjs){try{_currentVjs.dispose();}catch(e){}_currentVjs=null;}
}

function updateStatus(msg){var el=$("statusIndicator");if(el)el.textContent=msg;}

function showError(msg){
var p=$("player");if(!p)return;
p.innerHTML='<div class="no-src"><div class="error-box"><h3>Erreur de lecture</h3><p>'+msg+'</p><button class="retry-btn" onclick="window.retryLoad()">Réessayer</button></div></div>';
updateStatus("Erreur");
}

function tryNextSource(){
if(_failedSources.indexOf(_idx)<0){_failedSources.push(_idx);}
var nextIdx=-1;
for(var i=0;i<_src.length;i++){
if(_failedSources.indexOf(i)<0){nextIdx=i;break;}
}
if(nextIdx>=0){_idx=nextIdx;$("srcLabel").textContent=_src[nextIdx].name;_retryAttempts=0;loadPlayer();}
else{showError("Toutes les sources ont échoué");}
}

window.retryLoad=function(){
if(_retryAttempts<_maxRetries){_retryAttempts++;loadPlayer();}
else{tryNextSource();}
};

function loadPlayer(){
cleanupPlayer();
updateStatus("Chargement...");
var p=$("player");if(!p||!_src||!_src.length)return;
var s=_src[_idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
var url=s.url;
_isIframe=isIframeUrl(url);
var playerType=$("playerSelector")?$("playerSelector").value:"hlsjs";

if(_isIframe){
var existingMsg=p.querySelector(".iframe-msg");
if(existingMsg)existingMsg.remove();
}

var isHLS=url.indexOf(".m3u8")>=0||url.indexOf("m3u8")>=0;

if(_isIframe||!isHLS){
cleanupPlayer();
var iframeMsg="";
if(_isIframe)iframeMsg='<div class="iframe-msg">Lecteur intégré détecté</div>';
p.innerHTML=iframeMsg+'<iframe id="ifrm" src="'+url+'" allowfullscreen allow="autoplay;fullscreen;encrypted-media;picture-in-picture" referrerpolicy="no-referrer"></iframe>';
var ifrm=document.getElementById("ifrm");
if(ifrm){
ifrm.onload=function(){updateStatus("Lecture en cours");if(_isIframe)setTimeout(function(){var msg=p.querySelector(".iframe-msg");if(msg)msg.style.opacity="0";setTimeout(function(){if(msg)msg.remove();},300);},2000);};
ifrm.onerror=function(){console.error("Iframe load error");showError("La source ne peut pas être chargée");setTimeout(tryNextSource,2000);};
}
return;
}

if(playerType==="plyr"&&typeof Plyr!=="undefined"){
p.innerHTML='<video id="vid" playsinline crossorigin="anonymous"></video>';
var vid=document.getElementById("vid");
if(!vid)return;
if(typeof Hls!=="undefined"&&Hls.isSupported()){
_currentHls=new Hls({enableWorker:true,lowLatencyMode:false,maxBufferLength:30});
_currentHls.loadSource(url);
_currentHls.attachMedia(vid);
_currentHls.on(Hls.Events.MANIFEST_PARSED,function(){
_currentPlyr=new Plyr(vid,{controls:['play-large','play','progress','current-time','mute','volume','fullscreen']});
_currentPlyr.play().catch(function(e){console.log("Autoplay prevented:",e);});
updateStatus("Lecture en cours");
});
_currentHls.on(Hls.Events.ERROR,handleHlsError);
}
}else if(playerType==="videojs"&&typeof videojs!=="undefined"){
p.innerHTML='<video id="vid" class="video-js vjs-default-skin" controls playsinline crossorigin="anonymous"></video>';
var vid=document.getElementById("vid");
if(!vid)return;
_currentVjs=videojs(vid,{html5:{vhs:{overrideNative:true},nativeAudioTracks:false,nativeVideoTracks:false}});
_currentVjs.src({src:url,type:'application/x-mpegURL'});
_currentVjs.on('ready',function(){_currentVjs.play().catch(function(e){console.log("Autoplay prevented:",e);});updateStatus("Lecture en cours");});
_currentVjs.on('error',function(){showError("Erreur Video.js");setTimeout(tryNextSource,2000);});
}else{
p.innerHTML='<video id="vid" controls autoplay playsinline crossorigin="anonymous"></video>';
var vid=document.getElementById("vid");
if(!vid)return;
if(typeof Hls!=="undefined"&&Hls.isSupported()&&playerType!=="native"){
_currentHls=new Hls({
enableWorker:true,
lowLatencyMode:false,
maxBufferLength:30,
maxMaxBufferLength:60,
manifestLoadingTimeOut:10000,
manifestLoadingMaxRetry:4,
levelLoadingTimeOut:10000,
levelLoadingMaxRetry:4,
fragLoadingTimeOut:20000,
fragLoadingMaxRetry:6,
xhrSetup:function(xhr,url){xhr.withCredentials=false;}
});
_currentHls.on(Hls.Events.ERROR,handleHlsError);
_currentHls.on(Hls.Events.MANIFEST_PARSED,function(){vid.play().catch(function(e){console.log("Autoplay prevented:",e);});updateStatus("Lecture en cours");});
_currentHls.loadSource(url);
_currentHls.attachMedia(vid);
}else if(vid.canPlayType('application/vnd.apple.mpegurl')){
vid.src=url;
vid.addEventListener('loadedmetadata',function(){vid.play().catch(function(e){console.log("Autoplay prevented:",e);});updateStatus("Lecture en cours");});
vid.addEventListener('error',function(e){console.error("Video error:",e);showError("Erreur de lecture de la vidéo");setTimeout(tryNextSource,2000);});
}else{
showError("Format HLS non supporté sur ce navigateur");
}
}
}

function handleHlsError(event,data){
if(data.fatal){
switch(data.type){
case Hls.ErrorTypes.NETWORK_ERROR:
console.error("Network error:",data);
updateStatus("Erreur réseau");
if(_retryAttempts<_maxRetries){_retryAttempts++;setTimeout(function(){_currentHls.startLoad();},1000);}
else{showError("Erreur réseau - La source est inaccessible");setTimeout(tryNextSource,2000);}
break;
case Hls.ErrorTypes.MEDIA_ERROR:
console.error("Media error:",data);
_currentHls.recoverMediaError();
updateStatus("Récupération...");
break;
default:
console.error("Fatal error:",data);
showError("Erreur de lecture");
setTimeout(tryNextSource,2000);
break;
}
}
}

function startPlayer(){
if(_started)return;_started=true;
var ov=$("adOverlay");if(ov)ov.classList.remove("sh");
sortSourcesByPriority();
buildGrid();
if(_src&&_src.length){$("srcLabel").textContent=_src[0].name;loadPlayer();}
}

function toggleFullscreen(){
var p=$("player");if(!p)return;
if(!document.fullscreenElement){
if(p.requestFullscreen){p.requestFullscreen();}
else if(p.webkitRequestFullscreen){p.webkitRequestFullscreen();}
else if(p.mozRequestFullScreen){p.mozRequestFullScreen();}
else if(p.msRequestFullscreen){p.msRequestFullscreen();}
}else{
if(document.exitFullscreen){document.exitFullscreen();}
else if(document.webkitExitFullscreen){document.webkitExitFullscreen();}
else if(document.mozCancelFullScreen){document.mozCancelFullScreen();}
else if(document.msExitFullscreen){document.msExitFullscreen();}
}
}

function initCast(){
if(typeof chrome!=="undefined"&&chrome.cast&&chrome.cast.isAvailable){
var btn=$("castBtn");if(btn)btn.style.display="flex";
}
}

function toggleCast(){
if(typeof chrome==="undefined"||!chrome.cast||!chrome.cast.isAvailable){
alert("Chromecast non disponible");
return;
}
var castContext=cast.framework.CastContext.getInstance();
if(_castSession){
castContext.endCurrentSession(true);
_castSession=null;
$("castBtn")&&$("castBtn").classList.remove("active");
}else{
castContext.requestSession().then(function(){
_castSession=castContext.getCurrentSession();
$("castBtn")&&$("castBtn").classList.add("active");
if(_src&&_src[_idx]){
var mediaInfo=new chrome.cast.media.MediaInfo(_src[_idx].url,"application/x-mpegURL");
var request=new chrome.cast.media.LoadRequest(mediaInfo);
_castSession.loadMedia(request);
}
}).catch(function(e){console.error("Cast error:",e);});
}
}

$("srcBtn")&&($("srcBtn").onclick=function(){toggleModal("srcModal")});
$("closeModal")&&($("closeModal").onclick=function(){toggleModal("srcModal")});
$("srcModal")&&($("srcModal").onclick=function(e){if(e.target===$("srcModal"))toggleModal("srcModal");});

$("fullscreenBtn")&&($("fullscreenBtn").onclick=toggleFullscreen);
$("castBtn")&&($("castBtn").onclick=toggleCast);
$("reloadBtn")&&($("reloadBtn").onclick=function(){loadPlayer();});
$("playerSelector")&&($("playerSelector").onchange=function(){loadPlayer();});

if(_hasAds&&_ads&&_ads.length>0){var ov=$("adOverlay");if(ov)ov.classList.add("sh");resetAdUI();}else{startPlayer();}

window.__onGCastApiAvailable=function(isAvailable){if(isAvailable)initCast();};
setTimeout(initCast,1000);
})();
</script>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Live route error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
