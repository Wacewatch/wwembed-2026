import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildAdModal2Step } from "@/lib/embed-ad-modal"
import { getClientIpHash } from "@/lib/client-meta"

export async function GET(request: NextRequest, props: { params: Promise<{ wwId: string }> }) {
  try {
    const params = await props.params
    const { wwId } = params
    const match = wwId.match(/^ww-live-(.+)$/i)
    if (!match) return new NextResponse("Invalid WW ID format", { status: 400 })

    const channelIdPart = match[1]
    const supabase = createAdminClient()

    // Lookup by id (shim auto-handles 24-hex Mongo ObjectId or legacy UUID)
    let channel: any = null
    const { data: byId } = await supabase
      .from("live_tv_channels")
      .select("*")
      .eq("id", channelIdPart)
      .eq("is_active", true)
      .eq("status", "approved")
      .maybeSingle()
    channel = byId

    // Fallback: prefix match (for shortened URL ids)
    if (!channel) {
      const { data } = await supabase
        .from("live_tv_channels")
        .select("*")
        .ilike("id", channelIdPart + "%")
        .eq("is_active", true)
        .eq("status", "approved")
        .maybeSingle()
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

    const AD_URL_1 = "https://otieu.com/4/9248013"
    const AD_URL_2 = "https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5"
    const hasAds = true

    const referer = request.headers.get("referer") || null
    await supabase.from("embed_views").insert({
      ww_id: wwId,
      media_type: "live",
      embed_type: "live",
      tmdb_id: null,
      referrer: referer,
      user_agent: request.headers.get("user-agent"),
      ip_hash: getClientIpHash(request),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/</g, "\\u003c")
    const channelName = channel.channel_name || "Live TV"
    const channelLogo = channel.channel_logo || ""

    const adModal = buildAdModal2Step({
      variant: "livetv",
      ad1: AD_URL_1,
      ad2: AD_URL_2,
      title: "Accédez au flux en direct",
      subtitle: "Deux étapes pour débloquer le contenu",
      doneText: "Lancement automatique...",
      finalBtnLabel: "DÉMARRER LA LECTURE",
      showFinalBtn: false,
      autoShow: true,
      defaultOnComplete: "function(){if(typeof startPlayer==='function')startPlayer();}",
    })

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
.top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#151520;border-bottom:1px solid #222}
.top-left{display:flex;align-items:center;gap:12px}
.logo{color:#e63946;font-weight:700;font-size:14px}
.ch-info{display:flex;align-items:center;gap:8px}
.ch-icon{width:32px;height:32px;border-radius:6px;object-fit:cover;background:#222}
.ch-name{font-size:14px;font-weight:600}
.live-badge{background:#e63946;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700}
.top-right{display:flex;gap:8px}
.btn{background:#222;border:1px solid #333;color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600}
.btn:hover{background:#333}
.container{height:calc(100vh - 60px);position:relative}
.player{width:100%;height:100%}
.player video,.player iframe{width:100%;height:100%;display:block;background:#000}
.player iframe{border:none}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#555}
.dropdown{position:relative}
.dropdown-menu{position:absolute;top:calc(100% + 8px);right:0;background:#1a1a28;border:1px solid #333;border-radius:10px;padding:8px;min-width:200px;display:none;z-index:200;max-height:60vh;overflow-y:auto}
.dropdown-menu.show{display:block}
.src-item{padding:10px 12px;border-radius:6px;cursor:pointer;margin-bottom:4px;border:1px solid transparent}
.src-item:hover{background:#222}
.src-item.active{background:#1a3a2a;border-color:#22c55e}
.src-name{font-size:13px;font-weight:600}
.src-tags{display:flex;gap:4px;margin-top:4px}
.tag{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}
.tag-q{background:#7c3aed;color:#fff}
.tag-l{background:#0891b2;color:#fff}
${adModal.css}
</style>
</head>
<body>
<div class="top">
<div class="top-left">
<div class="logo">▶ WWEMBED</div>
<div class="ch-info">
<img class="ch-icon" src="${channelLogo}" alt="">
<span class="ch-name">${channelName}</span>
<span class="live-badge">● LIVE</span>
</div>
</div>
<div class="top-right">
<div class="dropdown">
<button class="btn" id="srcBtn">📡 <span id="srcLabel">Source #1</span></button>
<div class="dropdown-menu" id="srcMenu"></div>
</div>
</div>
</div>
<div class="container">
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>

${adModal.html}

<script>
var _src=${sourcesJson};
var _idx=0;
var _started=false;
var _hls=null;

function $(id){return document.getElementById(id);}

function startPlayer(){
if(_started)return;
_started=true;
buildSrcList();
if(_src.length){$("srcLabel").textContent=_src[0].name;loadPlayer();}
}

function buildSrcList(){
var m=$("srcMenu");
if(!m||!_src.length)return;
m.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(idx){
var s=_src[idx];
var d=document.createElement("div");
d.className="src-item"+(idx===_idx?" active":"");
d.innerHTML='<div class="src-name">'+s.name+'</div><div class="src-tags"><span class="tag tag-q">'+(s.quality||"HD")+'</span><span class="tag tag-l">'+(s.language||"VO")+'</span></div>';
d.onclick=function(){_idx=idx;buildSrcList();$("srcLabel").textContent=s.name;$("srcMenu").classList.remove("show");if(_started)loadPlayer();};
m.appendChild(d);
})(i);
}
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

$("srcBtn").onclick=function(){$("srcMenu").classList.toggle("show");};
document.addEventListener("click",function(e){if(!e.target.closest(".dropdown"))$("srcMenu").classList.remove("show");});

${adModal.js}
<\/script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("[v0] Live route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
