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
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:system-ui,sans-serif;background:#0a0a0f;color:#fff}
.wrap{display:flex;flex-direction:column;height:100%}
.hdr{display:flex;align-items:center;padding:10px 14px;background:#151520;border-bottom:1px solid #222;gap:12px}
.logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#ef4444}
.ttl{flex:1;font-size:13px;font-weight:600;color:#ccc;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:8px}
.ttl img{width:24px;height:24px;border-radius:4px;object-fit:contain;background:#fff}
.live{background:#ef4444;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
.hdr-actions{display:flex;gap:8px}
.src-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:linear-gradient(135deg,#ef4444,#f97316);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.rpt-btn{background:#ef4444;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer}
.player{flex:1;background:#000;position:relative}
.player iframe,.player video{width:100%;height:100%;position:absolute;inset:0;border:none}
.no-src{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:8px}
.error-box{background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:8px;padding:16px;max-width:400px;text-align:center}
.error-box h3{color:#ef4444;margin-bottom:8px}
.error-box p{color:#999;font-size:13px;margin-bottom:12px}
.retry-btn{background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600}
.ticker{position:absolute;bottom:0;left:0;right:0;z-index:50;display:flex;align-items:center}
.ticker-wrap{flex:1;overflow:hidden;white-space:nowrap}
.ticker-content{display:inline-block;padding:10px 20px;animation:ticker-scroll ${animationDuration}s linear infinite;font-size:13px;font-weight:600}
@keyframes ticker-scroll{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
.ticker-close{flex-shrink:0;width:32px;height:100%;background:rgba(0,0,0,0.6);border:none;font-size:20px;font-weight:700;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.ticker-close:hover{background:rgba(0,0,0,0.9)}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:100;padding:16px}
.modal.sh{display:flex}
.modal-box{background:#1a1a28;border-radius:14px;width:100%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;border:1px solid #333}
.modal-hdr{padding:16px 20px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center}
.modal-ttl{font-size:18px;font-weight:700;color:#ef4444}
.modal-sub{font-size:12px;color:#888;margin-top:2px}
.modal-close{width:32px;height:32px;border-radius:50%;background:#333;border:none;color:#fff;cursor:pointer;font-size:18px}
.modal-body{padding:16px 20px;overflow-y:auto}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:380px){.grid{grid-template-columns:1fr}}
.card{background:#1e1e2c;border:1px solid #333;border-radius:10px;padding:14px;cursor:pointer;position:relative}
.card:hover{border-color:#ef4444}
.card.act{border-color:#ef4444;background:#2a1a1a}
.card.err{opacity:0.5;cursor:not-allowed}
.card-badge{position:absolute;top:10px;right:10px;padding:3px 7px;background:#22c55e;border-radius:5px;font-size:9px;font-weight:700}
.card-icon{width:42px;height:42px;border-radius:8px;background:linear-gradient(135deg,#ef4444,#f97316);display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:#fff;font-size:20px}
.card-name{font-size:13px;font-weight:600;margin-bottom:6px}
.card-tags{display:flex;gap:4px}
.tag{padding:3px 6px;border-radius:4px;font-size:9px;font-weight:600}
.tag-vf{background:#3b82f6;color:#fff}
.tag-vost{background:#f97316;color:#fff}
.tag-multi{background:#a855f7;color:#fff}
.tag-vo{background:#6b7280;color:#fff}
.rpt-form{display:flex;flex-direction:column;gap:12px}
.rpt-form textarea{width:100%;min-height:100px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:12px;color:#fff;font-size:14px;resize:vertical}
.rpt-form textarea:focus{outline:none;border-color:#ef4444}
.rpt-form button{background:#ef4444;color:#fff;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer}
.rpt-success{color:#10b981;text-align:center;padding:20px}
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
<button class="rpt-btn" id="rptBtn" title="Signaler">⚠</button>
</div>
</div>
<div class="player" id="player">
<div class="no-src">Chargement...</div>
</div>
${tickerEnabled && tickerMessage ? `<div class="ticker" id="tickerBar" style="background:${tickerBgColor}"><div class="ticker-wrap"><div class="ticker-content" style="color:${tickerTextColor}">${tickerMessage}</div></div><button class="ticker-close" id="tickerClose">×</button></div>` : ""}
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
var _failedSources=[];
var _retryAttempts=0;
var _maxRetries=3;

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
var isFailed=_failedSources.indexOf(index)>=0;
d.className="card"+(index===_idx?" act":"")+(isFailed?" err":"");
d.innerHTML="<div class='card-badge'>"+(s.quality||"HD")+"</div><div class='card-icon'>▶</div><div class='card-name'>"+s.name+(isFailed?" ✕":"")+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
if(!isFailed){
d.onclick=function(){_idx=index;_retryAttempts=0;var cards=document.querySelectorAll(".card");for(var j=0;j<cards.length;j++){cards[j].classList.toggle("act",j===index);}$("srcLabel").textContent=s.name;toggleModal("srcModal");loadPlayer();};
}
g.appendChild(d);
})(i);
}
}

function toggleModal(id){var m=$(id);if(m)m.classList.toggle("sh");}

function cleanupPlayer(){
if(_currentHls){try{_currentHls.destroy();}catch(e){}
_currentHls=null;}
}

function showError(msg){
var p=$("player");if(!p)return;
p.innerHTML='<div class="no-src"><div class="error-box"><h3>Erreur de lecture</h3><p>'+msg+'</p><button class="retry-btn" onclick="window.retryLoad()">Réessayer</button></div></div>';
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
var p=$("player");if(!p||!_src||!_src.length)return;
var s=_src[_idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
var url=s.url;

if(url.indexOf(".m3u8")>=0||url.indexOf("m3u8")>=0){
p.innerHTML='<video id="vid" controls autoplay playsinline crossorigin="anonymous"></video>';
var vid=document.getElementById("vid");
if(!vid)return;

if(typeof Hls!=="undefined"&&Hls.isSupported()){
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
xhrSetup:function(xhr,url){
xhr.withCredentials=false;
}
});

_currentHls.on(Hls.Events.ERROR,function(event,data){
if(data.fatal){
switch(data.type){
case Hls.ErrorTypes.NETWORK_ERROR:
console.error("Network error:",data);
if(_retryAttempts<_maxRetries){_retryAttempts++;setTimeout(function(){_currentHls.startLoad();},1000);}
else{showError("Erreur réseau - La source est inaccessible");setTimeout(tryNextSource,2000);}
break;
case Hls.ErrorTypes.MEDIA_ERROR:
console.error("Media error:",data);
_currentHls.recoverMediaError();
break;
default:
console.error("Fatal error:",data);
showError("Erreur de lecture");
setTimeout(tryNextSource,2000);
break;
}
}
});

_currentHls.on(Hls.Events.MANIFEST_PARSED,function(){
vid.play().catch(function(e){console.log("Autoplay prevented:",e);});
});

_currentHls.loadSource(url);
_currentHls.attachMedia(vid);
}else if(vid.canPlayType('application/vnd.apple.mpegurl')){
vid.src=url;
vid.addEventListener('loadedmetadata',function(){vid.play().catch(function(e){console.log("Autoplay prevented:",e);});});
vid.addEventListener('error',function(e){
console.error("Video error:",e);
showError("Erreur de lecture de la vidéo");
setTimeout(tryNextSource,2000);
});
}else{
showError("Format HLS non supporté sur ce navigateur");
}
}else{
cleanupPlayer();
p.innerHTML='<iframe id="ifrm" src="'+url+'" allowfullscreen allow="autoplay;fullscreen;encrypted-media" referrerpolicy="no-referrer"></iframe>';
var ifrm=document.getElementById("ifrm");
if(ifrm){
ifrm.onerror=function(){
console.error("Iframe load error");
showError("La source ne peut pas être chargée");
setTimeout(tryNextSource,2000);
};
}
}
}

function startPlayer(){
if(_started)return;_started=true;
var ov=$("adOverlay");if(ov)ov.classList.remove("sh");
buildGrid();
if(_src&&_src.length){$("srcLabel").textContent=_src[0].name;loadPlayer();}
}

function updateAdCounter(){var el=$("adCounter");if(el)el.textContent="Pub "+(_adIndex+1)+"/"+_ads.length;}

function resetAdUI(){
var s1=$("step1"),s2=$("step2"),s3=$("step3");
if(s1){s1.classList.add("active");s1.classList.remove("done");}
if(s2){s2.classList.remove("active");s2.classList.remove("done");}
if(s3){s3.classList.remove("active");s3.classList.remove("done");}
$("boxHelp")&&$("boxHelp").classList.remove("hi");
$("boxTime")&&$("boxTime").classList.remove("hi");
$("boxThanks")&&$("boxThanks").classList.add("hi");
$("boxDone")&&$("boxDone").classList.add("hi");
$("btnUnlock")&&$("btnUnlock").classList.remove("hi");
$("btnNext")&&$("btnNext").classList.add("hi");
$("btnPlay")&&$("btnPlay").classList.add("hi");
$("timer")&&($("timer").textContent="3");
$("progress")&&($("progress").style.width="0%");
updateAdCounter();
}

function processAd(){
var ad=_ads[_adIndex];if(!ad)return startPlayer();
window.open(ad.url,"_blank");
fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:ad.id,wwId:_wwId})}).catch(function(){});
var s1=$("step1"),s2=$("step2");
if(s1){s1.classList.remove("active");s1.classList.add("done");}
if(s2)s2.classList.add("active");
$("boxHelp")&&$("boxHelp").classList.add("hi");
$("boxThanks")&&$("boxThanks").classList.remove("hi");
$("btnUnlock")&&$("btnUnlock").classList.add("hi");
var tm=3;
var iv=setInterval(function(){
tm--;
$("timer")&&($("timer").textContent=tm);
$("progress")&&($("progress").style.width=((3-tm)/3*100)+"%");
if(tm<=0){
clearInterval(iv);
$("step2")&&$("step2").classList.remove("active");
$("step2")&&$("step2").classList.add("done");
$("step3")&&$("step3").classList.add("active");
$("boxTime")&&$("boxTime").classList.add("hi");
$("boxDone")&&$("boxDone").classList.remove("hi");
if(_adIndex<_ads.length-1){$("btnNext")&&$("btnNext").classList.remove("hi");}
else{$("btnPlay")&&$("btnPlay").classList.remove("hi");}
}
},1000);
}

$("srcBtn")&&($("srcBtn").onclick=function(){toggleModal("srcModal")});
$("closeModal")&&($("closeModal").onclick=function(){toggleModal("srcModal")});
$("srcModal")&&($("srcModal").onclick=function(e){if(e.target===$("srcModal"))toggleModal("srcModal");});

$("rptBtn")&&($("rptBtn").onclick=function(){toggleModal("rptModal")});
$("rptClose")&&($("rptClose").onclick=function(){toggleModal("rptModal")});
$("rptModal")&&($("rptModal").onclick=function(e){if(e.target===$("rptModal"))toggleModal("rptModal");});

$("rptSubmit")&&($("rptSubmit").onclick=function(){
var msg=$("rptMsg")&&$("rptMsg").value;
if(!msg||msg.trim()==="")return;
fetch("/api/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({wwId:_wwId,channelName:_channelName,message:msg,type:"live"})}).then(function(){
$("rptForm")&&$("rptForm").classList.add("hi");
$("rptSuccess")&&$("rptSuccess").classList.remove("hi");
setTimeout(function(){toggleModal("rptModal");$("rptForm")&&$("rptForm").classList.remove("hi");$("rptSuccess")&&$("rptSuccess").classList.add("hi");$("rptMsg")&&($("rptMsg").value="");},2000);
}).catch(function(){});
});

$("tickerClose")&&($("tickerClose").onclick=function(){var t=$("tickerBar");if(t)t.style.display="none";});

$("btnUnlock")&&($("btnUnlock").onclick=function(){if(_ads&&_ads.length>0)processAd();else startPlayer();});
$("btnNext")&&($("btnNext").onclick=function(){_adIndex++;if(_adIndex<_ads.length){resetAdUI();processAd();}else{startPlayer();}});
$("btnPlay")&&($("btnPlay").onclick=function(){startPlayer();});

if(_hasAds&&_ads&&_ads.length>0){var ov=$("adOverlay");if(ov)ov.classList.add("sh");resetAdUI();}else{startPlayer();}
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
