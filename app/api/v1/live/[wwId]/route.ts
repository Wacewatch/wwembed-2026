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

    const sourcesJson = JSON.stringify(allSources).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")
    const channelName = channel.channel_name || "Live TV"
    const channelLogo = channel.channel_logo || ""

    const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${channelName} - WWEmbed Live</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"><\/script>
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
.src-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:linear-gradient(135deg,#ef4444,#f97316);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.src-btn:hover{opacity:.9}
.rpt{padding:7px;background:#6366f1;border:none;border-radius:8px;color:#fff;cursor:pointer}
.player{flex:1;background:#000;position:relative}
.player iframe,.player video{width:100%;height:100%;border:none;position:absolute;inset:0;background:#000}
.no-src{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:8px}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:100;padding:16px}
.modal.show{display:flex}
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
.card-icon{width:42px;height:42px;border-radius:8px;background:linear-gradient(135deg,#ef4444,#f97316);display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:#fff}
.card-name{font-size:13px;font-weight:600;margin-bottom:6px}
.card-tags{display:flex;gap:4px}
.tag{padding:3px 6px;border-radius:4px;font-size:9px;font-weight:600}
.tag-vf{background:#3b82f6}.tag-vost{background:#f97316}.tag-multi{background:#a855f7}.tag-vo{background:#6b7280}
.ad-ov{position:fixed;inset:0;background:linear-gradient(135deg,#ef4444,#f97316,#eab308);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
.ad-ov.hide{display:none}
.ad-box{background:#fff;border-radius:14px;padding:24px;max-width:380px;width:100%;text-align:center;color:#1a1a2e}
.ad-box h2{font-size:18px;margin-bottom:6px}
.ad-box .sub{color:#666;font-size:12px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb}
.step.act{background:#ef4444;transform:scale(1.2)}
.step.done{background:#10b981}
.info{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.info b{display:block;font-size:13px;margin-bottom:2px}
.info span{font-size:11px;opacity:.8}
.info-warn{background:#fef3c7;border:1px solid #f59e0b;color:#92400e}
.info-heart{background:#fce7f3;border:1px solid #ec4899;color:#9d174d}
.info-time{background:#fef3c7;border:1px solid #f97316;color:#9a3412}
.info-ok{background:#d1fae5;border:1px solid #10b981;color:#065f46}
.pbar{height:5px;background:#e5e7eb;border-radius:3px;margin:14px 0;overflow:hidden}
.pbar-fill{height:100%;width:0;background:linear-gradient(90deg,#ef4444,#eab308);transition:width .3s}
.btn{width:100%;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer}
.btn-primary{background:linear-gradient(135deg,#ef4444,#f97316);color:#fff}
.btn-success{background:#10b981;color:#fff}
.hide{display:none!important}
.pub{background:#dc2626;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px}
</style></head><body>
${
  hasAds
    ? `<div class="ad-ov" id="adOv"><div class="ad-box">
<h2>Votre chaîne est prête</h2><p class="sub">Une dernière étape pour accéder au direct</p>
<div class="steps"><div class="step act" id="s1"></div><div class="step" id="s2"></div><div class="step" id="s3"></div></div>
<div class="info info-warn"><div><b>⚠️ Popup requis</b><span>Autorisez les popups pour continuer</span></div></div>
<div class="info info-heart" id="boxHelp"><div><b>❤️ Soutenez le service</b><span>Votre clic nous aide à rester en ligne</span></div></div>
<div class="info info-time" id="boxTime"><div><b>⏱️ Temps restant: <span id="timer">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div></div>
<div class="info info-ok hide" id="boxThanks"><div><b>✓ Merci !</b><span>Vous aidez à maintenir le service</span></div></div>
<div class="info info-ok hide" id="boxDone"><div><b>▶ Prêt !</b><span>Cliquez pour lancer le direct</span></div></div>
<div class="pbar"><div class="pbar-fill" id="progress"></div></div>
<button class="btn btn-primary" id="btnContinue">Continuer<span class="pub">PUB</span></button>
<button class="btn btn-success hide" id="btnPlay">Lancer le direct</button>
</div></div>`
    : ""
}
<div class="wrap">
<div class="hdr">
<div class="logo">📺 WWEMBED</div>
<div class="ttl">${channelLogo ? `<img src="${channelLogo}" alt="">` : ""}<span>${channelName}</span><span class="live">LIVE</span></div>
<button class="src-btn" id="srcBtn">☰ <span id="srcLabel">Sources</span></button>
<button class="rpt" title="Signaler">⚠</button>
</div>
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>
<div class="modal" id="srcModal"><div class="modal-box">
<div class="modal-hdr"><div><div class="modal-ttl">Choisissez votre source</div><div class="modal-sub">Sélectionnez un serveur</div></div>
<button class="modal-close" id="closeModal">✕</button></div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div></div>
<script>
(function(){
var sources=JSON.parse("${sourcesJson}");
var adUrl="${adUrl}";
var hasAds=${hasAds};
var idx=0,started=false,hls=null;
function $(id){return document.getElementById(id)}
function tagClass(l){l=(l||"").toUpperCase();if(l.indexOf("VF")>=0)return"tag-vf";if(l.indexOf("VOST")>=0)return"tag-vost";if(l.indexOf("MULTI")>=0)return"tag-multi";return"tag-vo"}
function buildGrid(){var g=$("srcGrid");if(!g)return;if(!sources.length){g.innerHTML="<div style='grid-column:1/-1;text-align:center;padding:30px;color:#666'>Aucune source</div>";return}
g.innerHTML="";sources.forEach(function(s,i){var d=document.createElement("div");d.className="card"+(i===idx?" act":"");d.innerHTML="<div class='card-badge'>"+(s.quality||"HD")+"</div><div class='card-icon'>📺</div><div class='card-name'>"+s.name+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
d.onclick=function(){idx=i;document.querySelectorAll(".card").forEach(function(c,j){c.classList.toggle("act",j===i)});$("srcLabel").textContent=s.name;toggleModal();loadPlayer()};g.appendChild(d)})}
function toggleModal(){var m=$("srcModal");if(m)m.classList.toggle("show")}
function loadPlayer(){var p=$("player");if(!p||!sources.length)return;var s=sources[idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return}
var url=s.url;p.innerHTML="";
if(url.indexOf(".m3u8")>=0){var v=document.createElement("video");v.controls=true;v.autoplay=true;v.style.cssText="width:100%;height:100%;position:absolute;inset:0;background:#000";p.appendChild(v);
if(typeof Hls!=="undefined"&&Hls.isSupported()){if(hls)hls.destroy();hls=new Hls();hls.loadSource(url);hls.attachMedia(v);hls.on(Hls.Events.MANIFEST_PARSED,function(){v.play().catch(function(){})})
}else if(v.canPlayType("application/vnd.apple.mpegurl")){v.src=url;v.addEventListener("loadedmetadata",function(){v.play().catch(function(){})})}
}else{var f=document.createElement("iframe");f.src=url;f.allowFullscreen=true;f.allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture";p.appendChild(f)}}
function start(){if(started)return;started=true;var ov=$("adOv");if(ov)ov.classList.add("hide");buildGrid();if(sources.length){$("srcLabel").textContent=sources[0].name;loadPlayer()}}
$("srcBtn")&&($("srcBtn").onclick=toggleModal);
$("closeModal")&&($("closeModal").onclick=toggleModal);
$("srcModal")&&($("srcModal").onclick=function(e){if(e.target===$("srcModal"))toggleModal()});
if(hasAds&&adUrl){
var tm=3,clicked=false;
$("btnContinue")&&($("btnContinue").onclick=function(){window.open(adUrl,"_blank");clicked=true;$("s1").className="step done";$("s2").className="step act";$("boxHelp").classList.add("hide");$("boxThanks").classList.remove("hide");
var iv=setInterval(function(){tm--;$("timer").textContent=tm;$("progress").style.width=((3-tm)/3*100)+"%";if(tm<=0){clearInterval(iv);$("s2").className="step done";$("s3").className="step act";$("boxTime").classList.add("hide");$("boxDone").classList.remove("hide");$("btnContinue").classList.add("hide");$("btnPlay").classList.remove("hide")}},1000)});
$("btnPlay")&&($("btnPlay").onclick=start);
}else{start()}
})();
<\/script></body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("Live TV error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
