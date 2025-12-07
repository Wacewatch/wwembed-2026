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
    const channelName = (channel.channel_name || "Live TV").replace(/"/g, '\\"').replace(/'/g, "\\'")
    const channelLogo = channel.channel_logo || ""

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${channel.channel_name || "Live TV"} - WWEmbed Live</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0f172a;color:#fff;min-height:100vh;overflow:hidden}
.wrap{display:flex;flex-direction:column;height:100vh}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(0,0,0,0.5);z-index:10}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;color:#ef4444}
.ttl{font-size:14px;color:#fff;display:flex;align-items:center;gap:8px}
.ttl img{width:24px;height:24px;border-radius:4px}
.live{background:#ef4444;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700}
.acts{display:flex;gap:8px}
.btn-src{background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
.btn-rpt{background:#6366f1;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer}
.player{flex:1;position:relative;background:#000}
.player iframe,.player video{width:100%;height:100%;border:none;position:absolute;inset:0}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#888}
.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;z-index:100}
.modal.show{display:flex}
.modal-box{background:#1e293b;border-radius:16px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto}
.modal-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.modal-ttl{font-size:18px;font-weight:700}
.modal-cls{background:none;border:none;color:#fff;font-size:28px;cursor:pointer;line-height:1}
.src-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:500px){.src-grid{grid-template-columns:repeat(2,1fr)}}
.src-card{background:rgba(255,255,255,0.05);border:2px solid transparent;border-radius:10px;padding:14px;cursor:pointer;text-align:center}
.src-card:hover{border-color:rgba(239,68,68,0.5)}
.src-card.active{border-color:#ef4444;background:rgba(239,68,68,0.1)}
.src-icon{font-size:24px;margin-bottom:8px}
.src-name{font-weight:600;font-size:13px;margin-bottom:6px}
.src-tags{display:flex;gap:4px;justify-content:center}
.tag{font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600}
.tag-hd{background:#22c55e;color:#000}
.tag-lang{background:#3b82f6;color:#fff}
.rpt-area textarea{width:100%;min-height:100px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:12px;color:#fff;font-size:14px;resize:vertical;margin:12px 0}
.rpt-area button{background:#6366f1;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer;width:100%}
.rpt-ok{color:#10b981;text-align:center;padding:20px;display:none}
.ad-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#ef4444,#f97316,#eab308);display:none;align-items:center;justify-content:center;z-index:200}
.ad-overlay.show{display:flex}
.ad-box{background:#fff;border-radius:20px;padding:32px;max-width:400px;width:90%;text-align:center;color:#1a1a2e}
.ad-title{font-size:20px;font-weight:700;margin-bottom:8px}
.ad-desc{color:#666;margin-bottom:24px}
.ad-steps{display:flex;flex-direction:column;gap:12px;margin-bottom:24px;text-align:left}
.ad-step{display:flex;align-items:center;gap:12px;padding:12px;background:#f1f5f9;border-radius:10px}
.ad-num{width:28px;height:28px;background:#e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0}
.ad-step.on .ad-num{background:#ef4444;color:#fff}
.ad-step.ok .ad-num{background:#10b981;color:#fff}
.ad-txt{font-size:14px;color:#334155}
.ad-btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer}
.ad-btn-go{background:linear-gradient(135deg,#ef4444,#f97316);color:#fff}
.ad-btn-play{background:linear-gradient(135deg,#10b981,#059669);color:#fff;display:none}
.ad-wait{margin-top:16px;padding:12px;background:#f1f5f9;border-radius:10px;display:none}
.ad-wait-txt{font-size:14px;color:#666;margin-bottom:8px}
.ad-bar{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden}
.ad-fill{height:100%;background:#ef4444;width:0%;transition:width 1s linear}
</style>
</head>
<body>
<div class="wrap">
<div class="hdr">
<div class="logo">📺 WWEMBED</div>
<div class="ttl">${channelLogo ? `<img src="${channelLogo}" alt="">` : ""}${channel.channel_name || "Live TV"}<span class="live">LIVE</span></div>
<div class="acts">
<button class="btn-src" id="btnSrc">Source #1</button>
<button class="btn-rpt" id="btnRpt">⚠</button>
</div>
</div>
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>

<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr"><div class="modal-ttl">📺 Choisir une source</div><button class="modal-cls" id="srcClose">×</button></div>
<div class="src-grid" id="srcGrid"></div>
</div>
</div>

<div class="modal" id="rptModal">
<div class="modal-box">
<div class="modal-hdr"><div class="modal-ttl" style="color:#6366f1">⚠ Signaler un problème</div><button class="modal-cls" id="rptClose">×</button></div>
<div class="rpt-area" id="rptArea">
<p style="color:#94a3b8;font-size:13px">Décrivez le problème rencontré</p>
<textarea id="rptMsg" placeholder="Le flux ne charge pas, lag..."></textarea>
<button id="rptSend">Envoyer</button>
</div>
<div class="rpt-ok" id="rptOk">✓ Merci pour votre signalement !</div>
</div>
</div>

<div class="ad-overlay" id="adOverlay">
<div class="ad-box">
<div class="ad-title">Accéder au direct</div>
<div class="ad-desc">Suivez ces étapes pour débloquer</div>
<div class="ad-steps">
<div class="ad-step on" id="st1"><div class="ad-num">1</div><div class="ad-txt">Cliquez sur le bouton</div></div>
<div class="ad-step" id="st2"><div class="ad-num">2</div><div class="ad-txt">Attendez 3 secondes</div></div>
<div class="ad-step" id="st3"><div class="ad-num">3</div><div class="ad-txt">Regardez le direct</div></div>
</div>
<button class="ad-btn ad-btn-go" id="adGo">Débloquer le direct</button>
<button class="ad-btn ad-btn-play" id="adPlay">Lancer le direct</button>
<div class="ad-wait" id="adWait"><div class="ad-wait-txt">Patientez <span id="adCount">3</span>s</div><div class="ad-bar"><div class="ad-fill" id="adFill"></div></div></div>
</div>
</div>

<script>
(function(){
var S=${sourcesJson};
var idx=0;
var hasAd=${hasAds && adUrl ? "true" : "false"};
var adUrl="${adUrl}";
var wwId="${wwId}";
var title="${channelName}";
var hls=null;

function $(i){return document.getElementById(i)}

function play(){
if(!S.length){$("player").innerHTML="<div class='no-src'>Aucune source</div>";return}
load(0);
grid();
}

function load(i){
idx=i;
var s=S[i];if(!s||!s.url)return;
var p=$("player");
p.innerHTML="";
$("btnSrc").textContent=s.name;
if(s.url.indexOf(".m3u8")>=0){
var v=document.createElement("video");
v.controls=true;v.autoplay=true;
v.style.cssText="width:100%;height:100%;position:absolute;inset:0;background:#000";
p.appendChild(v);
if(typeof Hls!=="undefined"&&Hls.isSupported()){
if(hls)hls.destroy();
hls=new Hls();
hls.loadSource(s.url);
hls.attachMedia(v);
hls.on(Hls.Events.MANIFEST_PARSED,function(){v.play().catch(function(){})});
}else if(v.canPlayType("application/vnd.apple.mpegurl")){
v.src=s.url;
v.addEventListener("loadedmetadata",function(){v.play().catch(function(){})});
}
}else{
var f=document.createElement("iframe");
f.src=s.url;f.allowFullscreen=true;
f.allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture";
p.appendChild(f);
}
var items=document.querySelectorAll(".src-card");
items.forEach(function(el,j){el.classList.toggle("active",j===i)});
}

function grid(){
var g=$("srcGrid");g.innerHTML="";
S.forEach(function(s,i){
var d=document.createElement("div");
d.className="src-card"+(i===idx?" active":"");
d.innerHTML='<div class="src-icon">📺</div><div class="src-name">'+s.name+'</div><div class="src-tags"><span class="tag tag-hd">'+s.quality+'</span><span class="tag tag-lang">'+s.language+'</span></div>';
d.onclick=function(){load(i);$("srcModal").classList.remove("show")};
g.appendChild(d);
});
}

$("btnSrc").onclick=function(){$("srcModal").classList.add("show")};
$("srcClose").onclick=function(){$("srcModal").classList.remove("show")};
$("srcModal").onclick=function(e){if(e.target===$("srcModal"))$("srcModal").classList.remove("show")};

$("btnRpt").onclick=function(){$("rptModal").classList.add("show")};
$("rptClose").onclick=function(){$("rptModal").classList.remove("show")};
$("rptModal").onclick=function(e){if(e.target===$("rptModal"))$("rptModal").classList.remove("show")};

$("rptSend").onclick=function(){
var msg=$("rptMsg").value.trim();
if(!msg){alert("Décrivez le problème");return}
$("rptSend").disabled=true;
var cs=S[idx]||{};
fetch("/api/bug-reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({wwId:wwId,mediaType:"live",title:title,sourceName:cs.name||"",sourceUrl:cs.url||"",message:msg,embedType:"live"})})
.then(function(){$("rptArea").style.display="none";$("rptOk").style.display="block";setTimeout(function(){$("rptModal").classList.remove("show");$("rptArea").style.display="block";$("rptOk").style.display="none";$("rptMsg").value="";$("rptSend").disabled=false},2000)})
.catch(function(){alert("Erreur");$("rptSend").disabled=false});
};

if(hasAd){
$("adOverlay").classList.add("show");
$("adGo").onclick=function(){
window.open(adUrl,"_blank");
$("st1").classList.remove("on");$("st1").classList.add("ok");
$("st2").classList.add("on");
$("adGo").style.display="none";
$("adWait").style.display="block";
var t=3;
var iv=setInterval(function(){
t--;$("adCount").textContent=t;$("adFill").style.width=((3-t)/3*100)+"%";
if(t<=0){clearInterval(iv);$("st2").classList.remove("on");$("st2").classList.add("ok");$("st3").classList.add("on");$("adWait").style.display="none";$("adPlay").style.display="block"}
},1000);
};
$("adPlay").onclick=function(){$("adOverlay").classList.remove("show");play()};
}else{play()}
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
