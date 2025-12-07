import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  try {
    const { wwId } = await params

    const match = wwId.match(/^ww-live-(.+)$/i)
    if (!match) {
      return new NextResponse("Invalid WW ID format. Expected: ww-live-{channelId}", { status: 400 })
    }

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

    if (!channel) {
      return new NextResponse(`Channel not found for ID: ${channelIdPart}`, { status: 404 })
    }

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

    if (allSources.length === 0) {
      return new NextResponse("No sources available for this channel", { status: 404 })
    }

    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""
    const adId = hasAds ? ads[0].id : ""

    await supabase.from("embed_views").insert({
      ww_id: wwId,
      media_type: "live",
      embed_type: "live",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/'/g, "\\'").replace(/"/g, '\\"')
    const channelName = (channel.channel_name || "Live TV").replace(/"/g, '\\"')
    const channelLogo = channel.channel_logo || ""

    const ids = {
      overlay: generateRandomId("ov"),
      player: generateRandomId("pl"),
      srcGrid: generateRandomId("sg"),
      srcModal: generateRandomId("sm"),
      srcBtn: generateRandomId("sb"),
      srcLabel: generateRandomId("sl"),
      timer: generateRandomId("tm"),
      progress: generateRandomId("pr"),
      btnContinue: generateRandomId("bc"),
      btnPlay: generateRandomId("bp"),
      step1: generateRandomId("s1"),
      step2: generateRandomId("s2"),
      step3: generateRandomId("s3"),
      boxTime: generateRandomId("bt"),
      boxHelp: generateRandomId("bh"),
      boxThanks: generateRandomId("bk"),
      boxDone: generateRandomId("bd"),
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${channelName} - WWEmbed Live</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#fff}

.wrap{display:flex;flex-direction:column;height:100%}

.hdr{display:flex;align-items:center;padding:10px 14px;background:linear-gradient(180deg,#151520 0%,#0d0d14 100%);border-bottom:1px solid rgba(255,255,255,0.06);gap:12px}
.logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px}
.logo svg{width:22px;height:22px;color:#ef4444}
.logo b{background:linear-gradient(135deg,#ef4444,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.ttl{flex:1;font-size:13px;font-weight:600;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;display:flex;align-items:center;justify-content:center;gap:8px}
.ttl img{width:24px;height:24px;border-radius:4px;object-fit:contain;background:#fff}
.live-badge{background:#ef4444;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}

.src-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:linear-gradient(135deg,#ef4444,#f97316);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.src-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(239,68,68,0.4)}
.src-btn svg{width:14px;height:14px}
.src-btn .lbl{max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.src-btn .arr{transition:transform .2s}
.src-btn.open .arr{transform:rotate(180deg)}

.rpt-btn{padding:7px;background:#6366f1;border:none;border-radius:8px;color:#fff;cursor:pointer}
.rpt-btn svg{width:14px;height:14px;display:block}

.player{flex:1;background:#000;position:relative;min-height:0}
.player iframe,.player video{width:100%;height:100%;border:none;position:absolute;inset:0;background:#000}
.no-src{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:8px}
.no-src svg{width:48px;height:48px;opacity:.4}

.modal{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:100;padding:16px;backdrop-filter:blur(6px)}
.modal.show{display:flex}
.modal-box{background:linear-gradient(180deg,#1a1a28 0%,#12121c 100%);border-radius:14px;width:100%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.08)}
.modal-hdr{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between}
.modal-ttl{font-size:18px;font-weight:700;background:linear-gradient(135deg,#ef4444,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.modal-sub{font-size:12px;color:#888;margin-top:2px}
.modal-close{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.modal-close:hover{background:rgba(255,255,255,0.2)}
.modal-close svg{width:18px;height:18px}
.modal-body{padding:16px 20px;overflow-y:auto;flex:1}

.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:380px){.grid{grid-template-columns:1fr}}

.card{background:linear-gradient(135deg,#1e1e2c 0%,#16162a 100%);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;cursor:pointer;transition:all .2s;position:relative}
.card:hover{border-color:rgba(239,68,68,0.4);transform:translateY(-2px)}
.card.act{border-color:#ef4444;background:linear-gradient(135deg,#2a1f1f 0%,#1a1a2e 100%)}
.card-icon{width:42px;height:42px;border-radius:8px;background:linear-gradient(135deg,#ef4444,#f97316);display:flex;align-items:center;justify-content:center;margin-bottom:10px}
.card-icon svg{width:20px;height:20px;color:#fff}
.card-badge{position:absolute;top:10px;right:10px;padding:3px 7px;background:#22c55e;border-radius:5px;font-size:9px;font-weight:700}
.card-name{font-size:13px;font-weight:600;margin-bottom:6px}
.card-tags{display:flex;flex-wrap:wrap;gap:4px}
.tag{padding:3px 6px;border-radius:4px;font-size:9px;font-weight:600;text-transform:uppercase}
.tag-vf{background:#3b82f6}
.tag-vost{background:#f97316}
.tag-multi{background:#a855f7}
.tag-vo{background:#6b7280}

.ad-ov{position:fixed;inset:0;background:linear-gradient(135deg,rgba(239,68,68,.95),rgba(249,115,22,.95),rgba(234,179,8,.95));display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
.ad-ov.hide{display:none}
.ad-box{background:#fff;border-radius:14px;padding:24px;max-width:380px;width:100%;text-align:center}
.ad-box h2{color:#1a1a2e;font-size:18px;margin-bottom:6px}
.ad-box .sub{color:#6b7280;font-size:12px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all .3s}
.step.act{background:linear-gradient(135deg,#ef4444,#f97316);transform:scale(1.2)}
.step.done{background:#10b981}
.info{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.info svg{flex-shrink:0;width:18px;height:18px}
.info b{display:block;font-size:13px;margin-bottom:2px}
.info span{font-size:11px;opacity:.8}
.info-warn{background:#fef3c7;border:1px solid #f59e0b;color:#92400e}
.info-heart{background:#fce7f3;border:1px solid #ec4899;color:#9d174d}
.info-time{background:#fef3c7;border:1px solid #f97316;color:#9a3412}
.info-ok{background:#d1fae5;border:1px solid #10b981;color:#065f46}
.pbar{height:5px;background:#e5e7eb;border-radius:3px;margin:14px 0;overflow:hidden}
.pbar-fill{height:100%;width:0;background:linear-gradient(90deg,#ef4444,#f97316,#eab308);transition:width .3s}
.btn{width:100%;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;text-transform:uppercase;transition:all .2s}
.btn:hover{transform:translateY(-2px)}
.btn-primary{background:linear-gradient(135deg,#ef4444,#f97316);color:#fff}
.btn-success{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hide{display:none!important}
.pub{background:#6366f1;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px}
.foot{margin-top:14px;font-size:10px;color:#9ca3af}
.foot a{color:#ef4444;text-decoration:none}

@media(max-width:480px){
.hdr{padding:8px 10px}
.logo{font-size:11px}
.ttl{font-size:11px}
.src-btn{padding:6px 10px;font-size:11px}
.src-btn .lbl{max-width:70px}
.ad-box{padding:18px}
}
</style>
</head>
<body>
${
  hasAds
    ? `
<div class="ad-ov" id="${ids.overlay}">
<div class="ad-box">
<h2>Votre chaîne est prête</h2>
<p class="sub">Une dernière étape pour accéder au direct</p>
<div class="steps">
<div class="step act" id="${ids.step1}"></div>
<div class="step" id="${ids.step2}"></div>
<div class="step" id="${ids.step3}"></div>
</div>
<div class="info info-warn">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="info info-heart" id="${ids.boxHelp}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<div class="info info-time" id="${ids.boxTime}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
<div><b>Temps restant: <span id="${ids.timer}">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div>
</div>
<div class="info info-ok hide" id="${ids.boxThanks}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div>
</div>
<div class="info info-ok hide" id="${ids.boxDone}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
<div><b>Tout est prêt !</b><span>Cliquez pour lancer le direct</span></div>
</div>
<div class="pbar"><div class="pbar-fill" id="${ids.progress}"></div></div>
<button class="btn btn-primary" id="${ids.btnContinue}">Continuer<span class="pub">PUB</span></button>
<button class="btn btn-success hide" id="${ids.btnPlay}">Lancer le direct</button>
<div class="foot">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>
`
    : ""
}

<div class="wrap">
<div class="hdr">
<div class="logo">
<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
<b>LIVE</b>
</div>
<div class="ttl">
${channelLogo ? `<img src="${channelLogo}" alt="">` : ""}
${channelName}
<span class="live-badge">EN DIRECT</span>
</div>
<button class="src-btn" id="${ids.srcBtn}">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
<span class="lbl" id="${ids.srcLabel}">Sources</span>
<svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
</button>
<button class="rpt-btn" title="Signaler">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
</button>
</div>
<div class="player" id="${ids.player}">
<div class="no-src">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
<span>Chargement...</span>
</div>
</div>
</div>

<div class="modal" id="${ids.srcModal}">
<div class="modal-box">
<div class="modal-hdr">
<div>
<div class="modal-ttl">Choisissez votre source</div>
<div class="modal-sub">Sélectionnez un serveur pour commencer la lecture</div>
</div>
<button class="modal-close" id="closeModal">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
</div>
<div class="modal-body">
<div class="grid" id="${ids.srcGrid}"></div>
</div>
</div>
</div>

<script>
(function(){
try{
var sources=JSON.parse("${sourcesJson}");
var adUrl="${adUrl}";
var adId="${adId}";
var hasAds=${hasAds};
var idx=0;
var started=false;
var hlsPlayer=null;

function $(id){return document.getElementById(id)}

function getTagClass(lang){
var l=(lang||'').toUpperCase();
if(l.includes('VF')||l.includes('FRAN'))return 'tag-vf';
if(l.includes('VOST'))return 'tag-vost';
if(l.includes('MULTI'))return 'tag-multi';
return 'tag-vo';
}

function buildGrid(){
var grid=$("${ids.srcGrid}");
if(!grid)return;
if(sources.length===0){
grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:#666">Aucune source disponible</div>';
return;
}
grid.innerHTML='';
for(var i=0;i<sources.length;i++){
(function(index){
var s=sources[index];
var card=document.createElement('div');
card.className='card'+(index===idx?' act':'');
card.setAttribute('data-i',index);
var lang=(s.language||'VO').toUpperCase();
card.innerHTML='<div class="card-badge">'+(s.quality||'HD')+'</div>'+
'<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>'+
'<div class="card-name">'+s.name+'</div>'+
'<div class="card-tags"><span class="tag '+getTagClass(lang)+'">'+lang+'</span></div>';
card.onclick=function(){selectSource(index)};
grid.appendChild(card);
})(i);
}
}

function selectSource(i){
idx=i;
var cards=document.querySelectorAll('.card');
for(var j=0;j<cards.length;j++){
cards[j].classList.remove('act');
if(parseInt(cards[j].getAttribute('data-i'))===i)cards[j].classList.add('act');
}
var lbl=$("${ids.srcLabel}");
if(lbl&&sources[i]){
var lang=(sources[i].language||'VO').toUpperCase();
lbl.textContent=sources[i].name+' ['+lang+']';
}
toggleModal();
loadPlayer();
}

function toggleModal(){
var m=$("${ids.srcModal}");
var b=$("${ids.srcBtn}");
if(!m)return;
if(m.classList.contains('show')){
m.classList.remove('show');
if(b)b.classList.remove('open');
}else{
m.classList.add('show');
if(b)b.classList.add('open');
}
}

function loadPlayer(){
var p=$("${ids.player}");
if(!p||sources.length===0)return;
var src=sources[idx];
if(!src||!src.url){
p.innerHTML='<div class="no-src"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Source indisponible</span></div>';
return;
}
if(hlsPlayer){hlsPlayer.destroy();hlsPlayer=null}
var url=src.url;
if(url.includes('.m3u8')){
var video=document.createElement('video');
video.controls=true;
video.autoplay=true;
video.style.cssText='width:100%;height:100%;background:#000';
p.innerHTML='';
p.appendChild(video);
if(Hls.isSupported()){
hlsPlayer=new Hls();
hlsPlayer.loadSource(url);
hlsPlayer.attachMedia(video);
hlsPlayer.on(Hls.Events.MANIFEST_PARSED,function(){video.play()});
}else if(video.canPlayType('application/vnd.apple.mpegurl')){
video.src=url;
video.play();
}
}else{
var iframe=document.createElement('iframe');
iframe.src=url;
iframe.setAttribute('allowfullscreen','true');
iframe.setAttribute('allow','accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture');
p.innerHTML='';
p.appendChild(iframe);
}
}

function startPlayer(){
if(started)return;
started=true;
var ov=$("${ids.overlay}");
if(ov)ov.classList.add('hide');
buildGrid();
if(sources.length>0){
var lbl=$("${ids.srcLabel}");
if(lbl){
var lang=(sources[0].language||'VO').toUpperCase();
lbl.textContent=sources[0].name+' ['+lang+']';
}
loadPlayer();
}
}

var srcBtn=$("${ids.srcBtn}");
var closeModalBtn=document.getElementById("closeModal");
var srcModal=$("${ids.srcModal}");

if(srcBtn)srcBtn.addEventListener('click',toggleModal);
if(closeModalBtn)closeModalBtn.addEventListener('click',toggleModal);
if(srcModal)srcModal.addEventListener('click',function(e){if(e.target===srcModal)toggleModal()});

if(hasAds&&adUrl){
var btnC=$("${ids.btnContinue}");
var btnP=$("${ids.btnPlay}");
if(btnC){
btnC.addEventListener('click',function(){
fetch('/api/ads/click',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adId:adId})}).catch(function(){});
window.open(adUrl,'_blank');
btnC.classList.add('hide');
var s1=$("${ids.step1}");
var s2=$("${ids.step2}");
var s3=$("${ids.step3}");
if(s1){s1.classList.remove('act');s1.classList.add('done');}
if(s2)s2.classList.add('act');
var sec=3,prog=0;
var iv=setInterval(function(){
sec--;prog+=33.33;
var tm=$("${ids.timer}");
var pr=$("${ids.progress}");
if(tm)tm.textContent=sec+' seconde'+(sec>1?'s':'');
if(pr)pr.style.width=Math.min(prog,100)+'%';
if(sec<=0){
clearInterval(iv);
if(s2){s2.classList.remove('act');s2.classList.add('done');}
if(s3)s3.classList.add('act');
var bt=$("${ids.boxTime}");
var bh=$("${ids.boxHelp}");
var bk=$("${ids.boxThanks}");
var bd=$("${ids.boxDone}");
var prg=$("${ids.progress}");
if(bt)bt.classList.add('hide');
if(bh)bh.classList.add('hide');
if(bk)bk.classList.remove('hide');
if(bd)bd.classList.remove('hide');
if(prg)prg.style.width='100%';
if(btnP)btnP.classList.remove('hide');
}
},1000);
});
}
if(btnP)btnP.addEventListener('click',startPlayer);
}else{
startPlayer();
}
}catch(e){
console.error('Player error:',e);
document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#0a0a0f;color:#fff;flex-direction:column;gap:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Erreur de chargement</span></div>';
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
  } catch (error) {
    console.error("Live TV API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
