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
.top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#151520;border-bottom:1px solid #222}
.top-left{display:flex;align-items:center;gap:12px}
.logo{color:#e63946;font-weight:700;font-size:14px}
.ch-info{display:flex;align-items:center;gap:8px}
.ch-icon{width:32px;height:32px;border-radius:6px;object-fit:cover;background:#222}
.ch-name{font-size:14px;font-weight:600}
.live-badge{background:#e63946;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700}
.top-right{display:flex;gap:8px}
.btn{background:#222;border:1px solid #333;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}
.btn:hover{background:#333}
.bug-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#333;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:16px}
.bug-btn:hover{background:#444}
.container{height:calc(100vh - 60px);position:relative}
.player{width:100%;height:100%}
.player video,.player iframe{width:100%;height:100%;display:block;background:#000}
.player iframe{border:none}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#555}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:100;padding:16px}
.modal.sh{display:flex}
.modal-box{background:#1a1a28;border-radius:14px;width:100%;max-width:600px;max-height:80vh;display:flex;flex-direction:column;border:1px solid #333}
.modal-hdr{padding:14px 18px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center}
.modal-ttl{font-size:16px;font-weight:700;color:#e63946}
.modal-close{width:28px;height:28px;border-radius:50%;background:#333;border:none;color:#fff;cursor:pointer;font-size:16px}
.modal-body{padding:14px 18px;overflow-y:auto}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.card{background:#1e1e2c;border:1px solid #333;border-radius:10px;padding:12px;cursor:pointer}
.card:hover{border-color:#e63946}
.card.act{border-color:#e63946;background:#3a1a1a}
.card-name{font-size:12px;font-weight:600;margin-bottom:6px}
.card-tags{display:flex;gap:4px}
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
<div class="top-left">
<div class="logo">▶ WWEMBED</div>
<div class="ch-info">
<img class="ch-icon" src="${channelLogo}" alt="">
<span class="ch-name">${channelName}</span>
<span class="live-badge">● LIVE</span>
</div>
</div>
<div class="top-right">
<button class="bug-btn" id="bugBtn" title="Signaler un problème">🐛</button>
<button class="btn" id="srcBtn">☰ <span id="srcLabel">Source #1</span></button>
</div>
</div>
<div class="container">
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>

<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr">
<div class="modal-ttl">Choisir une source</div>
<button class="modal-close" id="closeModal">×</button>
</div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div>
</div>

<script>
var _src=${sourcesJson};
var _idx=0;
var _started=false;
var _hls=null;

function $(id){return document.getElementById(id);}

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
buildSrcList();
if(_src.length){$("srcLabel").textContent=_src[0].name;loadPlayer();}
}

function buildSrcList(){
var g=$("srcGrid");
if(!g||!_src.length){g.innerHTML="<div style='text-align:center;padding:20px;color:#555'>Aucune source</div>";return;}
g.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(idx){
var s=_src[idx];
var d=document.createElement("div");
d.className="card"+(idx===_idx?" act":"");
d.innerHTML='<div class="card-name">'+s.name+'</div><div class="card-tags"><span class="tag tag-q">'+(s.quality||"HD")+'</span><span class="tag tag-l">'+(s.language||"VO")+'</span></div>';
d.onclick=function(){_idx=idx;buildSrcList();$("srcLabel").textContent=s.name;$("srcModal").classList.remove("sh");if(_started)loadPlayer();};
g.appendChild(d);
})(i);
}
}

$("srcBtn").onclick=function(){$("srcModal").classList.add("sh");buildSrcList();};
$("closeModal").onclick=function(){$("srcModal").classList.remove("sh");};
$("srcModal").onclick=function(e){if(e.target===$("srcModal"))$("srcModal").classList.remove("sh");};
$("bugBtn").onclick=function(){alert("Fonctionnalité de rapport de bug à venir");};
$("btnAd").addEventListener("click",function(){setTimeout(function(){$("step1").classList.remove("active");$("step1").classList.add("done");$("step2").classList.add("active");$("step2").classList.add("done");$("btnAd").classList.add("hi");$("btnStart").classList.remove("hi");},150);});
$("btnStart").onclick=startPlayer;
<\/script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("[v0] Live route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
