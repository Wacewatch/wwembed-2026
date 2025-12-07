import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  try {
    const { wwId } = await params
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
    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""

    await supabase.from("embed_views").insert({
      ww_id: wwId,
      media_type: "live",
      embed_type: "live",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/</g, "\\u003c")
    const channelName = channel.channel_name || "Live TV"
    const channelLogo = channel.channel_logo || ""

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${channelName} - WWEmbed Live</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
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
.src-btn:hover{opacity:.9}
.rpt-btn{background:#6366f1;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.rpt-btn:hover{background:#4f46e5}
.player{flex:1;background:#000;position:relative}
.player iframe,.player video{width:100%;height:100%;border:none;position:absolute;inset:0;background:#000}
.no-src{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:8px}
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
.card.act{border-color:#ef4444;background:#3a1f1f}
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
.rpt-form textarea:focus{outline:none;border-color:#6366f1}
.rpt-form button{background:#6366f1;color:#fff;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer}
.rpt-form button:hover{background:#4f46e5}
.rpt-form button:disabled{opacity:0.5;cursor:not-allowed}
.rpt-success{color:#10b981;text-align:center;padding:20px}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(239,68,68,0.95) 0%,rgba(249,115,22,0.95) 50%,rgba(234,179,8,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;backdrop-filter:blur(8px)}
.mo.sh{display:flex}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:24px;max-width:400px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4)}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:18px;font-weight:700}
.mc-sub{color:#6b7280;font-size:13px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#ef4444,#f97316);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx b{display:block;font-size:13px;margin-bottom:2px}
.bx span{font-size:11px;opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#fef3c7,#fed7aa);border:1px solid #f97316;color:#9a3412}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:14px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#ef4444,#f97316,#eab308);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bp{background:linear-gradient(135deg,#ef4444,#f97316);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:10px;color:#9ca3af}
.cf a{color:#ef4444;text-decoration:none}
.tg{background:#dc2626;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px;font-weight:600}
</style>
</head>
<body>
<div class="mo" id="adOverlay">
<div class="mc">
<h2>Votre chaîne est prête</h2>
<div class="mc-sub">Une dernière étape pour accéder au direct</div>
<div class="steps"><div class="step active" id="step1"></div><div class="step" id="step2"></div><div class="step" id="step3"></div></div>
<div class="bx bw"><div><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div></div>
<div class="bx bh" id="boxHelp"><div><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div></div>
<div class="bx bi" id="boxTime"><div><b>Temps restant: <span id="timer">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div></div>
<div class="bx bo hi" id="boxThanks"><div><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div></div>
<div class="bx bo hi" id="boxDone"><div><b>Tout est prêt !</b><span>Cliquez pour lancer le direct</span></div></div>
<div class="pb"><div class="pf" id="progress"></div></div>
<button class="bt bp" id="btnUnlock">Continuer<span class="tg">PUB</span></button>
<button class="bt bn hi" id="btnPlay">Lancer le direct</button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>
<div class="wrap">
<div class="hdr">
<div class="logo">📺 WWEMBED</div>
<div class="ttl">${channelLogo ? `<img src="${channelLogo}" alt="">` : ""}<span>${channelName}</span><span class="live">LIVE</span></div>
<div class="hdr-actions">
<button class="src-btn" id="srcBtn">☰ <span id="srcLabel">Sources</span></button>
<button class="rpt-btn" id="rptBtn" title="Signaler un problème">⚠</button>
</div>
</div>
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>
<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr">
<div><div class="modal-ttl">Choisissez votre source</div><div class="modal-sub">Sélectionnez un serveur</div></div>
<button class="modal-close" id="closeModal">×</button>
</div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div>
</div>

<div class="modal" id="rptModal">
<div class="modal-box">
<div class="modal-hdr">
<div><div class="modal-ttl" style="color:#6366f1">Signaler un problème</div><div class="modal-sub">Aidez-nous à améliorer le service</div></div>
<button class="modal-close" id="rptClose">×</button>
</div>
<div class="modal-body">
<div class="rpt-form" id="rptForm">
<p style="color:#94a3b8;font-size:13px;margin-bottom:8px">Décrivez le problème rencontré (flux ne fonctionne pas, lag, etc.)</p>
<textarea id="rptMsg" placeholder="Décrivez le problème..."></textarea>
<button type="button" id="rptSubmit">Envoyer le signalement</button>
</div>
<div class="rpt-success hi" id="rptSuccess">
<div style="font-size:48px;margin-bottom:12px">✓</div>
<p style="font-weight:600;margin-bottom:4px">Merci pour votre signalement !</p>
<p style="color:#94a3b8;font-size:13px">Nous allons examiner ce problème.</p>
</div>
</div>
</div>
</div>

<script>
(function(){
var _src=${sourcesJson};
var _adUrl="${adUrl}";
var _hasAds=${hasAds};
var _idx=0;
var _started=false;
var _hls=null;
var _wwId="${wwId}";
var _channelName="${channelName.replace(/"/g, '\\"')}";

function $(id){return document.getElementById(id);}

function tagClass(l){
l=(l||"").toUpperCase();
if(l.indexOf("VF")>=0||l.indexOf("FRENCH")>=0||l.indexOf("FRANÇAIS")>=0)return"tag-vf";
if(l.indexOf("VOST")>=0)return"tag-vost";
if(l.indexOf("MULTI")>=0)return"tag-multi";
return"tag-vo";
}

function buildGrid(){
var g=$("srcGrid");
if(!g)return;
if(!_src||!_src.length){
g.innerHTML="<div style='grid-column:1/-1;text-align:center;padding:30px;color:#666'>Aucune source disponible</div>";
return;
}
g.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(index){
var s=_src[index];
var d=document.createElement("div");
d.className="card"+(index===_idx?" act":"");
d.innerHTML="<div class='card-badge'>"+(s.quality||"HD")+"</div><div class='card-icon'>📺</div><div class='card-name'>"+s.name+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
d.onclick=function(){
_idx=index;
var cards=document.querySelectorAll(".card");
for(var j=0;j<cards.length;j++){cards[j].classList.toggle("act",j===index);}
$("srcLabel").textContent=s.name;
toggleModal("srcModal");
loadPlayer();
};
g.appendChild(d);
})(i);
}
}

function toggleModal(id){
var m=$(id);
if(m)m.classList.toggle("sh");
}

function loadPlayer(){
var p=$("player");
if(!p||!_src||!_src.length)return;
var s=_src[_idx];
if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
var url=s.url;
p.innerHTML="";
if(url.indexOf(".m3u8")>=0){
var v=document.createElement("video");
v.controls=true;
v.autoplay=true;
v.style.cssText="width:100%;height:100%;position:absolute;inset:0;background:#000";
p.appendChild(v);
if(typeof Hls!=="undefined"&&Hls.isSupported()){
if(_hls)_hls.destroy();
_hls=new Hls();
_hls.loadSource(url);
_hls.attachMedia(v);
_hls.on(Hls.Events.MANIFEST_PARSED,function(){v.play().catch(function(){});});
}else if(v.canPlayType("application/vnd.apple.mpegurl")){
v.src=url;
v.addEventListener("loadedmetadata",function(){v.play().catch(function(){});});
}
}else{
var f=document.createElement("iframe");
f.src=url;
f.allowFullscreen=true;
f.allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture";
p.appendChild(f);
}
}

function startPlayer(){
if(_started)return;
_started=true;
var ov=$("adOverlay");
if(ov)ov.classList.remove("sh");
buildGrid();
if(_src&&_src.length){
$("srcLabel").textContent=_src[0].name;
loadPlayer();
}
}

var srcBtn=$("srcBtn");
var closeModal=$("closeModal");
var srcModal=$("srcModal");

if(srcBtn)srcBtn.onclick=function(){toggleModal("srcModal")};
if(closeModal)closeModal.onclick=function(){toggleModal("srcModal")};
if(srcModal)srcModal.onclick=function(e){if(e.target===srcModal)toggleModal("srcModal");};

var rptBtn=$("rptBtn");
var rptModal=$("rptModal");
var rptClose=$("rptClose");
var rptSubmit=$("rptSubmit");
var rptMsg=$("rptMsg");
var rptForm=$("rptForm");
var rptSuccess=$("rptSuccess");

if(rptBtn)rptBtn.onclick=function(){toggleModal("rptModal")};
if(rptClose)rptClose.onclick=function(){toggleModal("rptModal")};
if(rptModal)rptModal.onclick=function(e){if(e.target===rptModal)toggleModal("rptModal");};

if(rptSubmit)rptSubmit.onclick=function(){
  var msg=rptMsg.value.trim();
  if(!msg){alert("Veuillez décrire le problème");return}
  rptSubmit.disabled=true;
  rptSubmit.textContent="Envoi...";
  var currentSource=_src[_idx]||{};
  fetch("/api/bug-reports",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      wwId:_wwId,
      mediaType:"live",
      title:_channelName,
      sourceName:currentSource.name||"",
      sourceUrl:currentSource.url||"",
      message:msg,
      embedType:"live"
    })
  }).then(function(r){return r.json()}).then(function(){
    rptForm.classList.add("hi");
    rptSuccess.classList.remove("hi");
    setTimeout(function(){toggleModal("rptModal");rptForm.classList.remove("hi");rptSuccess.classList.add("hi");rptMsg.value="";rptSubmit.disabled=false;rptSubmit.textContent="Envoyer le signalement"},2000);
  }).catch(function(){
    alert("Erreur lors de l'envoi");
    rptSubmit.disabled=false;
    rptSubmit.textContent="Envoyer le signalement";
  });
};

if(_hasAds&&_adUrl){
var ov=$("adOverlay");
if(ov)ov.classList.add("sh");

var btnUnlock=$("btnUnlock");
var btnPlay=$("btnPlay");
var tmEl=$("timer");
var prEl=$("progress");
var s1=$("step1");
var s2=$("step2");
var s3=$("step3");
var boxHelp=$("boxHelp");
var boxTime=$("boxTime");
var boxThanks=$("boxThanks");
var boxDone=$("boxDone");

if(btnUnlock){
btnUnlock.onclick=function(){
window.open(_adUrl,"_blank");
if(s1){s1.classList.remove("active");s1.classList.add("done");}
if(s2)s2.classList.add("active");
if(boxHelp)boxHelp.classList.add("hi");
if(boxThanks)boxThanks.classList.remove("hi");
btnUnlock.classList.add("hi");
var tm=3;
var iv=setInterval(function(){
tm--;
if(tmEl)tmEl.textContent=tm;
if(prEl)prEl.style.width=((3-tm)/3*100)+"%";
if(tm<=0){
clearInterval(iv);
if(s2){s2.classList.remove("active");s2.classList.add("done");}
if(s3)s3.classList.add("active");
if(boxTime)boxTime.classList.add("hi");
if(boxDone)boxDone.classList.remove("hi");
if(btnPlay)btnPlay.classList.remove("hi");
}
},1000);
};
}

if(btnPlay){
btnPlay.onclick=startPlayer;
}
}else{
startPlayer();
}
})();
</script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("Live TV error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
