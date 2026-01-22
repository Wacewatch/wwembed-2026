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

    const AD_URL = "https://otieu.com/4/9248013"
    const hasAds = true

    const referer = request.headers.get("referer") || null
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

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>${channelName} - Live TV</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0a0a0f;color:#fff;overflow:hidden;height:100vh}
.top{display:flex;align-items:center;padding:10px 14px;background:#151520;border-bottom:1px solid #222;gap:12px}
.logo{font-weight:700;font-size:13px;color:#00d4aa}
.ch-info{flex:1;display:flex;align-items:center;justify-content:center;gap:8px}
.ch-icon{width:32px;height:32px;border-radius:6px;object-fit:cover;background:#222}
.ch-name{font-size:13px;font-weight:600;color:#ccc}
.live-badge{background:#e63946;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700}
.top-right{display:flex;gap:8px}
.src-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#00d4aa;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.bug-btn{display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#ef4444;border:none;border-radius:8px;color:#fff;font-size:16px;cursor:pointer}
.container{height:calc(100vh - 60px);position:relative}
.player{width:100%;height:100%}
.player video,.player iframe{width:100%;height:100%;display:block;background:#000}
.player iframe{border:none}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#555}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:100;padding:16px}
.modal.sh{display:flex}
.modal-box{background:#1a1a28;border-radius:14px;width:100%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;border:1px solid #333}
.modal-hdr{padding:16px 20px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center}
.modal-ttl{font-size:18px;font-weight:700;color:#00d4aa}
.modal-sub{font-size:12px;color:#888;margin-top:2px}
.modal-close{width:32px;height:32px;border-radius:50%;background:#333;border:none;color:#fff;cursor:pointer;font-size:18px}
.modal-body{padding:16px 20px;overflow-y:auto}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:380px){.grid{grid-template-columns:1fr}}
.card{background:#1e1e2c;border:1px solid #333;border-radius:10px;padding:14px;cursor:pointer;position:relative}
.card:hover{border-color:#00d4aa}
.card.act{border-color:#00d4aa;background:#1a3a2a}
.card-badge{position:absolute;top:10px;right:10px;padding:3px 7px;background:#22c55e;border-radius:5px;font-size:9px;font-weight:700}
.card-icon{width:42px;height:42px;border-radius:8px;background:linear-gradient(135deg,#00d4aa,#00a388);display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:#fff;font-size:20px}
.card-name{font-size:13px;font-weight:600;margin-bottom:6px}
.card-tags{display:flex;gap:4px}
.tag{padding:3px 6px;border-radius:4px;font-size:9px;font-weight:600}
.tag-vf{background:#3b82f6;color:#fff}
.tag-vost{background:#f97316;color:#fff}
.tag-multi{background:#a855f7;color:#fff}
.tag-vo{background:#6b7280;color:#fff}
.rpt-form{display:flex;flex-direction:column;gap:12px}
.rpt-form textarea{width:100%;min-height:100px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:12px;color:#fff;font-size:14px;resize:vertical}
.rpt-form textarea:focus{outline:none;border-color:#00d4aa}
.rpt-form button{background:#ef4444;color:#fff;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer}
.rpt-form button:hover{background:#dc2626}
.rpt-form button:disabled{opacity:0.5;cursor:not-allowed}
.rpt-success{color:#10b981;text-align:center;padding:20px}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(251,146,60,0.95),rgba(234,88,12,0.95));display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.mc{background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center}
.mc h2{color:#1a1a2e;margin-bottom:6px;font-size:18px}
.mc-sub{color:#666;font-size:12px;margin-bottom:14px}
.steps{display:flex;justify-content:center;gap:6px;margin-bottom:14px}
.step{width:8px;height:8px;border-radius:50%;background:#ddd}
.step.active{background:#e63946}
.step.done{background:#22c55e}
.bx{border-radius:8px;padding:10px;margin:6px 0;text-align:left;display:flex;align-items:flex-start;gap:8px}
.bx svg{width:16px;height:16px;flex-shrink:0}
.bx b{display:block;font-size:12px;margin-bottom:2px}
.bx span{font-size:10px;opacity:0.8}
.bw{background:#fef3c7;border:1px solid #f59e0b;color:#92400e}
.bh{background:#fce7f3;border:1px solid #ec4899;color:#9d174d}
.bt-link{display:block;width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;margin-top:8px}
.bp{background:linear-gradient(135deg,#e63946,#dc2626);color:#fff}
.bn{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff}
.hi{display:none}
.cf{margin-top:10px;font-size:10px;color:#999}
.cf a{color:#e63946}
.adtag{background:#fff;color:#e63946;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px}
</style>
</head>
<body>
<div class="top">
<div class="logo">▶ WWEMBED</div>
<div class="ch-info">
<img class="ch-icon" src="${channelLogo}" alt="">
<span class="ch-name">${channelName}</span>
<span class="live-badge">● LIVE</span>
</div>
<div class="top-right">
<button class="src-btn" id="srcBtn">☰ <span id="srcLabel">Source #1</span></button>
<button class="bug-btn" id="bugBtn" title="Signaler un problème">🐛</button>
</div>
</div>
<div class="container">
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>

<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr">
<div><div class="modal-ttl">Choisir un lecteur</div><div class="modal-sub">Sélectionnez une source</div></div>
<button class="modal-close" id="closeModal">×</button>
</div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div>
</div>

<div class="modal" id="rptModal">
<div class="modal-box">
<div class="modal-hdr">
<div><div class="modal-ttl" style="color:#ef4444">Signaler un problème</div><div class="modal-sub">Aidez-nous à améliorer le service</div></div>
<button class="modal-close" id="rptClose">×</button>
</div>
<div class="modal-body">
<div class="rpt-form" id="rptForm">
<p style="color:#94a3b8;font-size:13px;margin-bottom:8px">Décrivez le problème rencontré</p>
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

<div class="mo" id="adOverlay">
<div class="mc">
<h2>Accédez au flux en direct</h2>
<div class="mc-sub">Une dernière étape avant de regarder</div>
<div class="steps"><div class="step active" id="step1"></div><div class="step" id="step2"></div></div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="bx bh">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<a href="${AD_URL}" target="_blank" rel="noopener" class="bt-link bp" id="btnAd" onclick="unlockContent()">CONTINUER<span class="adtag">PUB</span></a>
<button class="bt-link bn hi" id="btnStart" onclick="startPlayer()">DÉMARRER LA LECTURE</button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>

<script>
var _src=${sourcesJson};
var _idx=0;
var _started=false;
var _hls=null;

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
d.innerHTML="<div class='card-badge'>"+(s.quality||"HD")+"</div><div class='card-icon'>▶</div><div class='card-name'>"+s.name+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
d.onclick=function(){
_idx=index;
var cards=document.querySelectorAll(".card");
for(var j=0;j<cards.length;j++){cards[j].classList.toggle("act",j===index);}
$("srcLabel").textContent=s.name;
toggleModal("srcModal");
if(_started){loadPlayer();}
};
g.appendChild(d);
})(i);
}
}

function toggleModal(id){
var m=$(id);
if(m)m.classList.toggle("sh");
}

function unlockContent(){
$("step1").classList.remove("active");$("step1").classList.add("done");
$("step2").classList.add("active");$("step2").classList.add("done");
$("btnAd").classList.add("hi");
$("btnStart").classList.remove("hi");
}

function startPlayer(){
if(_started)return;
_started=true;
$("adOverlay").style.display="none";
buildGrid();
if(_src.length){$("srcLabel").textContent=_src[0].name;loadPlayer();}
}

function loadPlayer(){
var p=$("player");if(!p||!_src.length)return;
var s=_src[_idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
var url=s.url;
if(_hls){try{_hls.destroy();}catch(e){}_hls=null;}
if(url.indexOf(".m3u8")>-1&&typeof Hls!=="undefined"&&Hls.isSupported()){
p.innerHTML='<video id="vid" controls autoplay></video>';
var v=$("vid");
_hls=new Hls();_hls.loadSource(url);_hls.attachMedia(v);
_hls.on(Hls.Events.MANIFEST_PARSED,function(){v.play().catch(function(){});});
}else if(url.indexOf(".m3u8")>-1){
p.innerHTML='<video id="vid" src="'+url+'" controls autoplay></video>';
$("vid").play().catch(function(){});
}else{
p.innerHTML='<iframe src="'+url+'" allowfullscreen allow="autoplay;fullscreen"></iframe>';
}
}

var srcBtn=$("srcBtn");
var closeModal=$("closeModal");
var srcModal=$("srcModal");
if(srcBtn)srcBtn.onclick=function(){toggleModal("srcModal")};
if(closeModal)closeModal.onclick=function(){toggleModal("srcModal")};
if(srcModal)srcModal.onclick=function(e){if(e.target===srcModal)toggleModal("srcModal");};

var bugBtn=$("bugBtn");
var rptModal=$("rptModal");
var rptClose=$("rptClose");
var rptSubmit=$("rptSubmit");
var rptMsg=$("rptMsg");
var rptForm=$("rptForm");
var rptSuccess=$("rptSuccess");
if(bugBtn)bugBtn.onclick=function(){toggleModal("rptModal")};
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
    body:JSON.stringify({wwId:"${wwId}",mediaType:"live",title:"${channelName.replace(/"/g, '\\"')}",sourceName:currentSource.name||"",sourceUrl:currentSource.url||"",message:msg,embedType:"live"})
  }).then(function(r){return r.json()}).then(function(){
    rptForm.classList.add("hi");
    rptSuccess.classList.remove("hi");
    setTimeout(function(){toggleModal("rptModal");rptForm.classList.remove("hi");rptSuccess.classList.add("hi");rptMsg.value="";rptSubmit.disabled=false;rptSubmit.textContent="Envoyer le signalement"},2000);
  }).catch(function(){alert("Erreur lors de l'envoi");rptSubmit.disabled=false;rptSubmit.textContent="Envoyer le signalement";});
};
<\/script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("[v0] Live route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
