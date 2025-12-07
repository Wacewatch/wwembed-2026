import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getEpisodeDetails } from "@/lib/tmdb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  try {
    const { wwId } = await params
    if (!wwId) return NextResponse.json({ error: "Missing WW ID" }, { status: 400 })

    const parsed = parseWWId(wwId)
    if (!parsed) return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })

    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed
    const supabase = createAdminClient()

    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""

    const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)
    let episodeData = null
    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      episodeData = await getEpisodeDetails(tmdbId, seasonNumber, episodeNumber)
    }

    let title = tmdbData ? ("title" in tmdbData ? tmdbData.title : tmdbData.name) : "Unknown Media"
    if (episodeData) title = title + " - S" + seasonNumber + "E" + episodeNumber

    let streamingQuery = supabase
      .from("streaming_links")
      .select("*")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("is_active", true)
      .eq("status", "approved")

    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      streamingQuery = streamingQuery.eq("season_number", seasonNumber).eq("episode_number", episodeNumber)
    }

    const { data: userLinks } = await streamingQuery

    const { data: apis } = await supabase
      .from("third_party_apis")
      .select("*, language, is_anonymous")
      .eq("api_type", "streaming")
      .eq("is_active", true)
      .order("priority", { ascending: true })

    let anonymousCounter = 0
    const autoLinks = (apis || [])
      .filter((api) => (mediaType === "movie" ? !!(api.url_pattern_movie || api.url_pattern) : !!api.url_pattern_tv))
      .map((api) => {
        const pattern =
          mediaType === "movie"
            ? api.url_pattern_movie || api.url_pattern || ""
            : api.url_pattern_tv || api.url_pattern || ""
        let url = pattern.replace(/{tmdb_id}/g, String(tmdbId)).replace(/{media_type}/g, mediaType)
        if (mediaType === "movie") {
          url = url
            .replace(/{season}/g, "")
            .replace(/{episode}/g, "")
            .replace(/{season_number}/g, "")
            .replace(/{episode_number}/g, "")
        } else {
          url = url
            .replace(/{season}/g, String(seasonNumber || 1))
            .replace(/{episode}/g, String(episodeNumber || 1))
            .replace(/{season_number}/g, String(seasonNumber || 1))
            .replace(/{episode_number}/g, String(episodeNumber || 1))
        }
        url = url.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/g, "")
        if (api.is_anonymous) anonymousCounter++
        return {
          name: api.is_anonymous ? `Source #${anonymousCounter}` : api.name,
          url,
          quality: "HD",
          language: api.language || "VO",
        }
      })
      .filter((link) => link.url && link.url.length > 0)

    const allSources = [
      ...autoLinks,
      ...(userLinks || []).map((l, i) => ({
        name: l.source_name || "Source #" + (autoLinks.length + i + 1),
        url: l.source_url,
        quality: l.quality || "HD",
        language: l.language || "VO",
      })),
    ]

    await supabase.from("embed_views").insert({
      ww_id: wwId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      season_number: seasonNumber ?? null,
      episode_number: episodeNumber ?? null,
      embed_type: "streaming",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/'/g, "\\'").replace(/</g, "\\u003c")

    const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:system-ui,sans-serif;background:#0a0a0f;color:#fff}
.wrap{display:flex;flex-direction:column;height:100%}
.hdr{display:flex;align-items:center;padding:10px 14px;background:#151520;border-bottom:1px solid #222;gap:12px}
.logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#a855f7}
.ttl{flex:1;font-size:13px;font-weight:600;color:#ccc;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.src-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.src-btn:hover{opacity:.9}
.rpt{padding:7px;background:#ef4444;border:none;border-radius:8px;color:#fff;cursor:pointer}
.player{flex:1;background:#000;position:relative}
.player iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.no-src{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:8px}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:100;padding:16px}
.modal.show{display:flex}
.modal-box{background:#1a1a28;border-radius:14px;width:100%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;border:1px solid #333}
.modal-hdr{padding:16px 20px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center}
.modal-ttl{font-size:18px;font-weight:700;color:#a855f7}
.modal-sub{font-size:12px;color:#888;margin-top:2px}
.modal-close{width:32px;height:32px;border-radius:50%;background:#333;border:none;color:#fff;cursor:pointer;font-size:18px}
.modal-body{padding:16px 20px;overflow-y:auto}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:380px){.grid{grid-template-columns:1fr}}
.card{background:#1e1e2c;border:1px solid #333;border-radius:10px;padding:14px;cursor:pointer;position:relative}
.card:hover{border-color:#8b5cf6}
.card.act{border-color:#8b5cf6;background:#2a1f4a}
.card-badge{position:absolute;top:10px;right:10px;padding:3px 7px;background:#22c55e;border-radius:5px;font-size:9px;font-weight:700}
.card-icon{width:42px;height:42px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:#fff;font-size:20px}
.card-name{font-size:13px;font-weight:600;margin-bottom:6px}
.card-tags{display:flex;gap:4px}
.tag{padding:3px 6px;border-radius:4px;font-size:9px;font-weight:600}
.tag-vf{background:#3b82f6;color:#fff}.tag-vost{background:#f97316;color:#fff}.tag-multi{background:#a855f7;color:#fff}.tag-vo{background:#6b7280;color:#fff}
.ad-ov{position:fixed;inset:0;background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);display:none;align-items:center;justify-content:center;z-index:200;padding:16px}
.ad-ov.show{display:flex}
.ad-box{background:#fff;border-radius:14px;padding:24px;max-width:380px;width:100%;text-align:center;color:#1a1a2e}
.ad-box h2{font-size:18px;margin-bottom:6px}
.ad-box .sub{color:#666;font-size:12px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb}
.step.act{background:#6366f1;transform:scale(1.2)}
.step.done{background:#10b981}
.info{border-radius:10px;padding:12px;margin:8px 0;text-align:left}
.info b{display:block;font-size:13px;margin-bottom:2px}
.info span{font-size:11px;opacity:.8}
.info-warn{background:#fef3c7;border:1px solid #f59e0b;color:#92400e}
.info-heart{background:#fce7f3;border:1px solid #ec4899;color:#9d174d}
.info-time{background:#ede9fe;border:1px solid #8b5cf6;color:#5b21b6}
.info-ok{background:#d1fae5;border:1px solid #10b981;color:#065f46}
.pbar{height:5px;background:#e5e7eb;border-radius:3px;margin:14px 0;overflow:hidden}
.pbar-fill{height:100%;width:0;background:linear-gradient(90deg,#6366f1,#ec4899);transition:width .3s}
.btn{width:100%;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer}
.btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
.btn-success{background:#10b981;color:#fff}
.hide{display:none!important}
.pub{background:#ef4444;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px}
</style></head><body>
<div class="ad-ov" id="adOv"><div class="ad-box">
<h2>Votre vidéo est prête</h2><p class="sub">Une dernière étape pour accéder au contenu</p>
<div class="steps"><div class="step act" id="s1"></div><div class="step" id="s2"></div><div class="step" id="s3"></div></div>
<div class="info info-warn"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
<div class="info info-heart" id="boxHelp"><b>Soutenez le service</b><span>Votre clic nous aide à rester en ligne</span></div>
<div class="info info-time" id="boxTime"><b>Temps restant: <span id="timer">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div>
<div class="info info-ok hide" id="boxThanks"><b>Merci !</b><span>Vous aidez à maintenir le service</span></div>
<div class="info info-ok hide" id="boxDone"><b>Prêt !</b><span>Cliquez pour lancer la lecture</span></div>
<div class="pbar"><div class="pbar-fill" id="progress"></div></div>
<button class="btn btn-primary" id="btnContinue">Continuer<span class="pub">PUB</span></button>
<button class="btn btn-success hide" id="btnPlay">Lancer la vidéo</button>
</div></div>
<div class="wrap">
<div class="hdr">
<div class="logo">▶ WWEMBED</div>
<div class="ttl">${title}</div>
<button class="src-btn" id="srcBtn">☰ <span id="srcLabel">Sources</span></button>
<button class="rpt" title="Signaler">⚠</button>
</div>
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>
<div class="modal" id="srcModal"><div class="modal-box">
<div class="modal-hdr"><div><div class="modal-ttl">Choisissez votre source</div><div class="modal-sub">Sélectionnez un serveur</div></div>
<button class="modal-close" id="closeModal">×</button></div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div></div>
<script>
(function(){
var sources=${sourcesJson};
var adUrl="${adUrl}";
var hasAds=${hasAds};
var idx=0,started=false;
function $(id){return document.getElementById(id)}
function tagClass(l){l=(l||"").toUpperCase();if(l.indexOf("VF")>=0)return"tag-vf";if(l.indexOf("VOST")>=0)return"tag-vost";if(l.indexOf("MULTI")>=0)return"tag-multi";return"tag-vo"}
function buildGrid(){var g=$("srcGrid");if(!g)return;if(!sources.length){g.innerHTML="<div style='grid-column:1/-1;text-align:center;padding:30px;color:#666'>Aucune source</div>";return}
g.innerHTML="";sources.forEach(function(s,i){var d=document.createElement("div");d.className="card"+(i===idx?" act":"");d.innerHTML="<div class='card-badge'>"+(s.quality||"HD")+"</div><div class='card-icon'>▶</div><div class='card-name'>"+s.name+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
d.onclick=function(){idx=i;document.querySelectorAll(".card").forEach(function(c,j){c.classList.toggle("act",j===i)});$("srcLabel").textContent=s.name;toggleModal();loadPlayer()};g.appendChild(d)})}
function toggleModal(){var m=$("srcModal");if(m)m.classList.toggle("show")}
function loadPlayer(){var p=$("player");if(!p||!sources.length)return;var s=sources[idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return}
var f=document.createElement("iframe");f.src=s.url;f.allowFullscreen=true;f.allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture";p.innerHTML="";p.appendChild(f)}
function start(){if(started)return;started=true;var ov=$("adOv");if(ov)ov.classList.remove("show");buildGrid();if(sources.length){$("srcLabel").textContent=sources[0].name;loadPlayer()}}
$("srcBtn").onclick=toggleModal;
$("closeModal").onclick=toggleModal;
$("srcModal").onclick=function(e){if(e.target===$("srcModal"))toggleModal()};
if(hasAds&&adUrl){
$("adOv").classList.add("show");
var tm=3;
$("btnContinue").onclick=function(){window.open(adUrl,"_blank");$("s1").className="step done";$("s2").className="step act";$("boxHelp").classList.add("hide");$("boxThanks").classList.remove("hide");
var iv=setInterval(function(){tm--;$("timer").textContent=tm;$("progress").style.width=((3-tm)/3*100)+"%";if(tm<=0){clearInterval(iv);$("s2").className="step done";$("s3").className="step act";$("boxTime").classList.add("hide");$("boxDone").classList.remove("hide");$("btnContinue").classList.add("hide");$("btnPlay").classList.remove("hide")}},1000)};
$("btnPlay").onclick=start;
}else{start()}
})();
</script></body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("Streaming error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
